import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../../database/database.service';
import { InterchangeEvaluatorService } from '../routing/interchange-evaluator.service';
import { EdgeType } from './edge.types';
import { GraphEdge, StationNode, TransitGraph } from './graph.types';

interface InterchangeComplexRecord {
  complexId: string;
  name: string;
  participatingStations?: string[];
  pathways?: Array<{ walkingSeconds?: number | null }>;
  pathway?: Array<{ walkingSeconds?: number | null }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePathways(
  value: unknown,
): Array<{ walkingSeconds?: number | null }> | undefined {
  if (!Array.isArray(value)) return undefined;
  return (value as unknown[]).flatMap((item) => {
    if (!isRecord(item)) return [];
    const seconds = item.walkingSeconds;
    if (
      seconds === null ||
      (typeof seconds === 'number' && Number.isFinite(seconds))
    ) {
      return [{ walkingSeconds: seconds }];
    }
    return [{}];
  });
}

function parseInterchangeRegistry(value: unknown): InterchangeComplexRecord[] {
  if (!isRecord(value) || !Array.isArray(value.complexes)) return [];
  return (value.complexes as unknown[]).flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.complexId !== 'string' ||
      typeof item.name !== 'string'
    ) {
      return [];
    }
    const participatingStations = Array.isArray(item.participatingStations)
      ? (item.participatingStations as unknown[]).filter(
          (station): station is string => typeof station === 'string',
        )
      : undefined;
    return [
      {
        complexId: item.complexId,
        name: item.name,
        ...(participatingStations ? { participatingStations } : {}),
        ...(Array.isArray(item.pathways)
          ? { pathways: parsePathways(item.pathways) }
          : {}),
        ...(Array.isArray(item.pathway)
          ? { pathway: parsePathways(item.pathway) }
          : {}),
      },
    ];
  });
}

/**
 * GraphBuilderService — builds the station-level transit graph from the
 * Canonical Transit Model (CTM) stored in PostgreSQL.
 *
 * Edge sources (in priority order):
 *  1. StopTime arrival/departure diff — derived directly from GTFS stop_times (SSOT)
 *  2. StationSequence.travelTimeFromPrevious — topological fallback for un-scheduled corridors
 *
 * The graph is scoped strictly to a single systemId. Dijkstra never crosses
 * system boundaries.
 */
@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);
  private interchangeComplexes: InterchangeComplexRecord[] = [];

  constructor(
    private readonly db: DatabaseService,
    private readonly interchangeEvaluator: InterchangeEvaluatorService = new InterchangeEvaluatorService(),
  ) {}

  private loadInterchangeRegistry() {
    const candidates = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        process.cwd(),
        '../../datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/network/interchange-complexes.json',
      ),
    ];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        this.interchangeComplexes = parseInterchangeRegistry(parsed);
        return;
      } catch (error) {
        this.logger.error(
          `Could not read interchange registry ${candidate}`,
          error,
        );
      }
    }
    this.interchangeComplexes = [];
    this.logger.warn(
      'Interchange registry unavailable; no cross-station interchange edges will be inferred.',
    );
  }

  async build(systemId: string): Promise<TransitGraph> {
    this.logger.log(`Building transit graph for system: ${systemId}`);

    const system = await this.db.system.findUnique({
      where: { id: systemId },
      select: { id: true, code: true },
    });
    if (!system) {
      throw new Error(`System not found: ${systemId}`);
    }

    // ── 1. Load all active stations in this system ─────────────────────────
    const stations = await this.db.station.findMany({
      where: { systemId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        systemId: true,
        latitude: true,
        longitude: true,
        sequences: {
          where: { isActive: true },
          select: { lineId: true },
        },
      },
    });

    // Also load line IDs from trips & stop_times for system stations
    const stopTimeLineRows = await this.db.$queryRawUnsafe<
      { stationId: string; lineId: string }[]
    >(
      `SELECT DISTINCT st."stationId", t."lineId"
       FROM stop_times st
       JOIN trips t ON t.id = st."tripId"
       JOIN lines l ON l.id = t."lineId"
       WHERE l."systemId" = $1::uuid`,
      systemId,
    );

    const stationLinesMap = new Map<string, Set<string>>();
    for (const row of stopTimeLineRows) {
      const set = stationLinesMap.get(row.stationId) ?? new Set<string>();
      set.add(row.lineId);
      stationLinesMap.set(row.stationId, set);
    }

    const nodes = new Map<string, StationNode>();
    for (const s of stations) {
      const seqLineIds = s.sequences.map((seq) => seq.lineId);
      const stLineIds = Array.from(stationLinesMap.get(s.id) ?? []);
      const allLineIds = [...new Set([...seqLineIds, ...stLineIds])];

      nodes.set(s.id, {
        id: s.id,
        code: s.code,
        name: s.name,
        systemId: s.systemId,
        lineIds: allLineIds,
        lat: s.latitude,
        lng: s.longitude,
      });
    }
    this.logger.log(`  Loaded ${nodes.size} station nodes`);

    // ── 2. Build TRANSIT edges from GTFS StopTimes (Single Source of Truth) ──────
    const edges = new Map<string, GraphEdge[]>();

    // Helper: add an edge to the adjacency list
    const addEdge = (edge: GraphEdge) => {
      const existing = edges.get(edge.from) ?? [];
      existing.push(edge);
      edges.set(edge.from, existing);
    };

    let transitEdgeCount = 0;
    const coveredCorridors = new Set<string>();

    const stopTimeEdges = await this.buildEdgesFromStopTimes(systemId);
    for (const [from, edgeList] of stopTimeEdges) {
      for (const edge of edgeList) {
        addEdge(edge);
        transitEdgeCount++;
        if (edge.lineId) {
          coveredCorridors.add(`${edge.from}:${edge.to}:${edge.lineId}`);
        }
      }
    }
    this.logger.log(
      `  Built ${transitEdgeCount} TRANSIT edges from GTFS stop_times (SSOT)`,
    );

    // ── 3. Topological Fallback: StationSequence for corridors without GTFS stop_times ──
    const sequences = await this.db.stationSequence.findMany({
      where: {
        isActive: true,
        nextStationId: { not: null },
        line: { systemId },
      },
      select: {
        lineId: true,
        stationId: true,
        nextStationId: true,
        travelTimeFromPrevious: true,
        sequence: true,
      },
      orderBy: [{ lineId: 'asc' }, { sequence: 'asc' }],
    });

    let fallbackEdgeCount = 0;
    for (const seq of sequences) {
      if (!seq.nextStationId) continue;
      const forwardKey = `${seq.stationId}:${seq.nextStationId}:${seq.lineId}`;
      const backwardKey = `${seq.nextStationId}:${seq.stationId}:${seq.lineId}`;

      const fallbackDuration =
        seq.travelTimeFromPrevious > 0 ? seq.travelTimeFromPrevious : 120;

      // Only add if not already populated by GTFS stop_times
      if (!coveredCorridors.has(forwardKey)) {
        addEdge({
          from: seq.stationId,
          to: seq.nextStationId,
          type: EdgeType.TRANSIT,
          duration: fallbackDuration,
          lineId: seq.lineId,
        });
        coveredCorridors.add(forwardKey);
        transitEdgeCount++;
        fallbackEdgeCount++;
      }

      if (!coveredCorridors.has(backwardKey)) {
        addEdge({
          from: seq.nextStationId,
          to: seq.stationId,
          type: EdgeType.TRANSIT,
          duration: fallbackDuration,
          lineId: seq.lineId,
        });
        coveredCorridors.add(backwardKey);
        transitEdgeCount++;
        fallbackEdgeCount++;
      }
    }

    if (fallbackEdgeCount > 0) {
      this.logger.log(
        `  Added ${fallbackEdgeCount} fallback TRANSIT edges from StationSequence for un-scheduled corridors`,
      );
    }
    this.logger.log(`  Total TRANSIT edges: ${transitEdgeCount}`);

    // ── 4. Build TRANSFER edges for interchange stations ────────────────────
    // Shared station IDs can also join two CTM corridor IDs for a through
    // service. Only add a transfer signal when the registry does not declare
    // that line pair continuous at this exact station.
    const lineCodes = await this.db.line.findMany({
      where: { systemId, isActive: true },
      select: { id: true, code: true },
    });
    const lineCodeById = new Map(lineCodes.map((line) => [line.id, line.code]));
    let transferEdgeCount = 0;
    for (const [stationId, node] of nodes) {
      const codes = node.lineIds
        .map((lineId) => lineCodeById.get(lineId))
        .filter((code): code is string => Boolean(code));
      const hasRealInterchangePair = codes.some((fromCode, fromIndex) =>
        codes
          .slice(fromIndex + 1)
          .some(
            (toCode) =>
              !this.interchangeEvaluator.isThroughRunningTransition(
                fromCode,
                toCode,
                node.code,
              ),
          ),
      );
      if (!hasRealInterchangePair) continue;

      // Self-loop edge representing a same-station line change
      // We model it as station → station with TRANSFER type and a fixed penalty.
      // The router applies the JourneyWeights.transferPenalty in scoring.
      // Actual line transition is tracked by changes in lineId between edges.
      // No explicit TRANSFER edge needed — the router detects line changes.
      // However, we include an explicit TRANSFER self-edge as a signal to the
      // scorer that this is a valid interchange point.
      addEdge({
        from: stationId,
        to: stationId,
        type: EdgeType.TRANSFER,
        duration: 0, // penalty applied via JourneyWeights, not duration
        lineId: undefined,
      });
      transferEdgeCount++;
    }
    this.logger.log(
      `  Built ${transferEdgeCount} TRANSFER edges (interchange stations)`,
    );

    // ── 5. Build WALK edges for nearby stations (geospatial transfers) ────────
    this.loadInterchangeRegistry();
    const walkEdgeCount = this.buildWalkEdges(nodes, addEdge);
    this.logger.log(
      `  Built ${walkEdgeCount} WALK edges (authorized interchange transfers)`,
    );

    const graph: TransitGraph = {
      systemId,
      systemCode: system.code,
      nodes,
      edges,
      builtAt: Date.now(),
    };

    this.logger.log(
      `  Graph complete: ${nodes.size} nodes, ${[...edges.values()].reduce((a, b) => a + b.length, 0)} total edges`,
    );
    return graph;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private buildWalkEdges(
    nodes: Map<string, StationNode>,
    addEdge: (edge: GraphEdge) => void,
  ): number {
    let walkEdgeCount = 0;
    const addedWalkPairs = new Set<string>();

    // 1. Registered complexes from network evidence
    const nodeByCode = new Map(
      [...nodes.values()].map((node) => [node.code, node]),
    );
    for (const complex of this.interchangeComplexes) {
      const participants = (complex.participatingStations ?? [])
        .map((code) => nodeByCode.get(code))
        .filter((node): node is StationNode => Boolean(node));
      const registeredSeconds = [
        ...(complex.pathways ?? []),
        ...(complex.pathway ?? []),
      ]
        .map((pathway) => pathway.walkingSeconds)
        .find(
          (seconds): seconds is number =>
            typeof seconds === 'number' && Number.isFinite(seconds),
        );

      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const from = participants[i];
          const to = participants[j];
          if (
            from.id === to.id ||
            from.lineIds.some((lineId) => to.lineIds.includes(lineId))
          )
            continue;
          const duration = registeredSeconds ?? 180; // 3 min baseline
          const pairKey = [from.id, to.id].sort().join(':');
          if (addedWalkPairs.has(pairKey)) continue;
          addedWalkPairs.add(pairKey);

          addEdge({ from: from.id, to: to.id, type: EdgeType.WALK, duration });
          addEdge({ from: to.id, to: from.id, type: EdgeType.WALK, duration });
          walkEdgeCount += 2;
        }
      }
    }

    // 2. Spatial walking transfers:
    // When interchange complexes registry is present, only authoritative registered complexes are used.
    // For systems without an interchange registry, only connect co-located stations (< 150m or matching names within 300m).
    if (this.interchangeComplexes.length === 0) {
      const nodeList = [...nodes.values()];
      const MAX_CO_LOCATED_DISTANCE_METERS = 150;
      const WALKING_SPEED_MPS = 1.2; // 1.2 m/s standard transit walking speed

      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const from = nodeList[i];
          const to = nodeList[j];

          if (from.id === to.id) continue;
          const sharesLine = from.lineIds.some((lineId) =>
            to.lineIds.includes(lineId),
          );
          if (sharesLine) continue;

          const pairKey = [from.id, to.id].sort().join(':');
          if (addedWalkPairs.has(pairKey)) continue;

          const dist = this.getDistanceMeters(
            from.lat,
            from.lng,
            to.lat,
            to.lng,
          );
          const isSameName =
            from.name.trim().toLowerCase() === to.name.trim().toLowerCase();

          if (
            dist <= MAX_CO_LOCATED_DISTANCE_METERS ||
            (isSameName && dist <= 300)
          ) {
            addedWalkPairs.add(pairKey);
            const walkSeconds = Math.max(
              60,
              Math.round(dist / WALKING_SPEED_MPS),
            );
            addEdge({
              from: from.id,
              to: to.id,
              type: EdgeType.WALK,
              duration: walkSeconds,
            });
            addEdge({
              from: to.id,
              to: from.id,
              type: EdgeType.WALK,
              duration: walkSeconds,
            });
            walkEdgeCount += 2;
          }
        }
      }
    }

    return walkEdgeCount;
  }

  /** Compute median of an array of numbers. Robust against outliers. */
  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  /**
   * Primary SSOT: parse StopTime arrival/departure strings to compute travel durations.
   * Dwell times at intermediate stops are preserved so multi-hop paths sum accurately.
   */
  private async buildEdgesFromStopTimes(
    systemId: string,
  ): Promise<Map<string, GraphEdge[]>> {
    // Load all trips for this system with their ordered stop times
    const trips = await this.db.trip.findMany({
      where: { line: { systemId }, isActive: true },
      select: {
        id: true,
        lineId: true,
        stopTimes: {
          where: { isActive: true },
          select: {
            stationId: true,
            arrivalTime: true,
            departureTime: true,
            stopSequence: true,
          },
          orderBy: { stopSequence: 'asc' },
        },
      },
    });

    // Collect durations per (from, to, lineId) pair across all trips
    const durationBuckets = new Map<string, number[]>();

    for (const trip of trips) {
      const stops = trip.stopTimes;
      for (let i = 0; i < stops.length - 1; i++) {
        const curr = stops[i];
        const next = stops[i + 1];
        const isIntermediate = i + 1 < stops.length - 1;
        const depDiff = this.parseTimeDiff(
          curr.departureTime,
          next.departureTime,
        );
        const arrDiff = this.parseTimeDiff(
          curr.departureTime,
          next.arrivalTime,
        );

        // If next is intermediate, passenger experiences dwell before subsequent hop.
        // If next is terminal, arrival time marks the trip completion.
        const duration =
          isIntermediate && depDiff > 0 && depDiff < 3600
            ? depDiff
            : arrDiff > 0 && arrDiff < 3600
              ? arrDiff
              : Math.max(0, depDiff);

        if (duration <= 0 || duration > 3600) continue; // sanity bounds (0-60 min)

        const key = `${curr.stationId}:${next.stationId}:${trip.lineId}`;
        const bucket = durationBuckets.get(key) ?? [];
        bucket.push(duration);
        durationBuckets.set(key, bucket);
      }
    }

    const edges = new Map<string, GraphEdge[]>();
    const addEdge = (edge: GraphEdge) => {
      const existing = edges.get(edge.from) ?? [];
      existing.push(edge);
      edges.set(edge.from, existing);
    };

    const addedPairs = new Set<string>();

    for (const [key, bucket] of durationBuckets) {
      const [fromId, toId, lineId] = key.split(':');
      const duration = this.median(bucket);
      addEdge({
        from: fromId,
        to: toId,
        type: EdgeType.TRANSIT,
        duration,
        lineId,
      });
      addedPairs.add(`${fromId}:${toId}:${lineId}`);

      // Ensure reverse connectivity if reverse trip was not explicitly in GTFS
      const reverseKey = `${toId}:${fromId}:${lineId}`;
      if (!durationBuckets.has(reverseKey) && !addedPairs.has(reverseKey)) {
        addEdge({
          from: toId,
          to: fromId,
          type: EdgeType.TRANSIT,
          duration,
          lineId,
        });
        addedPairs.add(reverseKey);
      }
    }

    return edges;
  }

  /** Parse "HH:MM:SS" time string and compute difference in seconds */
  private parseTimeDiff(departure: string, arrival: string): number {
    const toSeconds = (t: string): number => {
      const parts = t.split(':').map(Number);
      return parts[0] * 3600 + parts[1] * 60 + (parts[2] ?? 0);
    };
    return toSeconds(arrival) - toSeconds(departure);
  }

  /** Calculate Haversine distance in meters between two lat/lng pairs */
  private getDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
