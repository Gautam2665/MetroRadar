import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { EdgeType } from './edge.types';
import { GraphEdge, StationNode, TransitGraph } from './graph.types';

/**
 * GraphBuilderService — builds the station-level transit graph from the
 * Canonical Transit Model (CTM) stored in PostgreSQL.
 *
 * Edge sources (in priority order):
 *  1. StationSequence.travelTimeFromPrevious — curated CTM data (preferred)
 *  2. StopTime arrival/departure diff — derived from GTFS stop_times (fallback)
 *
 * The graph is scoped strictly to a single systemId. Dijkstra never crosses
 * system boundaries.
 */
@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(private readonly db: DatabaseService) {}

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

    // ── 2. Build TRANSIT edges from StationSequence (CTM curated data) ──────
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

    const edges = new Map<string, GraphEdge[]>();

    // Helper: add an edge to the adjacency list
    const addEdge = (edge: GraphEdge) => {
      const existing = edges.get(edge.from) ?? [];
      existing.push(edge);
      edges.set(edge.from, existing);
    };

    let transitEdgeCount = 0;
    // Group durations by (fromStation, toStation, lineId) for median calculation
    const durationBuckets = new Map<string, number[]>();

    for (const seq of sequences) {
      if (!seq.nextStationId) continue;
      const bucketKey = `${seq.stationId}:${seq.nextStationId}:${seq.lineId}`;
      const bucket = durationBuckets.get(bucketKey) ?? [];
      // travelTimeFromPrevious on nextStation = time from current to next
      if (seq.travelTimeFromPrevious > 0) {
        bucket.push(seq.travelTimeFromPrevious);
      }
      durationBuckets.set(bucketKey, bucket);
    }

    // StationSequence approach: each row represents currentStation → nextStation
    // We need to invert: the row tells us the travel time TO arrive at nextStation,
    // so the edge is stationId → nextStationId with that duration.
    const processedPairs = new Set<string>();
    for (const seq of sequences) {
      if (!seq.nextStationId) continue;
      const pairKey = `${seq.stationId}:${seq.nextStationId}:${seq.lineId}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const bucket = durationBuckets.get(pairKey) ?? [];
      const duration = bucket.length > 0 ? this.median(bucket) : 120; // 2 min fallback

      // Forward direction: stationId → nextStationId
      addEdge({
        from: seq.stationId,
        to: seq.nextStationId,
        type: EdgeType.TRANSIT,
        duration,
        lineId: seq.lineId,
      });

      // Backward direction (metro lines are bidirectional)
      addEdge({
        from: seq.nextStationId,
        to: seq.stationId,
        type: EdgeType.TRANSIT,
        duration,
        lineId: seq.lineId,
      });

      transitEdgeCount += 2;
    }

    // ── 3. Fallback: derive TRANSIT edges from StopTimes if sequences are empty
    if (transitEdgeCount === 0) {
      this.logger.warn(
        `  No StationSequence data for system ${system.code}, falling back to stop_times`,
      );
      const stopTimeEdges = await this.buildEdgesFromStopTimes(systemId);
      for (const [from, edgeList] of stopTimeEdges) {
        edges.set(from, [...(edges.get(from) ?? []), ...edgeList]);
        transitEdgeCount += edgeList.length;
      }
    }
    this.logger.log(`  Built ${transitEdgeCount} TRANSIT edges`);

    // ── 4. Build TRANSFER edges for interchange stations ────────────────────
    // A transfer exists at any station that is served by 2+ lines.
    let transferEdgeCount = 0;
    for (const [stationId, node] of nodes) {
      if (node.lineIds.length < 2) continue;

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

  private static readonly REGISTERED_INTERCHANGE_PAIRS: [string, string][] = [
    // Delhi Skywalk
    ['dhaulakuan', 'durgabaideshmukhsouthcampus'],
    ['dhaulakuan', 'southcampus'],
    // Noida
    ['noidasector51', 'noidasector52'],
    ['sector51', 'sector52'],
  ];

  private static readonly REGISTERED_ICX_CODES = new Set(['STN_L1_008', 'STN_L3_004']);

  private isAuthorizedInterchange(s1: StationNode, s2: StationNode): boolean {
    const n1 = s1.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = s2.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Same normalized station name (e.g. Marol Naka <-> Marol Naka, Kashmere Gate <-> Kashmere Gate)
    if (n1 === n2) return true;

    // 2. Substring match for stations like "Dilli Haat INA" vs "INA"
    if ((n1.includes(n2) || n2.includes(n1)) && Math.min(n1.length, n2.length) >= 4) {
      return true;
    }

    // 3. Known cross-named pairs (Skywalks, dedicated pedestrian corridors)
    for (const [pairA, pairB] of GraphBuilderService.REGISTERED_INTERCHANGE_PAIRS) {
      if ((n1.includes(pairA) && n2.includes(pairB)) || (n1.includes(pairB) && n2.includes(pairA))) {
        return true;
      }
    }

    // 4. Explicit registered codes
    if (
      GraphBuilderService.REGISTERED_ICX_CODES.has(s1.code) &&
      GraphBuilderService.REGISTERED_ICX_CODES.has(s2.code)
    ) {
      return true;
    }

    return false;
  }

  private buildWalkEdges(
    nodes: Map<string, StationNode>,
    addEdge: (edge: GraphEdge) => void,
  ): number {
    let walkEdgeCount = 0;
    const WALKING_THRESHOLD_METERS = 1000;
    const WALKING_SPEED_MPS = 1.2; // 1.2 m/s (~4.3 km/h)

    const stationList = [...nodes.values()];
    const allLines = new Set<string>();
    stationList.forEach((s) => s.lineIds.forEach((l) => allLines.add(l)));

    for (const s1 of stationList) {
      for (const lineId of allLines) {
        if (s1.lineIds.includes(lineId)) continue; // Already serves this line

        // Find candidate stations on this foreign line
        const candidatesOnLine = stationList.filter((s) => s.lineIds.includes(lineId));

        for (const s2 of candidatesOnLine) {
          // Strictly reject non-interchange stations
          if (!this.isAuthorizedInterchange(s1, s2)) continue;

          const dist = this.getDistanceMeters(s1.lat, s1.lng, s2.lat, s2.lng);
          if (dist <= WALKING_THRESHOLD_METERS) {
            // If Marol Naka hub, apply physical ICX modeled duration (450s)
            const isMarolNaka =
              s1.name.toLowerCase().includes('marol') &&
              s2.name.toLowerCase().includes('marol');
            const duration = isMarolNaka ? 450 : Math.round(dist / WALKING_SPEED_MPS);

            addEdge({
              from: s1.id,
              to: s2.id,
              type: EdgeType.WALK,
              duration,
            });
            walkEdgeCount++;
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
   * Fallback: parse StopTime arrival/departure strings to compute travel durations.
   * Used only if StationSequence data is absent.
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
        const duration = this.parseTimeDiff(
          curr.departureTime,
          next.arrivalTime,
        );
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
