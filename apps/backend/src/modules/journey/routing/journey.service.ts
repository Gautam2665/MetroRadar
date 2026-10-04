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
} from './candidate.types';
import { GraphEdge } from '../graph/graph.types';

// ── Internal type for enriched-but-not-yet-ranked candidate ──────────────────

interface EnrichedCandidate extends RouteCandidate {
  _rankScore: number; // internal sorting key, not exposed
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

  async planJourney(query: JourneyQueryDto): Promise<JourneyResponse> {
    const { from: fromId, to: toId } = query;
    const k = query.k ?? DEFAULT_K;

    const constraints: GenericConstraints = {
      mobility: query.mobility,
      luggage: query.luggage,
      avoid: Array.isArray(query.avoid) ? query.avoid : query.avoid ? [query.avoid] : [],
      prefer: Array.isArray(query.prefer) ? query.prefer : query.prefer ? [query.prefer] : [],
      objective: query.objective,
    };

    if (fromId === toId) {
      throw new BadRequestException(
        'Origin and destination must be different stations.',
      );
    }

    // ── 1. Load station + system data ────────────────────────────────────────
    const [fromStation, toStation] = await Promise.all([
      this.db.station.findUnique({
        where: { id: fromId },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      }),
      this.db.station.findUnique({
        where: { id: toId },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      }),
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
      fromId,
      toId,
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
      ...new Set(rawPaths.flatMap((p) => this.extractStationIds(p, fromId))),
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
      const journeyScore = this.scorer.score(path, weights);
      const waiting = estimateWaiting(journeyScore.transfers);
      const totalDurationSeconds =
        journeyScore.inVehicleSeconds +
        journeyScore.walkingSeconds +
        waiting.total.seconds;

      const stationIds = this.extractStationIds(path, fromId);
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

      const legs = this.buildLegs(path, lineMap, stationMap);
      const geojson = await this.buildGeoJson(orderedStations, legs);

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
        journeyScore.walkingSeconds,
      );

      const candidateObj: EnrichedCandidate = {
        id,
        rank: 0, // assigned after filtering + sorting
        score: journeyScore.score,
        durationSeconds: totalDurationSeconds,
        duration: Math.round(totalDurationSeconds / 60),
        inVehicleSeconds: journeyScore.inVehicleSeconds,
        walkingSeconds: journeyScore.walkingSeconds,
        waiting,
        transfers: journeyScore.transfers,
        walkingDistanceMeters: 0, // v1 stub — shape-derived walking distance in future
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
        _rankScore: rankScore,
      };

      // ── ICX Evaluation ────────────────────────────────────────────────────
      const evalResult = this.interchangeEvaluator.evaluateCandidate(candidateObj, constraints);
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

  private buildLegs(
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
  ): JourneyLeg[] {
    const legs: JourneyLeg[] = [];
    let currentLeg: JourneyLeg | null = null;

    for (const edge of path) {
      const line = edge.lineId ? lineMap.get(edge.lineId) : undefined;
      const fromSt = stationMap.get(edge.from);
      const toSt = stationMap.get(edge.to);
      const fromName = fromSt?.name ?? edge.from;
      const toName = toSt?.name ?? edge.to;

      if (
        currentLeg !== null &&
        currentLeg.type === edge.type &&
        currentLeg.lineId === (edge.lineId ?? null)
      ) {
        currentLeg.to = edge.to;
        currentLeg.toStationName = toName;
        currentLeg.duration += edge.duration;
        currentLeg.stationsCount += 1;
      } else {
        if (currentLeg) {
          this.finalizeLeg(currentLeg);
          legs.push(currentLeg);
        }
        currentLeg = {
          from: edge.from,
          fromStationName: fromName,
          to: edge.to,
          toStationName: toName,
          type: edge.type,
          duration: edge.duration,
          lineId: edge.lineId ?? null,
          lineName: line?.name ?? null,
          lineColor: line?.color ?? null,
          lineCode: line?.code ?? null,
          stationsCount: 1,
        };
      }
    }
    if (currentLeg) {
      this.finalizeLeg(currentLeg);
      legs.push(currentLeg);
    }
    return legs;
  }

  private async buildGeoJson(
    stations: StationRef[],
    legs: JourneyLeg[],
  ): Promise<GeoJSON.FeatureCollection> {
    const features: GeoJSON.Feature[] = [];
    const coordMap = new Map<string, [number, number]>(
      stations.map((s) => [s.id, [s.lng, s.lat]]),
    );

    const segments: Array<{
      coords: [number, number][];
      lineId: string | null;
      color: string;
      lineName: string | null;
    }> = [];
    let currentSegment: (typeof segments)[0] | null = null;

    for (const leg of legs) {
      if (leg.type !== EdgeType.TRANSIT && leg.type !== EdgeType.WALK) continue;
      const fromCoord = coordMap.get(leg.from);
      const toCoord = coordMap.get(leg.to);
      if (!fromCoord || !toCoord) continue;

      let segmentCoords: [number, number][] = [fromCoord, toCoord];

      if (leg.type === EdgeType.TRANSIT && leg.lineId) {
        const shapeCoords = await this.getShapeSegmentCoords(
          leg.lineId,
          leg.from,
          leg.to,
          fromCoord,
          toCoord,
        );
        if (shapeCoords && shapeCoords.length > 1) segmentCoords = shapeCoords;
      }

      const color = leg.lineColor ?? '#94a3b8';
      if (currentSegment === null || currentSegment.lineId !== leg.lineId) {
        currentSegment = {
          coords: [...segmentCoords],
          lineId: leg.lineId,
          color,
          lineName: leg.lineName,
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
      if (u.includes('YELLOW') || u.includes('LINE 2A')) return 'YELLOW';
      if (u.includes('AQUA') || u.includes('LINE 3')) return 'AQUA';
      if (u.includes('BLUE') || u.includes('LINE 1')) return 'BLUE';
      if (u.includes('RED') || u.includes('LINE 7')) return 'RED';
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
      const trip = await this.db.trip.findFirst({
        where: {
          lineId,
          shapeId: { not: null },
          isActive: true,
          AND: [
            {
              stopTimes: { some: { stationId: fromStationId, isActive: true } },
            },
            { stopTimes: { some: { stationId: toStationId, isActive: true } } },
          ],
        },
        select: { shapeId: true },
      });

      let shapeId = trip?.shapeId;
      if (!shapeId) {
        const fallbackTrip = await this.db.trip.findFirst({
          where: { lineId, shapeId: { not: null }, isActive: true },
          select: { shapeId: true },
        });
        shapeId = fallbackTrip?.shapeId;
      }

      if (!shapeId) return null;

      const shapes = await this.db.shape.findMany({
        where: { shapeId, isActive: true },
        select: { latitude: true, longitude: true, sequence: true },
        orderBy: { sequence: 'asc' },
      });

      if (shapes.length < 2) return null;

      let minDistanceToFrom = Infinity,
        minDistanceToTo = Infinity;
      let idxFrom = -1,
        idxTo = -1;

      for (let i = 0; i < shapes.length; i++) {
        const p = shapes[i];
        const dFrom =
          Math.pow(p.longitude - fromCoord[0], 2) +
          Math.pow(p.latitude - fromCoord[1], 2);
        const dTo =
          Math.pow(p.longitude - toCoord[0], 2) +
          Math.pow(p.latitude - toCoord[1], 2);
        if (dFrom < minDistanceToFrom) {
          minDistanceToFrom = dFrom;
          idxFrom = i;
        }
        if (dTo < minDistanceToTo) {
          minDistanceToTo = dTo;
          idxTo = i;
        }
      }

      if (idxFrom === -1 || idxTo === -1 || idxFrom === idxTo) return null;

      const coords: [number, number][] = [fromCoord];
      if (idxFrom < idxTo) {
        for (let i = idxFrom + 1; i < idxTo; i++)
          coords.push([shapes[i].longitude, shapes[i].latitude]);
      } else {
        for (let i = idxFrom - 1; i > idxTo; i--)
          coords.push([shapes[i].longitude, shapes[i].latitude]);
      }
      coords.push(toCoord);
      return coords;
    } catch (err) {
      this.logger.warn(
        `Failed to resolve shape segment for line ${lineId}: ${err}`,
      );
      return null;
    }
  }

  private finalizeLeg(leg: JourneyLeg): void {
    if (leg.type === EdgeType.TRANSIT) {
      leg.towards = this.resolveTowards(
        leg.lineName,
        leg.fromStationName,
        leg.toStationName,
      );
    } else if (leg.type === EdgeType.WALK || leg.type === EdgeType.TRANSFER) {
      leg.transferInstructions = this.resolveTransferInstructions(
        leg.fromStationName,
        leg.toStationName,
        leg.duration,
      );
    }
  }

  private resolveTowards(
    lineName: string | null,
    fromStationName: string,
    toStationName: string,
  ): string {
    const raw = lineName || '';
    const upper = raw.toUpperCase();

    // 1. Pink Line directional resolution using ground truth station sequence
    if (upper.includes('PINK')) {
      const PINK_STATIONS = [
        'MAJLIS PARK', 'AZADPUR', 'SHALIMAR BAGH', 'NETAJI SUBHASH PLACE', 'SHAKURPUR',
        'PUNJABI BAGH WEST', 'ESI HOSPITAL', 'RAJOURI GARDEN', 'MAYA PURI', 'NARAINA VIHAR',
        'DELHI CANTT', 'SOUTH CAMPUS', 'MOTI BAGH', 'BHIKAJI CAMA PLACE', 'SAROJINI NAGAR',
        'INA', 'SOUTH EXTENSION', 'LAJPAT NAGAR', 'VINOBAPURI', 'ASHRAM',
        'SARAI KALE KHAN', 'NIZAMUDDIN', 'MAYUR VIHAR', 'TRILOKPURI', 'EAST VINOD NAGAR',
        'MANDAWALI', 'IP EXTENSION', 'ANAND VIHAR', 'KARKARDUMA', 'KRISHNA NAGAR',
        'EAST AZAD NAGAR', 'WELCOME', 'JAFRABAD', 'MAUJPUR', 'GOKULPURI', 'JOHRI ENCLAVE', 'SHIV VIHAR'
      ];
      const fromU = fromStationName.toUpperCase();
      const toU = toStationName.toUpperCase();
      const idxFrom = PINK_STATIONS.findIndex((s) => fromU.includes(s));
      const idxTo = PINK_STATIONS.findIndex((s) => toU.includes(s));
      if (idxFrom !== -1 && idxTo !== -1) {
        return idxTo > idxFrom
          ? 'Shiv Vihar (via INA / Lajpat Nagar)'
          : 'Majlis Park (via Netaji Subhash Place)';
      }
      const eastbound = ['SARAI KALE KHAN', 'NIZAMUDDIN', 'ASHRAM', 'LAJPAT', 'INA', 'MAYUR', 'SHIV VIHAR', 'MOTI BAGH'];
      if (eastbound.some((s) => toU.includes(s))) {
        return 'Shiv Vihar (via INA / Lajpat Nagar)';
      }
      return 'Majlis Park (via Netaji Subhash Place)';
    }

    // 2. Airport Express directional resolution
    if (upper.includes('AIRPORT') || upper.includes('ORANGE')) {
      const toU = toStationName.toUpperCase();
      return toU.includes('DWARKA') ? 'Dwarka Sector - 21' : 'New Delhi';
    }

    // 3. Mumbai Metro line direction heuristics
    if (upper.includes('LINE 3') || upper.includes('AQUA')) {
      const northboundStns = ['AAREY', 'SEEPZ', 'MIDC', 'MAROL NAKA', 'CSMIA'];
      const isNorthbound = northboundStns.some((s) =>
        toStationName.toUpperCase().includes(s),
      );
      return isNorthbound ? 'Aarey JVLR' : 'Cuffe Parade';
    }

    if (upper.includes('LINE 1') || upper.includes('BLUE')) {
      const westboundStns = [
        'VERSOVA',
        'D. N. NAGAR',
        'D.N. NAGAR',
        'AZAD NAGAR',
        'ANDHERI',
      ];
      const isWestbound = westboundStns.some((s) =>
        toStationName.toUpperCase().includes(s),
      );
      return isWestbound ? 'Versova' : 'Ghatkopar';
    }

    // 4. Default: Check if line name contains " to [Destination]"
    const toMatch = raw.match(/\s+to\s+([^,]+)$/i);
    if (toMatch && toMatch[1]) {
      return toMatch[1].trim();
    }

    return toStationName;
  }

  private resolveTransferInstructions(
    fromStationName: string,
    toStationName: string,
    durationSeconds: number,
  ): string[] {
    const durMins = Math.max(1, Math.round(durationSeconds / 60));
    const fromUpper = fromStationName.toUpperCase();
    const toUpper = toStationName.toUpperCase();

    // Dhaula Kuan <-> South Campus Skywalk
    if (
      (fromUpper.includes('DHAULA KUAN') && toUpper.includes('SOUTH CAMPUS')) ||
      (fromUpper.includes('SOUTH CAMPUS') && toUpper.includes('DHAULA KUAN'))
    ) {
      return [
        `Alight at ${fromStationName} station`,
        `Follow Skywalk / Travelator to Pink Line (755m, ~${durMins} min)`,
      ];
    }

    // Marol Naka (L3 <-> L1)
    if (fromUpper.includes('MAROL NAKA') && toUpper.includes('MAROL NAKA')) {
      return [
        `Alight at ${fromStationName} station`,
        `Exit AFC gates to street level, walk ~170m via pedestrian path`,
        `Security check & tap in at connecting concourse`,
      ];
    }

    // Mumbai Central
    if (fromUpper.includes('MUMBAI CENTRAL')) {
      return [
        `Alight at ${fromStationName} station`,
        `Use direct lifts/escalators to flat station forecourt (100m walk to Railway station entrance)`,
      ];
    }

    // Churchgate
    if (fromUpper.includes('CHURCHGATE')) {
      return [
        `Alight at ${fromStationName} station`,
        `Follow pedestrian footpath ~150m to Western Railway Station`,
      ];
    }

    // CSMT
    if (fromUpper.includes('CSMT')) {
      return [
        `Alight at ${fromStationName} station`,
        `Follow direct subway connection to Railway Terminus`,
      ];
    }

    return [
      `Alight at ${fromStationName} station`,
      `Follow signs to ${toStationName} concourse (~${durMins} min walk)`,
    ];
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
