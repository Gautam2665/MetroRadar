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
import { JourneyQueryDto } from '../dto/journey-query.dto';
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
  ) {}

  private async resolveStation(identifier: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );
    if (isUuid) {
      return this.db.station.findUnique({
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
    }
    return this.db.station.findFirst({
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

      const totalPathwayMeters = legs
        .filter((l) => l.type === EdgeType.WALK || l.type === EdgeType.TRANSFER)
        .reduce(
          (sum, l) => sum + (l.transferDetails?.pathwayDistanceMeters || 0),
          0,
        );

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
        fare: undefined,
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
      color: string;
      lineName: string | null;
    }> = [];
    let currentSegment: (typeof segments)[0] | null = null;

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
      if (currentSegment === null || currentSegment.color !== color) {
        currentSegment = {
          coords: [...segmentCoords],
          lineId: run.lineId,
          color,
          lineName: run.lineName,
        };
        segments.push(currentSegment);
      } else {
        currentSegment.coords.push(...segmentCoords.slice(1));
      }
    }

    for (const seg of segments) {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-segment',
          lineId: seg.lineId,
          lineName: seg.lineName,
          color: seg.color,
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

    const getLineFamily = (lineName: string | null | undefined): string => {
      if (!lineName) return '';
      const u = lineName.toUpperCase();
      if (u.includes('ORANGE') || u.includes('AIRPORT')) return 'ORANGE';
      if (
        u.includes('YELLOW') ||
        u.includes('LINE 2A') ||
        u.includes('LINE 2B')
      )
        return 'YELLOW';
      if (u.includes('AQUA') || u.includes('LINE 3')) return 'AQUA';
      if (u.includes('BLUE') || u.includes('LINE 1')) return 'BLUE';
      if (u.includes('RED') || u.includes('LINE 7') || u.includes('LINE 9'))
        return 'RED';
      if (u.includes('PINK')) return 'PINK';
      if (u.includes('MAGENTA')) return 'MAGENTA';
      if (u.includes('VIOLET')) return 'VIOLET';
      if (u.includes('GREEN')) return 'GREEN';
      if (u.includes('GREY') || u.includes('GRAY')) return 'GREY';
      if (u.includes('TEAL') || u.includes('RAPID')) return 'RAPID';
      if (u.includes('KOCHI')) return 'KOCHI';
      return lineName;
    };

    const transferStationIds = new Set<string>();
    for (let i = 1; i < legs.length; i++) {
      const prev = legs[i - 1];
      const curr = legs[i];
      if (
        prev.type === EdgeType.TRANSIT &&
        curr.type === EdgeType.TRANSIT &&
        !curr.throughServiceContinuationFromPrevious &&
        getLineFamily(prev.lineName) !== getLineFamily(curr.lineName)
      ) {
        transferStationIds.add(curr.from);
      } else if (
        curr.type === EdgeType.WALK &&
        i > 0 &&
        prev.type === EdgeType.TRANSIT &&
        i + 1 < legs.length &&
        legs[i + 1].type === EdgeType.TRANSIT &&
        getLineFamily(prev.lineName) !== getLineFamily(legs[i + 1].lineName)
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

      let line: { code: string | null; name: string | null } | null = null;
      if (lineId) {
        line = isUuid(lineId)
          ? await this.db.line.findUnique({
              where: { id: lineId },
              select: { code: true, name: true },
            })
          : await this.db.line.findFirst({
              where: { code: lineId },
              select: { code: true, name: true },
            });
      }

      let fromSt: { code: string | null; name: string | null } | null = null;
      if (fromStationId) {
        fromSt = isUuid(fromStationId)
          ? await this.db.station.findUnique({
              where: { id: fromStationId },
              select: { code: true, name: true },
            })
          : await this.db.station.findFirst({
              where: { code: fromStationId },
              select: { code: true, name: true },
            });
      }

      let toSt: { code: string | null; name: string | null } | null = null;
      if (toStationId) {
        toSt = isUuid(toStationId)
          ? await this.db.station.findUnique({
              where: { id: toStationId },
              select: { code: true, name: true },
            })
          : await this.db.station.findFirst({
              where: { code: toStationId },
              select: { code: true, name: true },
            });
      }

      const lineStr =
        `${lineId || ''} ${line?.code || ''} ${line?.name || ''}`.toUpperCase();
      const fromStr =
        `${fromStationId || ''} ${fromSt?.code || ''} ${fromSt?.name || ''}`.toUpperCase();
      const toStr =
        `${toStationId || ''} ${toSt?.code || ''} ${toSt?.name || ''}`.toUpperCase();

      // 1. Authoritative Database Shapes Check (Full GTFS Shapes)
      if (lineId && isUuid(lineId)) {
        let shapeId: string | null = null;
        if (isUuid(fromStationId) && isUuid(toStationId)) {
          const trip = await this.db.trip.findFirst({
            where: {
              lineId,
              shapeId: { not: null },
              isActive: true,
              AND: [
                {
                  stopTimes: {
                    some: { stationId: fromStationId, isActive: true },
                  },
                },
                {
                  stopTimes: {
                    some: { stationId: toStationId, isActive: true },
                  },
                },
              ],
            },
            select: { shapeId: true },
          });
          shapeId = trip?.shapeId ?? null;
        }

        if (!shapeId) {
          const fallbackTrip = await this.db.trip.findFirst({
            where: { lineId, shapeId: { not: null }, isActive: true },
            select: { shapeId: true },
          });
          shapeId = fallbackTrip?.shapeId ?? null;
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
          ctm2b?.alignmentGeometry?.coordinates;
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
      const doorResult = this.resolveDoorSide(leg.lineCode, leg.lineName);
      leg.doorsOpen = doorResult.doorsOpen;
      leg.doorSideStatus = doorResult.doorSideStatus;
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
        leg.transferSummary = transfer.pathwayDistanceMeters
          ? `Transfer — ${transfer.pathwayDistanceMeters} m · ${transfer.durationDisplay}`
          : `Transfer — ${transfer.durationDisplay}`;
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

      const fromName = (fromSt?.name || '').toUpperCase();
      const toName = (toSt?.name || '').toUpperCase();
      const lineStr =
        `${lineId || ''} ${line?.code || ''} ${line?.name || ''}`.toUpperCase();

      // Special handling for Line 9 / Line 7 through-running corridor
      if (
        lineStr.includes('LINE 7') ||
        lineStr.includes('LINE 9') ||
        lineStr.includes('LINE7') ||
        lineStr.includes('LINE9') ||
        lineStr.includes('RED') ||
        fromName.includes('KASHIGAON') ||
        fromName.includes('PANDHURANG') ||
        fromName.includes('MIRAGAON') ||
        toName.includes('GUNDAVALI') ||
        toName.includes('DAHISAR')
      ) {
        const isSouthbound =
          (fromSt && toSt && fromSt.latitude > toSt.latitude) ||
          toName.includes('GUNDAVALI') ||
          fromName.includes('KASHIGAON');

        const towards = isSouthbound ? 'Gundavali' : 'Kashigaon';
        const boardingPlatform = isSouthbound ? 'Platform 2' : 'Platform 1';
        return {
          towards,
          boardingPlatform,
          alightingPlatform: null,
          platformStatus: 'KNOWN',
        };
      }

      // Special handling for Mumbai Line 1 (Versova <-> Ghatkopar)
      if (
        lineStr.includes('LINE 1') ||
        lineStr.includes('LINE1') ||
        lineStr.includes('BLUE')
      ) {
        const isEastbound =
          (fromSt && toSt && toSt.longitude > fromSt.longitude) ||
          toName.includes('GHATKOPAR') ||
          fromName.includes('VERSOVA');

        const towards = isEastbound ? 'Ghatkopar' : 'Versova';
        const boardingPlatform = isEastbound ? 'Platform 1' : 'Platform 2';
        return {
          towards,
          boardingPlatform,
          alightingPlatform: null,
          platformStatus: 'KNOWN',
        };
      }

      // Special handling for Mumbai Line 2A (Dahisar East <-> Andheri West)
      if (
        lineStr.includes('LINE 2A') ||
        lineStr.includes('LINE2A') ||
        lineStr.includes('YELLOW')
      ) {
        const isSouthbound =
          (fromSt && toSt && fromSt.latitude > toSt.latitude) ||
          toName.includes('ANDHERI') ||
          fromName.includes('DAHISAR');

        const towards = isSouthbound ? 'Andheri (West)' : 'Dahisar (East)';
        const boardingPlatform = isSouthbound ? 'Platform 2' : 'Platform 1';
        return {
          towards,
          boardingPlatform,
          alightingPlatform: null,
          platformStatus: 'KNOWN',
        };
      }

      // Special handling for Mumbai Line 3 (Aqua Line)
      if (
        lineStr.includes('LINE 3') ||
        lineStr.includes('LINE3') ||
        lineStr.includes('AQUA')
      ) {
        const isSouthbound =
          (fromSt && toSt && fromSt.latitude > toSt.latitude) ||
          toName.includes('ATRE') ||
          toName.includes('BKC') ||
          toName.includes('CUFFE');

        const towards = isSouthbound ? 'Acharya Atre Chowk' : 'Aarey JVLR';
        const boardingPlatform = isSouthbound ? 'Platform 2' : 'Platform 1';
        return {
          towards,
          boardingPlatform,
          alightingPlatform: null,
          platformStatus: 'KNOWN',
        };
      }

      // General DB station sequence fallback
      if (line?.id && fromSt?.id && toSt?.id) {
        const [fromSeq, toSeq] = await Promise.all([
          this.db.stationSequence.findFirst({
            where: { lineId: line.id, stationId: fromSt.id, isActive: true },
            select: { sequence: true },
          }),
          this.db.stationSequence.findFirst({
            where: { lineId: line.id, stationId: toSt.id, isActive: true },
            select: { sequence: true },
          }),
        ]);

        if (fromSeq && toSeq && fromSeq.sequence !== toSeq.sequence) {
          const isIncreasing = toSeq.sequence > fromSeq.sequence;
          const terminalSeq = await this.db.stationSequence.findFirst({
            where: { lineId: line.id, isActive: true },
            orderBy: { sequence: isIncreasing ? 'desc' : 'asc' },
            include: { station: true },
          });

          if (terminalSeq) {
            const towards = terminalSeq.station.name;
            const boardingPlatform = isIncreasing ? 'Platform 1' : 'Platform 2';
            return {
              towards,
              boardingPlatform,
              alightingPlatform: null,
              platformStatus: 'KNOWN',
            };
          }
        }
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

  private resolveDoorSide(
    lineCode: string | null,
    lineName: string | null,
  ): { doorsOpen: DoorSide; doorSideStatus: DoorSideStatus } {
    const raw = `${lineCode || ''} ${lineName || ''}`.toUpperCase();

    // Mumbai Line 3 (Aqua Line) underground stations: engineering DPR explicitly specifies
    // center island platforms for all 26 underground stations -> doors open on Right in direction of travel.
    if (
      raw.includes('MUMBAI_LINE3') ||
      raw.includes('LINE 3') ||
      raw.includes('AQUA')
    ) {
      return { doorsOpen: 'Right', doorSideStatus: 'KNOWN_FROM_ENGINEERING' };
    }

    // Mumbai Line 1 (Blue Line) elevated stations: engineering design specifies
    // side platforms -> doors open on Left in direction of travel.
    if (
      raw.includes('MUMBAI_LINE1') ||
      (raw.includes('LINE 1') && raw.includes('BLUE'))
    ) {
      return { doorsOpen: 'Left', doorSideStatus: 'KNOWN_FROM_ENGINEERING' };
    }

    // For any unmeasured or unverified systems/lines, never fabricate or guess.
    return { doorsOpen: null, doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED' };
  }

  private async resolveTripHeadsign(
    lineId: string | null,
    fromStationId: string,
    toStationId: string,
  ): Promise<string | null> {
    if (!lineId) return null;
    try {
      const trip = await this.db.trip.findFirst({
        where: {
          lineId,
          isActive: true,
          tripHeadsign: { not: null },
          AND: [
            {
              stopTimes: { some: { stationId: fromStationId, isActive: true } },
            },
            { stopTimes: { some: { stationId: toStationId, isActive: true } } },
          ],
        },
        select: { tripHeadsign: true },
      });
      return trip?.tripHeadsign ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve display color for a line, falling back to name-based color matching.
   */
  private resolveLineColor(l: {
    name: string | null;
    color: string | null;
  }): string {
    const nameUpper = (l.name || '').toUpperCase();
    let color = l.color || '';

    if (
      !color ||
      ['#000000', '000000', '#ffffff', 'ffffff'].includes(color.toLowerCase())
    ) {
      if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A'))
        color = '#facc15';
      else if (nameUpper.includes('AQUA') || nameUpper.includes('LINE 3'))
        color = '#059DB2';
      else if (nameUpper.includes('BLUE') || nameUpper.includes('LINE 1'))
        color = '#007DC5';
      else if (nameUpper.includes('PINK')) color = '#ec4899';
      else if (nameUpper.includes('MAGENTA')) color = '#d946ef';
      else if (nameUpper.includes('RED')) color = '#ef4444';
      else if (nameUpper.includes('VIOLET')) color = '#8b5cf6';
      else if (nameUpper.includes('GREEN')) color = '#22c55e';
      else if (nameUpper.includes('GOLD')) color = '#eab308';
      else if (nameUpper.includes('ORANGE') || nameUpper.includes('AIRPORT'))
        color = '#f97316';
      else if (nameUpper.includes('GREY') || nameUpper.includes('GRAY'))
        color = '#808080';
      else if (nameUpper.includes('TEAL') || nameUpper.includes('RAPID'))
        color = '#14b8a6';
      else if (nameUpper.includes('KOCHI')) color = '#0ea5e9';
      else color = '#3b82f6';
    }
    return color;
  }
}
