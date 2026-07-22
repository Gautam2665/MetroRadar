import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { GraphProviderService } from '../graph/graph-provider.service';
import { EdgeType } from '../graph/edge.types';
import { DEFAULT_WEIGHTS } from '../graph/graph.types';
import { RoutingService } from './routing.service';
import { ScoringService } from './scoring.service';
import { JourneyQueryDto } from '../dto/journey-query.dto';

export interface StationRef {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export interface JourneyLeg {
  from: string;
  fromStationName: string;
  to: string;
  toStationName: string;
  type: EdgeType;
  duration: number;
  lineId: string | null;
  lineName: string | null;
  lineColor: string | null;
  lineCode: string | null;
  stationsCount: number;
}

export interface JourneyResponse {
  metadata: {
    generatedAt: string;
    algorithm: string;
    graphVersion: string;
    from: StationRef;
    to: StationRef;
  };
  journey: {
    score: number;
    duration: number;
    durationSeconds: number;
    transfers: number;
    walkingDistance: number;
    legs: JourneyLeg[];
    stations: StationRef[];
    geojson: GeoJSON.FeatureCollection;
  };
}

/**
 * JourneyService — orchestrates the full journey computation pipeline:
 *
 *   1. Resolve station → system
 *   2. GraphProvider.get()  (cache-first, transparent to this service)
 *   3. RoutingService.solve()  (pure Dijkstra)
 *   4. ScoringService.score()
 *   5. Enrich edges with display data from DB (line name, color, code)
 *   6. Assemble GeoJSON FeatureCollection for map highlight
 *   7. Return metadata envelope
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
  ) {}

  async planJourney(query: JourneyQueryDto): Promise<JourneyResponse> {
    const { from: fromId, to: toId } = query;

    if (fromId === toId) {
      throw new BadRequestException(
        'Origin and destination must be different stations.',
      );
    }

    // ── 1. Load station + system data ────────────────────────────────────────
    const [fromStation, toStation] = await Promise.all([
      this.db.station.findUnique({
        where: { id: fromId },
        select: { id: true, code: true, name: true, systemId: true, latitude: true, longitude: true, system: { select: { id: true, code: true } } },
      }),
      this.db.station.findUnique({
        where: { id: toId },
        select: { id: true, code: true, name: true, systemId: true, latitude: true, longitude: true, system: { select: { id: true, code: true } } },
      }),
    ]);

    if (!fromStation) throw new NotFoundException(`Station not found: ${fromId}`);
    if (!toStation) throw new NotFoundException(`Station not found: ${toId}`);

    if (fromStation.systemId !== toStation.systemId) {
      throw new BadRequestException(
        'Cross-system routing is not supported. Both stations must belong to the same metro system.',
      );
    }

    const systemId = fromStation.systemId;
    const systemCode = fromStation.system.code;

    // ── 2. Get transit graph (cache-first via GraphProvider) ─────────────────
    const graph = await this.graphProvider.get(systemId, systemCode);

    // ── 3. Run Dijkstra ──────────────────────────────────────────────────────
    const weights = DEFAULT_WEIGHTS; // Sprint 6: derive from query.options
    const path = this.router.solve(graph, fromId, toId, weights);

    if (path === null) {
      throw new NotFoundException(
        `No route found between ${fromStation.name} and ${toStation.name}.`,
      );
    }

    if (path.length === 0) {
      throw new BadRequestException(
        'Origin and destination are the same station.',
      );
    }

    // ── 4. Score the journey ─────────────────────────────────────────────────
    const journeyScore = this.scorer.score(path, weights);

    // ── 5. Collect unique line IDs for DB enrichment ─────────────────────────
    const lineIds = [...new Set(path.map((e) => e.lineId).filter(Boolean))] as string[];

    const lines = lineIds.length > 0
      ? await this.db.line.findMany({
          where: { id: { in: lineIds } },
          select: { id: true, name: true, color: true, code: true },
        })
      : [];

    const normalizedLines = lines.map((l) => {
      const nameUpper = (l.name || '').toUpperCase();
      let color = l.color || '#3b82f6';
      if (
        color === '' ||
        ['#000000', '000000', '#ffffff', 'ffffff'].includes(color.toLowerCase())
      ) {
        if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A')) {
          color = '#facc15';
        } else if (nameUpper.includes('BLUE')) {
          color = '#3b82f6';
        } else if (nameUpper.includes('PINK')) {
          color = '#ec4899';
        } else if (nameUpper.includes('MAGENTA')) {
          color = '#d946ef';
        } else if (nameUpper.includes('RED')) {
          color = '#ef4444';
        } else if (nameUpper.includes('VIOLET')) {
          color = '#8b5cf6';
        } else if (nameUpper.includes('GREEN')) {
          color = '#22c55e';
        } else if (nameUpper.includes('AQUA')) {
          color = '#06b6d4';
        } else if (nameUpper.includes('GOLD')) {
          color = '#eab308'; // Amber/Gold
        } else if (
          nameUpper.includes('ORANGE') ||
          nameUpper.includes('AIRPORT')
        ) {
          color = '#f97316'; // Orange Express
        } else if (nameUpper.includes('TEAL') || nameUpper.includes('RAPID')) {
          color = '#14b8a6';
        } else if (nameUpper.includes('KOCHI')) {
          color = '#0ea5e9';
        } else {
          color = '#3b82f6';
        }
      }
      return { ...l, color };
    });

    const lineMap = new Map(normalizedLines.map((l) => [l.id, l]));

    // ── 6. Build ordered station list ────────────────────────────────────────
    const visitedStationIds = this.extractStationIds(path, fromId);
    const stationDetails = await this.db.station.findMany({
      where: { id: { in: visitedStationIds } },
      select: { id: true, code: true, name: true, latitude: true, longitude: true },
    });
    const stationMap = new Map(stationDetails.map((s) => [s.id, s]));

    const orderedStations: StationRef[] = visitedStationIds
      .map((id) => {
        const node = graph.nodes.get(id);
        const detail = stationMap.get(id);
        return {
          id,
          name: detail?.name ?? node?.name ?? id,
          code: detail?.code ?? node?.code ?? '',
          lat: detail?.latitude ?? node?.lat ?? 0,
          lng: detail?.longitude ?? node?.lng ?? 0,
        };
      })
      .filter(Boolean) as StationRef[];

    // ── 7. Build enriched collapsed legs ────────────────────────────────────
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
        // Extend current leg
        currentLeg.to = edge.to;
        currentLeg.toStationName = toName;
        currentLeg.duration += edge.duration;
        currentLeg.stationsCount += 1;
      } else {
        // Push previous leg and start a new one
        if (currentLeg) {
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
      legs.push(currentLeg);
    }

    // ── 8. Assemble GeoJSON for map highlight ────────────────────────────────
    const geojson = await this.buildGeoJson(orderedStations, legs, lineMap);

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

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: 'dijkstra',
        graphVersion: this.GRAPH_VERSION,
        from: fromRef,
        to: toRef,
      },
      journey: {
        score: journeyScore.score,
        duration: Math.round(journeyScore.totalDuration / 60),
        durationSeconds: journeyScore.totalDuration,
        transfers: journeyScore.transfers,
        walkingDistance: 0, // Sprint 5: pure transit only
        legs,
        stations: orderedStations,
        geojson,
      },
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Extract the ordered list of station IDs from a path.
   * The path is a list of edges; we collect from + the final to.
   */
  private extractStationIds(path: { from: string; to: string }[], origin: string): string[] {
    const ids: string[] = [origin];
    for (const edge of path) {
      if (ids[ids.length - 1] !== edge.to) {
        ids.push(edge.to);
      }
    }
    return [...new Set(ids)];
  }

  /**
   * Build a GeoJSON FeatureCollection for the journey.
   * Generates one LineString per line segment (different colors per line),
   * plus Point features for origin, destination, and transfer stations.
   */
  private async buildGeoJson(
    stations: StationRef[],
    legs: JourneyLeg[],
    lineMap: Map<string, { id: string; name: string; color: string; code: string }>,
  ): Promise<GeoJSON.FeatureCollection> {
    const features: GeoJSON.Feature[] = [];

    // Build a lookup of stationId → coordinates
    const coordMap = new Map<string, [number, number]>(
      stations.map((s) => [s.id, [s.lng, s.lat]]),
    );

    // Group consecutive legs of the same line into LineString segments
    const segments: Array<{
      coords: [number, number][];
      lineId: string | null;
      color: string;
      lineName: string | null;
    }> = [];

    let currentSegment: {
      coords: [number, number][];
      lineId: string | null;
      color: string;
      lineName: string | null;
    } | null = null;

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
        if (shapeCoords && shapeCoords.length > 1) {
          segmentCoords = shapeCoords;
        }
      }

      const color = leg.lineColor ?? '#94a3b8'; // slate-400 fallback

      if (
        currentSegment === null ||
        currentSegment.lineId !== leg.lineId
      ) {
        // Start a new segment
        currentSegment = {
          coords: [...segmentCoords],
          lineId: leg.lineId,
          color,
          lineName: leg.lineName,
        };
        segments.push(currentSegment);
      } else {
        // Extend existing segment
        currentSegment.coords.push(...segmentCoords.slice(1));
      }
    }

    // Emit one LineString Feature per segment
    for (const seg of segments) {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-segment',
          lineId: seg.lineId,
          lineName: seg.lineName,
          color: seg.color,
        },
        geometry: {
          type: 'LineString',
          coordinates: seg.coords,
        },
      });
    }

    // Emit Point features for origin and destination
    if (stations.length > 0) {
      const first = stations[0];
      const last = stations[stations.length - 1];

      features.push({
        type: 'Feature',
        properties: { featureType: 'journey-origin', name: first.name, code: first.code },
        geometry: { type: 'Point', coordinates: [first.lng, first.lat] },
      });
      features.push({
        type: 'Feature',
        properties: { featureType: 'journey-destination', name: last.name, code: last.code },
        geometry: { type: 'Point', coordinates: [last.lng, last.lat] },
      });
    }

    // Emit Point features for transfer stations
    const transferStationIds = new Set<string>();
    for (let i = 1; i < legs.length - 1; i++) {
      const prev = legs[i - 1];
      const curr = legs[i];
      if (
        prev.type === EdgeType.TRANSIT &&
        curr.type === EdgeType.TRANSIT &&
        prev.lineId !== curr.lineId
      ) {
        transferStationIds.add(curr.from);
      }
    }

    for (const stationId of transferStationIds) {
      const station = stations.find((s) => s.id === stationId);
      if (!station) continue;
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-transfer',
          name: station.name,
          code: station.code,
        },
        geometry: { type: 'Point', coordinates: [station.lng, station.lat] },
      });
    }

    return { type: 'FeatureCollection', features };
  }

  /**
   * Resolves the coordinate sub-sequence along a line's track shape
   * connecting fromStationId to toStationId.
   */
  private async getShapeSegmentCoords(
    lineId: string,
    fromStationId: string,
    toStationId: string,
    fromCoord: [number, number],
    toCoord: [number, number],
  ): Promise<[number, number][] | null> {
    try {
      // Find a trip on this line that has a shapeId and serves both stations
      const trip = await this.db.trip.findFirst({
        where: {
          lineId,
          shapeId: { not: null },
          isActive: true,
          AND: [
            { stopTimes: { some: { stationId: fromStationId, isActive: true } } },
            { stopTimes: { some: { stationId: toStationId, isActive: true } } },
          ],
        },
        select: { shapeId: true },
      });

      let shapeId = trip?.shapeId;
      if (!shapeId) {
        // Fallback to any active trip on this line with shapeId
        const fallbackTrip = await this.db.trip.findFirst({
          where: { lineId, shapeId: { not: null }, isActive: true },
          select: { shapeId: true },
        });
        shapeId = fallbackTrip?.shapeId;
      }

      if (!shapeId) return null;

      // Load all shape points for this shapeId, ordered by sequence
      const shapes = await this.db.shape.findMany({
        where: { shapeId, isActive: true },
        select: { latitude: true, longitude: true, sequence: true },
        orderBy: { sequence: 'asc' },
      });

      if (shapes.length < 2) return null;

      // Find closest shape point index to fromCoord and toCoord
      let minDistanceToFrom = Infinity;
      let minDistanceToTo = Infinity;
      let idxFrom = -1;
      let idxTo = -1;

      for (let i = 0; i < shapes.length; i++) {
        const p = shapes[i];
        
        // Simple Euclidean distance
        const dFrom = Math.pow(p.longitude - fromCoord[0], 2) + Math.pow(p.latitude - fromCoord[1], 2);
        const dTo = Math.pow(p.longitude - toCoord[0], 2) + Math.pow(p.latitude - toCoord[1], 2);

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

      const coords: [number, number][] = [];
      
      // Ensure starting coordinate matches exact station center
      coords.push(fromCoord);

      // Extract shapes between from and to indices
      if (idxFrom < idxTo) {
        for (let i = idxFrom + 1; i < idxTo; i++) {
          coords.push([shapes[i].longitude, shapes[i].latitude]);
        }
      } else {
        for (let i = idxFrom - 1; i > idxTo; i--) {
          coords.push([shapes[i].longitude, shapes[i].latitude]);
        }
      }

      // Ensure ending coordinate matches exact station center
      coords.push(toCoord);

      return coords;
    } catch (err) {
      this.logger.warn(`Failed to resolve shape segment for line ${lineId}: ${err}`);
      return null;
    }
  }
}
