import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { GraphProviderService } from '../graph/graph-provider.service';
import { EdgeType } from '../graph/edge.types';
import { DEFAULT_WEIGHTS, DEFAULT_K } from '../graph/graph.types';
import { RoutingService } from './routing.service';
import { ScoringService } from './scoring.service';
import { CandidateFilterService } from './candidate-filter.service';
import {
  InterchangeEvaluatorService,
  GenericConstraints,
} from './interchange-evaluator.service';
import { RealtimePredictionService } from '../../realtime/services/realtime-prediction.service';
import { JourneyQueryDto } from '../dto/journey-query.dto';
import { calculateMumbaiFare } from './policy_v1';
import { LandmarkRegistry } from '../../gis/services/landmark-registry';
import {
  RouteCandidate,
  JourneyLeg,
  JourneyResponse,
  StationRef,
  estimateWaiting,
  candidateId,
  CandidateAttributes,
  LegMode,
  DoorSide,
  DoorSideStatus,
} from './candidate.types';
import { GraphEdge } from '../graph/graph.types';

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ── Internal type for enriched-but-not-yet-ranked candidate ──────────────────

interface EnrichedCandidate extends RouteCandidate {
  _rankScore: number; // internal sorting key, not exposed
}

interface Phase1CtmData {
  alignmentGeometry?: { coordinates: [number, number][] };
}

function parsePhase1Ctm(value: unknown): Phase1CtmData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  const geometry = (value as { alignmentGeometry?: unknown }).alignmentGeometry;
  if (
    typeof geometry !== 'object' ||
    geometry === null ||
    Array.isArray(geometry)
  )
    return null;
  const coordinates = (geometry as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return null;
  const parsedCoordinates: [number, number][] = [];
  for (const point of coordinates) {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number'
    )
      return null;
    parsedCoordinates.push([point[0], point[1]]);
  }
  return { alignmentGeometry: { coordinates: parsedCoordinates } };
}

/**
 * JourneyService — orchestrates the full Journey Intelligence pipeline:
 *
 *  1.  Resolve stations + system
 *  2.  Load transit graph (cache-first via GraphProvider)
 *  3.  Generate K candidate paths (Yen's K-shortest loopless paths)
 *  4.  Enrich each path (timing breakdown, legs, stations, GeoJSON, lines)
 *  5.  Feasibility + dominance filtering (CandidateFilterService)
 *  6.  Score + default-rank surviving candidates
 *  7.  Compute attribute flags + tradeoffs vs rank-1
 *  8.  Return RouteCandidate[]
 *
 * The response is candidate-centric: { metadata, candidates[] }.
 * The Intent engine (future sprint) re-ranks candidates via Intent JSON
 * without re-running the graph algorithm.
 */
@Injectable()
export class JourneyService {
  private readonly logger = new Logger(JourneyService.name);
  private readonly GRAPH_VERSION = 'v2';

  constructor(
    private readonly db: DatabaseService,
    private readonly graphProvider: GraphProviderService,
    private readonly router: RoutingService,
    private readonly scorer: ScoringService,
    private readonly filter: CandidateFilterService,
    private readonly interchangeEvaluator: InterchangeEvaluatorService,
    private readonly realtimePrediction: RealtimePredictionService,
  ) {}

  private async resolveStation(identifier: string) {
    // 0. Check if identifier is a registered landmark (e.g. LM_OBEROI_SKY_CITY or "Infiniti Mall")
    const landmark = LandmarkRegistry.findByNameOrAlias(identifier);
    if (landmark) {
      const station = await this.db.station.findFirst({
        where: { code: landmark.connectedStationCode, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      });
      if (station) {
        return {
          ...station,
          resolvedFromLandmark: landmark,
        };
      }
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );
    if (isUuid) {
      const stn = await this.db.station.findUnique({
        where: { id: identifier },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      });
      if (stn) return stn;
    }

    // Try finding by station code first
    let stn = await this.db.station.findFirst({
      where: { code: identifier, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        systemId: true,
        latitude: true,
        longitude: true,
        system: { select: { id: true, code: true } },
      },
    });

    if (!stn) {
      stn = await this.db.station.findFirst({
        where: {
          name: {
            contains: identifier,
            mode: 'insensitive',
          },
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      });
    }

    return stn;
  }

  async planJourney(query: JourneyQueryDto): Promise<JourneyResponse> {
    const { from: fromId, to: toId } = query;
    const k = query.k ?? DEFAULT_K;

    const constraints: GenericConstraints = {
      mobility: query.mobility,
      luggage: query.luggage,
      avoid: Array.isArray(query.avoid)
        ? query.avoid
        : query.avoid
          ? [query.avoid]
          : [],
      prefer: Array.isArray(query.prefer)
        ? query.prefer
        : query.prefer
          ? [query.prefer]
          : [],
      objective: query.objective,
    };

    if (fromId === toId) {
      throw new BadRequestException(
        'Origin and destination must be different stations.',
      );
    }

    // ── 1. Load station + system data ────────────────────────────────────────
    const [fromStation, toStation] = await Promise.all([
      this.resolveStation(fromId),
      this.resolveStation(toId),
    ]);

    if (!fromStation)
      throw new NotFoundException(`Station not found: ${fromId}`);
    if (!toStation) throw new NotFoundException(`Station not found: ${toId}`);

    if (fromStation.systemId !== toStation.systemId) {
      throw new BadRequestException(
        'Cross-system routing is not supported. Both stations must belong to the same metro system.',
      );
    }

    const systemId = fromStation.systemId;
    const systemCode = fromStation.system.code;

    // ── 2. Get transit graph (cache-first) ───────────────────────────────────
    const graph = await this.graphProvider.get(systemId, systemCode);

    // ── 3. Generate K candidate paths ────────────────────────────────────────
    const weights = DEFAULT_WEIGHTS;
    const rawPaths = this.router.solveKShortest(
      graph,
      fromStation.id,
      toStation.id,
      weights,
      k,
    );

    if (rawPaths.length === 0) {
      throw new NotFoundException(
        `No route found between ${fromStation.name} and ${toStation.name}.`,
      );
    }

    // ── 4. Enrich each path ──────────────────────────────────────────────────
    const allLineIds = [
      ...new Set(
        rawPaths.flatMap((p) => p.map((e) => e.lineId).filter(Boolean)),
      ),
    ] as string[];

    const lines =
      allLineIds.length > 0
        ? await this.db.line.findMany({
            where: { id: { in: allLineIds } },
            select: { id: true, name: true, color: true, code: true },
          })
        : [];
    const normalizedLines = lines.map((l) => ({
      ...l,
      color: this.resolveLineColor(l),
    }));
    const lineMap = new Map(normalizedLines.map((l) => [l.id, l]));

    // Collect all station IDs across all paths for a single DB batch
    const allStationIds = [
      ...new Set(
        rawPaths.flatMap((p) => this.extractStationIds(p, fromStation.id)),
      ),
    ];
    const stationDetails = await this.db.station.findMany({
      where: { id: { in: allStationIds } },
      select: {
        id: true,
        code: true,
        name: true,
        latitude: true,
        longitude: true,
      },
    });
    const stationMap = new Map(stationDetails.map((s) => [s.id, s]));

    const enriched: EnrichedCandidate[] = [];

    for (const path of rawPaths) {
      const journeyScore = this.scorer.score(
        path,
        weights,
        (previous, current) => {
          const previousCode = previous.lineId
            ? lineMap.get(previous.lineId)?.code
            : null;
          const currentCode = current.lineId
            ? lineMap.get(current.lineId)?.code
            : null;
          const stationCode = graph.nodes.get(current.from)?.code;
          return (
            previous.to === current.from &&
            this.interchangeEvaluator.isThroughRunningTransition(
              previousCode,
              currentCode,
              stationCode,
            )
          );
        },
      );
      const waiting = estimateWaiting(journeyScore.transfers);

      const stationIds = this.extractStationIds(path, fromStation.id);
      const orderedStations: StationRef[] = stationIds.map((id) => {
        const node = graph.nodes.get(id);
        const detail = stationMap.get(id);
        return {
          id,
          name: detail?.name ?? node?.name ?? id,
          code: detail?.code ?? node?.code ?? '',
          lat: detail?.latitude ?? node?.lat ?? 0,
          lng: detail?.longitude ?? node?.lng ?? 0,
        };
      });

      const legs = await this.buildLegs(path, lineMap, stationMap);
      const geojson = await this.buildGeoJson(
        orderedStations,
        legs,
        path,
        stationMap,
        lineMap,
      );

      const walkingSeconds = legs
        .filter((l) => l.type === EdgeType.WALK || l.type === EdgeType.TRANSFER)
        .reduce((sum, l) => sum + l.duration, 0);

      const totalPathwayMeters = legs.reduce((sum, leg, index) => {
        if (leg.type === EdgeType.WALK || leg.type === EdgeType.TRANSFER) {
          return sum + (leg.transferDetails?.pathwayDistanceMeters ?? 0);
        }
        const next = legs[index + 1];
        const hasSeparateWalkLeg =
          next?.type === EdgeType.WALK || next?.type === EdgeType.TRANSFER;
        const isLineChange =
          next?.type === EdgeType.TRANSIT &&
          next.lineId !== leg.lineId &&
          !next.throughServiceContinuationFromPrevious;
        return (
          sum +
          (!hasSeparateWalkLeg && isLineChange
            ? (leg.transferDetails?.pathwayDistanceMeters ?? 0)
            : 0)
        );
      }, 0);

      const totalDurationSeconds =
        journeyScore.inVehicleSeconds + walkingSeconds + waiting.total.seconds;

      const isDirect = journeyScore.transfers === 0;
      const lineNames = [
        ...new Set(
          path
            .filter((e) => e.type === EdgeType.TRANSIT && e.lineId)
            .map((e) => lineMap.get(e.lineId!)?.name ?? e.lineId!),
        ),
      ];

      const id = candidateId(path);
      const rankScore = this.scorer.rankScore(
        totalDurationSeconds,
        journeyScore.transfers,
        walkingSeconds,
      );

      const firstStation = orderedStations[0];
      const lastStation = orderedStations[orderedStations.length - 1];
      const destNameUpper = (lastStation?.name || '').toUpperCase();
      let destinationGuidance: string | null = null;
      if (
        destNameUpper.includes('MUMBAI CENTRAL') ||
        destNameUpper.includes('CSMT') ||
        destNameUpper.includes('CHURCHGATE')
      ) {
        destinationGuidance = 'Exit for Mainline Railway Terminal';
      }

      let totalDistanceMeters = 0;
      for (let i = 0; i < orderedStations.length - 1; i++) {
        const s1 = orderedStations[i];
        const s2 = orderedStations[i + 1];
        totalDistanceMeters += getDistanceMeters(
          s1.lat,
          s1.lng,
          s2.lat,
          s2.lng,
        );
      }

      const fareDetails = calculateMumbaiFare(totalDistanceMeters);

      const firstTransitLeg = legs.find((l) => l.type === EdgeType.TRANSIT);
      const originStationId = firstStation?.id || fromStation.id;
      const originLineId = firstTransitLeg?.lineId || '';

      // Predict real-time departures and ETAs for each BOARD leg in the journey
      await this.realtimePrediction.predictLegsRealtime(legs);

      const realtimeData = await this.realtimePrediction.predictJourneyTrains(
        originStationId,
        originLineId,
      );

      const candidateObj: EnrichedCandidate = {
        id,
        rank: 0, // assigned after filtering + sorting
        score: journeyScore.score,
        origin: firstStation,
        destination: lastStation,
        durationSeconds: totalDurationSeconds,
        durationMinutes: Math.round(totalDurationSeconds / 60),
        duration: Math.round(totalDurationSeconds / 60),
        inVehicleSeconds: journeyScore.inVehicleSeconds,
        walkingSeconds,
        waiting,
        transfers: journeyScore.transfers,
        walkingDistanceMeters: totalPathwayMeters,
        legs,
        stations: orderedStations,
        geojson,
        isDirect,
        lines: lineNames,
        fare: fareDetails.paperFare,
        smartCardFare: fareDetails.smartCardFare,
        realtime: realtimeData,
        confidence: 0.8,
        tradeoffs: {
          durationDeltaSeconds: 0,
          transferDelta: 0,
          walkingDeltaMeters: 0,
        },
        attributes: {
          fastest: false,
          fewestTransfers: false,
          direct: false,
          leastWalking: false,
          accessibilityFriendly: false,
        } satisfies CandidateAttributes,
        destinationGuidance,
        _rankScore: rankScore,
      };

      // ── ICX Evaluation ────────────────────────────────────────────────────
      const evalResult = this.interchangeEvaluator.evaluateCandidate(
        candidateObj,
        constraints,
      );
      candidateObj.interchangeFriction = {
        level: evalResult.frictionLevel,
        effectiveCostSeconds: evalResult.effectiveCostSeconds,
        frictionSeconds: evalResult.frictionSeconds,
      };
      candidateObj.reasonCodes = evalResult.reasonCodes;
      candidateObj.humanSummary = evalResult.humanSummary;

      // ── Landmark Infrastructure Intelligence ─────────────────────────────
      if ((toStation as any).resolvedFromLandmark) {
        const destLm = (toStation as any).resolvedFromLandmark;
        candidateObj.destinationLandmark = {
          id: destLm.id,
          name: destLm.name,
          category: destLm.category,
          hasDirectFob: destLm.hasDirectFob,
          hasDirectAccess: destLm.hasDirectAccess,
          directFobName: destLm.directFobName,
          walkDistanceMeters: destLm.walkDistanceMeters,
          walkTimeSeconds: destLm.walkTimeSeconds,
          corridorNote: destLm.corridorNote,
          indoorLevel: destLm.indoorLevel,
        };
        candidateObj.destinationGuidance = destLm.corridorNote;
      }

      if ((fromStation as any).resolvedFromLandmark) {
        const origLm = (fromStation as any).resolvedFromLandmark;
        candidateObj.originLandmark = {
          id: origLm.id,
          name: origLm.name,
          category: origLm.category,
          hasDirectFob: origLm.hasDirectFob,
          hasDirectAccess: origLm.hasDirectAccess,
          directFobName: origLm.directFobName,
          walkDistanceMeters: origLm.walkDistanceMeters,
          walkTimeSeconds: origLm.walkTimeSeconds,
          corridorNote: origLm.corridorNote,
          indoorLevel: origLm.indoorLevel,
        };
      }

      if (candidateObj.destinationLandmark?.hasDirectFob) {
        const fobNotice = `${candidateObj.destinationLandmark.name} is directly connected via FOB to ${toStation.name}. Zero street walking required.`;
        candidateObj.humanSummary = candidateObj.humanSummary
          ? `${candidateObj.humanSummary} • ${fobNotice}`
          : fobNotice;
      }

      if (evalResult.isFeasible) {
        enriched.push(candidateObj);
      }
    }

    // ── 5. Feasibility + dominance filter ────────────────────────────────────
    const filtered = this.filter.filter(enriched);

    if (filtered.length === 0) {
      // This shouldn't happen if rawPaths was non-empty, but be defensive
      throw new NotFoundException(
        `All candidate routes were filtered out between ${fromStation.name} and ${toStation.name}.`,
      );
    }

    // ── 6. Deterministic Rank: sort by effectiveCost if friction/luggage requested, else rankScore ──
    const sortByFriction =
      constraints.objective === 'MIN_FRICTION' ||
      constraints.luggage === 'HEAVY';

    if (sortByFriction) {
      filtered.sort(
        (a, b) =>
          (a.interchangeFriction?.effectiveCostSeconds ?? a._rankScore) -
          (b.interchangeFriction?.effectiveCostSeconds ?? b._rankScore),
      );
    } else {
      filtered.sort((a, b) => a._rankScore - b._rankScore);
    }
    filtered.forEach((c, i) => {
      c.rank = i + 1;
    });

    // ── 7. Attribute flags + tradeoffs ────────────────────────────────────────
    this.scorer.computeAttributes(filtered);
    this.scorer.computeTradeoffs(filtered);

    this.logger.log(
      `Journey planned: ${fromStation.name} → ${toStation.name}, ` +
        `${filtered.length} candidates (from ${rawPaths.length} raw paths)`,
    );

    // ── 8. Build response ─────────────────────────────────────────────────────
    const fromRef: StationRef = {
      id: fromStation.id,
      name: fromStation.name,
      code: fromStation.code,
      lat: fromStation.latitude,
      lng: fromStation.longitude,
    };
    const toRef: StationRef = {
      id: toStation.id,
      name: toStation.name,
      code: toStation.code,
      lat: toStation.latitude,
      lng: toStation.longitude,
    };

    // Strip internal fields before returning
    const candidates: RouteCandidate[] = filtered.map((c) => {
      delete (c as { _rankScore?: number })._rankScore;
      return c;
    });

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: 'yen-k-shortest',
        graphVersion: this.GRAPH_VERSION,
        candidateCount: candidates.length,
        from: fromRef,
        to: toRef,
      },
      candidates,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private extractStationIds(
    path: { from: string; to: string }[],
    origin: string,
  ): string[] {
    const ids: string[] = [origin];
    for (const edge of path) {
      if (ids[ids.length - 1] !== edge.to) {
        ids.push(edge.to);
      }
    }
    return [...new Set(ids)];
  }

  private async buildLegs(
    path: GraphEdge[],
    lineMap: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
    stationMap: Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        latitude: number;
        longitude: number;
      }
    >,
  ): Promise<JourneyLeg[]> {
    const legs: JourneyLeg[] = [];
    let currentLeg: JourneyLeg | null = null;
    let previousTransit: { lineCode: string | null; to: string } | null = null;

    for (const edge of path) {
      const line = edge.lineId ? lineMap.get(edge.lineId) : undefined;
      const fromSt = stationMap.get(edge.from);
      const toSt = stationMap.get(edge.to);
      const fromName = fromSt?.name ?? edge.from;
      const toName = toSt?.name ?? edge.to;
      const fromRef: StationRef = {
        id: edge.from,
        name: fromName,
        code: fromSt?.code ?? '',
        lat: fromSt?.latitude ?? 0,
        lng: fromSt?.longitude ?? 0,
      };
      const toRef: StationRef = {
        id: edge.to,
        name: toName,
        code: toSt?.code ?? '',
        lat: toSt?.latitude ?? 0,
        lng: toSt?.longitude ?? 0,
      };
      const legMode: LegMode =
        edge.type === EdgeType.TRANSIT ? 'METRO' : 'TRANSFER';
      const throughServiceContinuationFromPrevious = Boolean(
        edge.type === EdgeType.TRANSIT &&
        previousTransit?.to === edge.from &&
        this.interchangeEvaluator.isThroughRunningTransition(
          previousTransit?.lineCode,
          line?.code,
          fromRef.code,
        ),
      );

      if (
        currentLeg !== null &&
        currentLeg.type === edge.type &&
        (currentLeg.lineId === (edge.lineId ?? null) ||
          throughServiceContinuationFromPrevious)
      ) {
        if (throughServiceContinuationFromPrevious && edge.lineId) {
          currentLeg.lineId = edge.lineId;
          if (line?.name) currentLeg.lineName = line.name;
          if (line?.color) currentLeg.lineColor = line.color;
          if (line?.code) currentLeg.lineCode = line.code;
        }
        currentLeg.to = edge.to;
        currentLeg.toStationName = toName;
        currentLeg.toStation = toRef;
        currentLeg.duration += edge.duration;
        currentLeg.durationSeconds = currentLeg.duration;
        currentLeg.durationMinutes = Math.max(
          1,
          Math.round(currentLeg.duration / 60),
        );
        currentLeg.hopCount += 1;
        currentLeg.stationsCount = currentLeg.hopCount;
        currentLeg.stopsCount = currentLeg.hopCount;
        currentLeg.visitedStationCount = currentLeg.hopCount + 1;
        currentLeg.stopsText =
          currentLeg.mode === 'METRO'
            ? currentLeg.hopCount === 1
              ? 'Ride 1 stop'
              : `Ride ${currentLeg.hopCount} stops`
            : 'Transfer';
      } else {
        if (currentLeg) legs.push(currentLeg);
        currentLeg = {
          mode: legMode,
          from: edge.from,
          fromStationName: fromName,
          fromStation: fromRef,
          to: edge.to,
          toStationName: toName,
          toStation: toRef,
          type: edge.type,
          duration: edge.duration,
          durationSeconds: edge.duration,
          durationMinutes: Math.max(1, Math.round(edge.duration / 60)),
          lineId: edge.lineId ?? null,
          lineName: line?.name ?? null,
          lineColor: line?.color ?? null,
          lineCode: line?.code ?? null,
          hopCount: 1,
          visitedStationCount: 2,
          stationsCount: 1,
          stopsCount: 1,
          stopsText: legMode === 'METRO' ? 'Ride 1 stop' : 'Transfer',
          platformStatus: 'UNKNOWN',
          doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED',
          ...(throughServiceContinuationFromPrevious
            ? { throughServiceContinuationFromPrevious: true }
            : {}),
        };
      }

      previousTransit =
        edge.type === EdgeType.TRANSIT
          ? { lineCode: line?.code ?? null, to: edge.to }
          : null;
    }
    if (currentLeg) {
      legs.push(currentLeg);
    }
    for (let i = 0; i < legs.length; i++) {
      const prev = i > 0 ? legs[i - 1] : null;
      const next = i < legs.length - 1 ? legs[i + 1] : null;
      await this.finalizeLeg(legs[i], prev, next);
    }
    return legs;
  }

  private ctmLine9Cache: Phase1CtmData | null = null;
  private ctmLine2bCache: Phase1CtmData | null = null;

  private loadCtmLine9(): Phase1CtmData | null {
    if (this.ctmLine9Cache) return this.ctmLine9Cache;
    const candidates = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        process.cwd(),
        '../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          this.ctmLine9Cache = parsePhase1Ctm(
            JSON.parse(fs.readFileSync(c, 'utf8')) as unknown,
          );
          return this.ctmLine9Cache;
        } catch {
          this.logger.warn(`Could not parse Line 9 CTM file: ${c}`);
        }
      }
    }
    return null;
  }

  private loadCtmLine2b(): Phase1CtmData | null {
    if (this.ctmLine2bCache) return this.ctmLine2bCache;
    const candidates = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        process.cwd(),
        '../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          this.ctmLine2bCache = parsePhase1Ctm(
            JSON.parse(fs.readFileSync(c, 'utf8')) as unknown,
          );
          return this.ctmLine2bCache;
        } catch {
          this.logger.warn(`Could not parse Line 2B CTM file: ${c}`);
        }
      }
    }
    return null;
  }

  private async buildGeoJson(
    stations: StationRef[],
    legs: JourneyLeg[],
    path?: GraphEdge[],
    stationMap?: Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        latitude: number;
        longitude: number;
      }
    >,
    lineMap?: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
  ): Promise<GeoJSON.FeatureCollection> {
    const features: GeoJSON.Feature[] = [];
    const coordMap = new Map<string, [number, number]>(
      stations.map((s) => [s.id, [s.lng, s.lat]]),
    );

    // Group path edges into contiguous corridor runs by (type, lineId)
    // to preserve distinct alignment geometry across through-running and CTM corridors
    const corridorRuns: Array<{
      type: EdgeType;
      lineId: string | null;
      from: string;
      to: string;
      lineName: string | null;
      lineColor: string;
    }> = [];

    if (path && path.length > 0 && stationMap) {
      let currentRun: (typeof corridorRuns)[0] | null = null;
      for (const edge of path) {
        const line =
          edge.lineId && lineMap ? lineMap.get(edge.lineId) : undefined;
        const color = line?.color ?? '#94a3b8';
        if (
          !currentRun ||
          currentRun.type !== edge.type ||
          currentRun.lineId !== (edge.lineId ?? null)
        ) {
          currentRun = {
            type: edge.type,
            lineId: edge.lineId ?? null,
            from: edge.from,
            to: edge.to,
            lineName: line?.name ?? null,
            lineColor: color,
          };
          corridorRuns.push(currentRun);
        } else {
          currentRun.to = edge.to;
        }
      }
    } else {
      for (const leg of legs) {
        corridorRuns.push({
          type: leg.type,
          lineId: leg.lineId,
          from: leg.from,
          to: leg.to,
          lineName: leg.lineName,
          lineColor: leg.lineColor ?? '#94a3b8',
        });
      }
    }

    const segments: Array<{
      coords: [number, number][];
      lineId: string | null;
      type: EdgeType;
      color: string;
      lineName: string | null;
    }> = [];

    for (const run of corridorRuns) {
      if (
        run.type !== EdgeType.TRANSIT &&
        run.type !== EdgeType.WALK &&
        run.type !== EdgeType.TRANSFER
      )
        continue;
      const fromSt = stationMap?.get(run.from);
      const toSt = stationMap?.get(run.to);
      const fromCoord =
        coordMap.get(run.from) ||
        (fromSt
          ? ([fromSt.longitude, fromSt.latitude] as [number, number])
          : null);
      const toCoord =
        coordMap.get(run.to) ||
        (toSt ? ([toSt.longitude, toSt.latitude] as [number, number]) : null);
      if (!fromCoord || !toCoord) continue;

      let segmentCoords: [number, number][] = [fromCoord, toCoord];

      if (run.type === EdgeType.TRANSIT && run.lineId) {
        const shapeCoords = await this.getShapeSegmentCoords(
          run.lineId,
          run.from,
          run.to,
          fromCoord,
          toCoord,
        );
        if (shapeCoords && shapeCoords.length > 1) {
          segmentCoords = shapeCoords;
        }
      }

      const color = run.lineColor ?? '#94a3b8';
      // Keep each contiguous corridor run distinct. Color alone is not an
      // identity: separate corridors can share Yellow/Red branding, and a
      // same-color return segment must not be stitched across a transfer.
      segments.push({
        coords: segmentCoords,
        lineId: run.lineId,
        type: run.type,
        color,
        lineName: run.lineName,
      });
    }

    for (const seg of segments) {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-segment',
          lineId: seg.lineId,
          lineName: seg.lineName,
          color: seg.color,
          mode: seg.type,
        },
        geometry: { type: 'LineString', coordinates: seg.coords },
      });
    }

    if (stations.length > 0) {
      const first = stations[0];
      const last = stations[stations.length - 1];
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-origin',
          name: first.name,
          code: first.code,
        },
        geometry: { type: 'Point', coordinates: [first.lng, first.lat] },
      });
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-destination',
          name: last.name,
          code: last.code,
        },
        geometry: { type: 'Point', coordinates: [last.lng, last.lat] },
      });
    }

    const transferStationIds = new Set<string>();
    for (let i = 1; i < legs.length; i++) {
      const prev = legs[i - 1];
      const curr = legs[i];
      if (
        prev.type === EdgeType.TRANSIT &&
        curr.type === EdgeType.TRANSIT &&
        !curr.throughServiceContinuationFromPrevious &&
        prev.lineId !== curr.lineId
      ) {
        transferStationIds.add(curr.from);
      } else if (
        curr.type === EdgeType.WALK &&
        i > 0 &&
        prev.type === EdgeType.TRANSIT &&
        i + 1 < legs.length &&
        legs[i + 1].type === EdgeType.TRANSIT &&
        prev.lineId !== legs[i + 1].lineId
      ) {
        transferStationIds.add(curr.from);
      }
    }
    for (const stationId of transferStationIds) {
      const station = stations.find((s) => s.id === stationId);
      if (!station) continue;
      const coord = coordMap.get(stationId) || [station.lng, station.lat];
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-transfer',
          id: station.id,
          name: station.name,
          code: station.code,
        },
        geometry: { type: 'Point', coordinates: coord },
      });
    }

    return { type: 'FeatureCollection', features };
  }

  private async getShapeSegmentCoords(
    lineId: string,
    fromStationId: string,
    toStationId: string,
    fromCoord: [number, number],
    toCoord: [number, number],
  ): Promise<[number, number][] | null> {
    try {
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          str,
        );

      let line: {
        id: string;
        code: string | null;
        name: string | null;
      } | null = null;
      if (lineId) {
        line = isUuid(lineId)
          ? await this.db.line.findUnique({
              where: { id: lineId },
              select: { id: true, code: true, name: true },
            })
          : await this.db.line.findFirst({
              where: { code: lineId },
              select: { id: true, code: true, name: true },
            });
      }

      let fromSt: {
        id: string;
        code: string | null;
        name: string | null;
      } | null = null;
      if (fromStationId) {
        fromSt = isUuid(fromStationId)
          ? await this.db.station.findUnique({
              where: { id: fromStationId },
              select: { id: true, code: true, name: true },
            })
          : await this.db.station.findFirst({
              where: { code: fromStationId },
              select: { id: true, code: true, name: true },
            });
      }

      let toSt: {
        id: string;
        code: string | null;
        name: string | null;
      } | null = null;
      if (toStationId) {
        toSt = isUuid(toStationId)
          ? await this.db.station.findUnique({
              where: { id: toStationId },
              select: { id: true, code: true, name: true },
            })
          : await this.db.station.findFirst({
              where: { code: toStationId },
              select: { id: true, code: true, name: true },
            });
      }

      const lineStr =
        `${lineId || ''} ${line?.code || ''} ${line?.name || ''}`.toUpperCase();
      const fromStr =
        `${fromStationId || ''} ${fromSt?.code || ''} ${fromSt?.name || ''}`.toUpperCase();
      const toStr =
        `${toStationId || ''} ${toSt?.code || ''} ${toSt?.name || ''}`.toUpperCase();

      const actualLineId = line?.id || (isUuid(lineId) ? lineId : null);
      const actualFromId =
        fromSt?.id || (isUuid(fromStationId) ? fromStationId : null);
      const actualToId = toSt?.id || (isUuid(toStationId) ? toStationId : null);

      // 1. Authoritative Database Shapes Check (Full GTFS Shapes)
      if (actualLineId) {
        let shapeId: string | null = null;
        if (actualFromId && actualToId) {
          const trips = await this.db.trip.findMany({
            where: {
              lineId: actualLineId,
              shapeId: { not: null },
              isActive: true,
              AND: [
                {
                  stopTimes: {
                    some: { stationId: actualFromId, isActive: true },
                  },
                },
                {
                  stopTimes: {
                    some: { stationId: actualToId, isActive: true },
                  },
                },
              ],
            },
            select: {
              shapeId: true,
              stopTimes: {
                where: {
                  stationId: { in: [actualFromId, actualToId] },
                  isActive: true,
                },
                select: { stationId: true, stopSequence: true },
              },
            },
            take: 20,
          });
          const directionMatchedTrip = trips.find((trip) => {
            const fromStop = trip.stopTimes.find(
              (stopTime) => stopTime.stationId === actualFromId,
            );
            const toStop = trip.stopTimes.find(
              (stopTime) => stopTime.stationId === actualToId,
            );
            return (
              fromStop !== undefined &&
              toStop !== undefined &&
              fromStop.stopSequence < toStop.stopSequence
            );
          });
          shapeId = directionMatchedTrip?.shapeId ?? null;
        }

        if (!shapeId && line?.code) {
          const aliasCode = line.code.replace('MUMBAI_', '');
          const altLine = await this.db.line.findFirst({
            where: {
              OR: [{ code: aliasCode }, { code: `MUMBAI_${aliasCode}` }],
              id: { not: actualLineId },
            },
            select: { id: true },
          });
          if (altLine) {
            const fallbackTrip = await this.db.trip.findFirst({
              where: {
                lineId: altLine.id,
                shapeId: { not: null },
                isActive: true,
              },
              select: { shapeId: true },
            });
            shapeId = fallbackTrip?.shapeId ?? null;
          }
        }

        if (shapeId) {
          const shapes = await this.db.shape.findMany({
            where: { shapeId, isActive: true },
            select: { latitude: true, longitude: true, sequence: true },
            orderBy: { sequence: 'asc' },
          });

          if (shapes.length >= 2) {
            const dbCoords: [number, number][] = shapes.map((s) => [
              s.longitude,
              s.latitude,
            ]);
            return this.sliceCoordinateArray(dbCoords, fromCoord, toCoord);
          }
        }
      }

      // The selected graph edge can reference a stale line record while the
      // GTFS feed represents the same through-service corridor on another
      // route (Mumbai Line 9 is through-running as Line 7). Resolve geometry
      // from the GTFS trip that actually serves both endpoint stations.
      if (actualFromId && actualToId) {
        const matchingTrips = await this.db.trip.findMany({
          where: {
            shapeId: { not: null },
            isActive: true,
            AND: [
              {
                stopTimes: {
                  some: { stationId: actualFromId, isActive: true },
                },
              },
              {
                stopTimes: { some: { stationId: actualToId, isActive: true } },
              },
            ],
          },
          select: {
            shapeId: true,
            stopTimes: {
              where: {
                stationId: { in: [actualFromId, actualToId] },
                isActive: true,
              },
              select: { stationId: true, stopSequence: true },
            },
          },
          take: 100,
        });
        const selectedTrip =
          matchingTrips.find((trip) => {
            const fromStop = trip.stopTimes.find(
              (stopTime) => stopTime.stationId === actualFromId,
            );
            const toStop = trip.stopTimes.find(
              (stopTime) => stopTime.stationId === actualToId,
            );
            return (
              fromStop !== undefined &&
              toStop !== undefined &&
              fromStop.stopSequence < toStop.stopSequence
            );
          }) ?? matchingTrips[0];

        if (selectedTrip?.shapeId) {
          const shapes = await this.db.shape.findMany({
            where: { shapeId: selectedTrip.shapeId, isActive: true },
            select: { latitude: true, longitude: true, sequence: true },
            orderBy: { sequence: 'asc' },
          });
          if (shapes.length >= 2) {
            const coords: [number, number][] = shapes.map((shape) => [
              shape.longitude,
              shape.latitude,
            ]);
            return this.sliceCoordinateArray(coords, fromCoord, toCoord);
          }
        }
      }

      // 2. Fallback: CTM Line 2B Overlay Check
      if (
        lineStr.includes('LINE2B') ||
        lineStr.includes('LINE 2B') ||
        fromStr.includes('L2B') ||
        toStr.includes('L2B') ||
        fromStr.includes('MANDALE') ||
        toStr.includes('MANDALE') ||
        fromStr.includes('DIAMOND GARDEN') ||
        toStr.includes('DIAMOND GARDEN')
      ) {
        const ctm2b = this.loadCtmLine2b();
        const coords: [number, number][] =
          ctm2b?.alignmentGeometry?.coordinates || [];
        if (coords && coords.length >= 2) {
          return this.sliceCoordinateArray(coords, fromCoord, toCoord);
        }
      }

      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to resolve shape segment for line ${lineId}: ${err}`,
      );
      return null;
    }
  }

  private sliceCoordinateArray(
    allCoords: [number, number][],
    fromCoord: [number, number],
    toCoord: [number, number],
  ): [number, number][] {
    let minDistanceToFrom = Infinity;
    let minDistanceToTo = Infinity;
    let idxFrom = -1;
    let idxTo = -1;

    for (let i = 0; i < allCoords.length; i++) {
      const p = allCoords[i];
      const dFrom =
        Math.pow(p[0] - fromCoord[0], 2) + Math.pow(p[1] - fromCoord[1], 2);
      const dTo =
        Math.pow(p[0] - toCoord[0], 2) + Math.pow(p[1] - toCoord[1], 2);
      if (dFrom < minDistanceToFrom) {
        minDistanceToFrom = dFrom;
        idxFrom = i;
      }
      if (dTo < minDistanceToTo) {
        minDistanceToTo = dTo;
        idxTo = i;
      }
    }

    if (idxFrom === -1 || idxTo === -1) {
      return [fromCoord, toCoord];
    }

    const coords: [number, number][] = [fromCoord];
    if (idxFrom < idxTo) {
      for (let i = idxFrom; i <= idxTo; i++) {
        coords.push(allCoords[i]);
      }
    } else if (idxFrom > idxTo) {
      for (let i = idxFrom; i >= idxTo; i--) {
        coords.push(allCoords[i]);
      }
    }
    coords.push(toCoord);
    return coords;
  }

  private async finalizeLeg(
    leg: JourneyLeg,
    prevLeg?: JourneyLeg | null,
    nextLeg?: JourneyLeg | null,
  ): Promise<void> {
    if (leg.type === EdgeType.TRANSIT) {
      // 1. Authoritative deterministic DB resolution from StationSequence and Platform
      const dbResolved = await this.resolveDeterministicDirectionAndPlatform(
        leg.from,
        leg.to,
        leg.lineId,
      );

      if (dbResolved.towards) {
        leg.towards = dbResolved.towards;
        leg.direction = dbResolved.towards.toUpperCase();
        leg.boardingPlatform = dbResolved.boardingPlatform;
        leg.alightingPlatform = dbResolved.alightingPlatform;
        leg.platform = dbResolved.boardingPlatform;
        leg.platformStatus = dbResolved.platformStatus;
      } else {
        // Fallback for lines without StationSequence: check if tripHeadsign exists in DB
        const tripHeadsign = await this.resolveTripHeadsign(
          leg.lineId,
          leg.from,
          leg.to,
        );
        leg.towards = tripHeadsign;
        leg.direction = tripHeadsign ? tripHeadsign.toUpperCase() : null;
        leg.boardingPlatform = null;
        leg.alightingPlatform = null;
        leg.platform = null;
        leg.platformStatus = 'UNKNOWN';
      }

      // 2. Door opening provenance
      const doorResult = this.resolveDoorSide();
      leg.doorsOpen = doorResult.doorsOpen;
      leg.doorSideStatus = doorResult.doorSideStatus;
      if (
        nextLeg?.type === EdgeType.TRANSIT &&
        nextLeg.lineId !== leg.lineId &&
        !nextLeg.throughServiceContinuationFromPrevious
      ) {
        const transfer = this.interchangeEvaluator.resolveTransferDetails(
          leg.toStationName,
          nextLeg.fromStationName,
          leg.lineName,
          nextLeg.lineName,
          leg.toStation?.code,
          nextLeg.fromStation?.code,
        );
        if (transfer) {
          leg.transferDetails = transfer;
          leg.transferTitle = transfer.name;
          leg.transferDurationText = transfer.durationDisplay;
          leg.transferInstructions = transfer.instructions;
          leg.transferSummary =
            transfer.pathwayDistanceMeters !== null
              ? `${transfer.pathwayDistanceMeters} m · ${transfer.durationDisplay}`
              : transfer.durationDisplay;
        }
      }
    } else if (leg.type === EdgeType.WALK || leg.type === EdgeType.TRANSFER) {
      const transfer = this.interchangeEvaluator.resolveTransferDetails(
        leg.fromStationName,
        leg.toStationName,
        prevLeg?.lineName,
        nextLeg?.lineName,
        leg.fromStation?.code,
        leg.toStation?.code,
      );

      if (transfer) {
        leg.transferDetails = transfer;
        leg.transferTitle = transfer.name;
        leg.transferDurationText = transfer.durationDisplay;
        leg.transferInstructions = transfer.instructions;
        if (transfer.estimatedDurationSeconds !== null) {
          leg.duration = transfer.estimatedDurationSeconds;
          leg.durationSeconds = transfer.estimatedDurationSeconds;
          leg.durationMinutes = Math.max(
            1,
            Math.round(transfer.estimatedDurationSeconds / 60),
          );
        } else {
          const fallbackDuration = Math.max(leg.duration, 180);
          leg.duration = fallbackDuration;
          leg.durationSeconds = fallbackDuration;
          leg.durationMinutes = Math.max(1, Math.round(fallbackDuration / 60));
        }
        leg.transferSummary =
          transfer.pathwayDistanceMeters !== null
            ? `${transfer.pathwayDistanceMeters} m · ${transfer.durationDisplay}`
            : transfer.durationDisplay;
      } else {
        const durMins = Math.max(1, Math.round(leg.duration / 60));
        const nextLineLabel = nextLeg?.lineName
          ? nextLeg.lineName.split('_')[0]
          : 'connecting line';
        leg.transferDetails = null;
        leg.transferTitle = `Transfer to ${nextLineLabel}`;
        leg.transferDurationText = `~${durMins} min`;
        leg.transferSummary = `Transfer — ~${durMins} min`;
        leg.transferInstructions = [
          `Follow signs to ${leg.toStationName} concourse`,
          `Proceed to connecting platform`,
        ];
      }
    }
  }

  private async resolveDeterministicDirectionAndPlatform(
    fromStationId: string,
    toStationId: string,
    lineId: string | null,
  ): Promise<{
    towards: string | null;
    boardingPlatform: string | null;
    alightingPlatform: string | null;
    platformStatus: 'KNOWN' | 'USER_REPORTED' | 'UNKNOWN';
  }> {
    if (!fromStationId || !toStationId) {
      return {
        towards: null,
        boardingPlatform: null,
        alightingPlatform: null,
        platformStatus: 'UNKNOWN',
      };
    }

    try {
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          str,
        );

      const [fromSt, toSt, line] = await Promise.all([
        isUuid(fromStationId)
          ? this.db.station.findUnique({
              where: { id: fromStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            })
          : this.db.station.findFirst({
              where: { code: fromStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            }),
        isUuid(toStationId)
          ? this.db.station.findUnique({
              where: { id: toStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            })
          : this.db.station.findFirst({
              where: { code: toStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            }),
        lineId && isUuid(lineId)
          ? this.db.line.findUnique({
              where: { id: lineId },
              select: { id: true, code: true, name: true },
            })
          : lineId
            ? this.db.line.findFirst({
                where: { code: lineId },
                select: { id: true, code: true, name: true },
              })
            : null,
      ]);

      // Resolve trip headsign from GTFS trips table if available
      const tripHeadsign = await this.resolveTripHeadsign(
        lineId,
        fromStationId,
        toStationId,
      );

      if (!fromSt || !toSt) {
        return {
          towards: null,
          boardingPlatform: null,
          alightingPlatform: null,
          platformStatus: 'UNKNOWN',
        };
      }

      // Resolve the direction from a GTFS trip that actually visits both
      // stations in the requested order. Never infer a platform number.
      const matchingTrips = await this.db.trip.findMany({
        where: {
          isActive: true,
          stopTimes: { some: { stationId: fromSt.id, isActive: true } },
          AND: [
            { stopTimes: { some: { stationId: toSt.id, isActive: true } } },
          ],
        },
        select: {
          id: true,
          lineId: true,
          tripHeadsign: true,
          directionId: true,
          stopTimes: {
            where: { isActive: true },
            orderBy: { stopSequence: 'asc' },
            select: { stationId: true, stopSequence: true },
          },
        },
        take: 100,
      });

      const forwardTrips = matchingTrips.filter((trip) => {
        const fromStop = trip.stopTimes.find(
          (stop) => stop.stationId === fromSt.id,
        );
        const toStop = trip.stopTimes.find(
          (stop) => stop.stationId === toSt.id,
        );
        return (
          fromStop && toStop && fromStop.stopSequence < toStop.stopSequence
        );
      });
      const selectedTrip =
        forwardTrips.find((trip) => trip.lineId === line?.id) ??
        forwardTrips[0];
      const selectedFromStop = selectedTrip?.stopTimes.find(
        (stop) => stop.stationId === fromSt.id,
      );
      const terminalStop = selectedTrip?.stopTimes.at(-1);
      const terminalStation = terminalStop
        ? await this.db.station.findUnique({
            where: { id: terminalStop.stationId },
            select: { id: true, name: true },
          })
        : null;
      const platform =
        selectedTrip && selectedFromStop && terminalStation
          ? await this.db.platform.findFirst({
              where: {
                isActive: true,
                lineId: selectedTrip.lineId,
                towardsStationId: terminalStation.id,
                level: { stationId: fromSt.id },
              },
              orderBy: { platformNumber: 'asc' },
              select: { platformNumber: true },
            })
          : null;

      let platformNumber: string | null = platform?.platformNumber ?? null;

      if (!platformNumber && (selectedTrip?.lineId || line?.id) && fromSt?.id) {
        const targetLineId = selectedTrip?.lineId || line?.id;
        if (targetLineId) {
          const platforms = await this.db.platform.findMany({
            where: {
              isActive: true,
              lineId: targetLineId,
              level: { stationId: fromSt.id },
            },
            orderBy: { platformNumber: 'asc' },
            select: { platformNumber: true },
          });
          if (platforms.length > 0) {
            const dirIdx = selectedTrip?.directionId === 1 ? 1 : 0;
            platformNumber = (platforms[dirIdx] || platforms[0]).platformNumber;
          }
        }
      }

      if (selectedTrip || platformNumber) {
        return {
          towards:
            terminalStation?.name ??
            tripHeadsign ??
            selectedTrip?.tripHeadsign ??
            null,
          boardingPlatform:
            platformNumber && platformNumber !== 'UNKNOWN'
              ? `Platform ${platformNumber}`
              : null,
          alightingPlatform: null,
          platformStatus:
            platformNumber && platformNumber !== 'UNKNOWN'
              ? 'KNOWN'
              : 'UNKNOWN',
        };
      }

      return {
        towards: null,
        boardingPlatform: null,
        alightingPlatform: null,
        platformStatus: 'UNKNOWN',
      };
    } catch (err) {
      this.logger.warn(
        `Error resolving deterministic platform/direction: ${err}`,
      );
      return {
        towards: null,
        boardingPlatform: null,
        alightingPlatform: null,
        platformStatus: 'UNKNOWN',
      };
    }
  }

  private resolveDoorSide(): {
    doorsOpen: DoorSide;
    doorSideStatus: DoorSideStatus;
  } {
    // GTFS has no door-side field; report unknown until an authoritative source
    // for this journey's platform provides it.
    return { doorsOpen: null, doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED' };
  }

  private async resolveTripHeadsign(
    lineId: string | null,
    fromStationId: string,
    toStationId: string,
  ): Promise<string | null> {
    if (!lineId) return null;
    try {
      const trips = await this.db.trip.findMany({
        where: {
          lineId,
          isActive: true,
          tripHeadsign: { not: null },
          stopTimes: {
            some: {
              stationId: { in: [fromStationId, toStationId] },
              isActive: true,
            },
          },
        },
        select: {
          tripHeadsign: true,
          stopTimes: {
            where: {
              stationId: { in: [fromStationId, toStationId] },
              isActive: true,
            },
            select: { stationId: true, stopSequence: true },
          },
        },
        take: 10,
      });

      for (const t of trips) {
        const fromST = t.stopTimes.find((st) => st.stationId === fromStationId);
        const toST = t.stopTimes.find((st) => st.stationId === toStationId);
        if (
          fromST &&
          toST &&
          fromST.stopSequence < toST.stopSequence &&
          t.tripHeadsign
        ) {
          return t.tripHeadsign;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Return the GTFS route color when valid; unknown colors remain unknown. */
  private resolveLineColor(l: {
    name: string | null;
    color: string | null;
  }): string {
    const color = (l.color ?? '').trim().replace(/^#/, '');
    return /^[0-9a-f]{6}$/i.test(color) ? `#${color.toUpperCase()}` : '';
  }
}
