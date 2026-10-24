import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  CatchmentIsochrone,
  PedestrianNetworkGeoJson,
  StationCatchmentResult,
} from '../interfaces/catchment.interface';

interface LocalEdgeRecord {
  id: string;
  osm_id: bigint | null;
  highway_type: string;
  surface: string | null;
  length_meters: number;
  traversal_time_seconds: number;
  from_node: string;
  to_node: string;
  is_crossing: boolean;
  is_elevated_fob: boolean;
  has_tactile_paving: boolean;
  lit: boolean | null;
  geojson: string;
}

interface AdjEdge {
  to: string;
  weight: number;
  edgeId: string;
  length: number;
  geojson: any;
  isFob: boolean;
}

@Injectable()
export class IsochroneService {
  private readonly logger = new Logger(IsochroneService.name);

  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Calculates realistic pedestrian walking isochrones for a given station
   * using multi-source Dijkstra along the OSM pedestrian network.
   */
  async getStationCatchment(
    stationIdentifier: string,
    minutesList: number[] = [5, 10],
  ): Promise<StationCatchmentResult> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        stationIdentifier,
      );

    const station = await this.prisma.station.findFirst({
      where: isUuid
        ? { id: stationIdentifier, isActive: true }
        : {
            OR: [
              { code: stationIdentifier },
              { name: { contains: stationIdentifier, mode: 'insensitive' } },
            ],
            isActive: true,
          },
      include: {
        entrances: {
          where: { isActive: true },
        },
      },
    });

    if (!station) {
      throw new NotFoundException(
        `Station '${stationIdentifier}' not found or inactive.`,
      );
    }

    // 1. Fetch local pedestrian edges within 1,500 meters of the station centroid
    const localEdges: LocalEdgeRecord[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, osm_id, highway_type, surface, length_meters, traversal_time_seconds,
             from_node_id::text as from_node, to_node_id::text as to_node,
             is_crossing, is_elevated_fob, has_tactile_paving, lit,
             ST_AsGeoJSON(geom) as geojson
      FROM pedestrian_network
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)::geography,
        1500
      ) AND is_active = true;
    `);

    // 2. Build Adjacency Graph for pedestrian network (bidirectional walking links)
    const adj = new Map<string, AdjEdge[]>();
    for (const e of localEdges) {
      const u = e.from_node;
      const v = e.to_node;
      const w = Number(e.traversal_time_seconds);
      const parsedGeo = JSON.parse(e.geojson);

      if (!adj.has(u)) adj.set(u, []);
      if (!adj.has(v)) adj.set(v, []);

      adj.get(u)!.push({
        to: v,
        weight: w,
        edgeId: e.id,
        length: Number(e.length_meters),
        geojson: parsedGeo,
        isFob: e.is_elevated_fob,
      });
      adj.get(v)!.push({
        to: u,
        weight: w,
        edgeId: e.id,
        length: Number(e.length_meters),
        geojson: parsedGeo,
        isFob: e.is_elevated_fob,
      });
    }

    // 3. Multi-source Dijkstra starting from all active entrance snapped nodes
    const dist = new Map<string, number>();
    const pq: Array<{ node: string; cost: number }> = [];

    for (const ent of station.entrances) {
      if (!ent.snappedNodeId) continue;
      const nodeId = ent.snappedNodeId.toString();
      // Snap impedance = distance to street edge at 1.2 m/s
      const snapTime = (ent.snapDistanceMeters ?? 0) / 1.2;

      if (!dist.has(nodeId) || snapTime < dist.get(nodeId)!) {
        dist.set(nodeId, snapTime);
        pq.push({ node: nodeId, cost: snapTime });
      }
    }

    // Fallback: If no snapped entrances exist, find nearest pedestrian node to station centroid
    if (pq.length === 0 && localEdges.length > 0) {
      const nearestNode = localEdges[0].from_node;
      dist.set(nearestNode, 0);
      pq.push({ node: nearestNode, cost: 0 });
    }

    pq.sort((a, b) => a.cost - b.cost);

    while (pq.length > 0) {
      const current = pq.shift()!;
      if (current.cost > (dist.get(current.node) ?? Infinity)) continue;

      const neighbors = adj.get(current.node) || [];
      for (const edge of neighbors) {
        const nextCost = current.cost + edge.weight;
        if (!dist.has(edge.to) || nextCost < dist.get(edge.to)!) {
          dist.set(edge.to, nextCost);
          pq.push({ node: edge.to, cost: nextCost });
          pq.sort((a, b) => a.cost - b.cost);
        }
      }
    }

    // 4. Calculate Catchment metrics and PostGIS polygon for each requested time bucket
    const cleanMinutes = Array.from(new Set(minutesList))
      .filter((m) => m > 0 && m <= 30)
      .sort((a, b) => a - b);

    if (cleanMinutes.length === 0) {
      cleanMinutes.push(5, 10);
    }

    const isochrones: CatchmentIsochrone[] = [];

    for (const m of cleanMinutes) {
      const targetSeconds = m * 60;
      const reachedEdgeIds: string[] = [];
      const reachedFeatures: any[] = [];
      let totalLengthMeters = 0;

      for (const e of localEdges) {
        const c1 = dist.get(e.from_node);
        const c2 = dist.get(e.to_node);
        const minCost = Math.min(
          c1 !== undefined ? c1 : Infinity,
          c2 !== undefined ? c2 : Infinity,
        );

        if (minCost <= targetSeconds) {
          reachedEdgeIds.push(e.id);
          totalLengthMeters += Number(e.length_meters);
          reachedFeatures.push({
            type: 'Feature',
            geometry: JSON.parse(e.geojson),
            properties: {
              id: e.id,
              highwayType: e.highway_type,
              surface: e.surface,
              isElevatedFob: e.is_elevated_fob,
              isCrossing: e.is_crossing,
              lengthMeters: Number(e.length_meters),
              minAccessSeconds: Math.round(minCost),
            },
          });
        }
      }

      let polygonGeoJson: any = null;
      let networkAreaSqKm = 0;

      if (reachedEdgeIds.length > 0) {
        const idListStr = reachedEdgeIds.map((id) => `'${id}'`).join(',');
        const queryRes: Array<{ polygon_geojson: string; area_sq_km: number }> =
          await this.prisma.$queryRawUnsafe(`
            SELECT 
              ST_AsGeoJSON(ST_Multi(ST_Union(ST_Buffer(geom::geography, 45)::geometry))) as polygon_geojson,
              ROUND((ST_Area(ST_Union(ST_Buffer(geom::geography, 45)::geometry)::geography) / 1000000.0)::numeric, 4)::float as area_sq_km
            FROM pedestrian_network
            WHERE id IN (${idListStr});
          `);

        if (queryRes[0]?.polygon_geojson) {
          polygonGeoJson = JSON.parse(queryRes[0].polygon_geojson);
          networkAreaSqKm = Number(queryRes[0].area_sq_km || 0);
        }
      }

      const euclideanRadiusMeters = targetSeconds * 1.2;
      const euclideanAreaSqKm = parseFloat(
        ((Math.PI * Math.pow(euclideanRadiusMeters, 2)) / 1000000.0).toFixed(4),
      );
      const severanceRatio =
        euclideanAreaSqKm > 0
          ? parseFloat(
              Math.max(
                0,
                Math.min(1, 1 - networkAreaSqKm / euclideanAreaSqKm),
              ).toFixed(3),
            )
          : 0;

      const densityKmPerSqKm =
        euclideanAreaSqKm > 0
          ? parseFloat(((totalLengthMeters / 1000.0) / euclideanAreaSqKm).toFixed(2))
          : 0;

      const dataCompleteness: 'VALIDATED_URBAN_GRID' | 'LOCAL_STATION_ENVELOPE_ONLY' =
        reachedEdgeIds.length < 10 || densityKmPerSqKm < 2.0
          ? 'LOCAL_STATION_ENVELOPE_ONLY'
          : 'VALIDATED_URBAN_GRID';

      isochrones.push({
        minutes: m,
        seconds: targetSeconds,
        reachedEdgesCount: reachedEdgeIds.length,
        walkableNetworkLengthKm: parseFloat(
          (totalLengthMeters / 1000.0).toFixed(3),
        ),
        networkAreaSqKm,
        euclideanRadiusMeters,
        euclideanAreaSqKm,
        severanceRatio,
        dataCompleteness,
        densityKmPerSqKm,
        polygonGeoJson,
        reachedEdgesGeoJson: {
          type: 'FeatureCollection',
          features: reachedFeatures,
        },
      });
    }

    return {
      station: {
        id: station.id,
        name: station.name,
        code: station.code,
        latitude: station.latitude,
        longitude: station.longitude,
        activeEntrancesCount: station.entrances.length,
        entrances: station.entrances.map((ent) => ({
          id: ent.id,
          name: ent.name,
          latitude: ent.latitude,
          longitude: ent.longitude,
          snappedNodeId: ent.snappedNodeId
            ? ent.snappedNodeId.toString()
            : null,
          snapDistanceMeters: ent.snapDistanceMeters,
        })),
      },
      metadata: {
        pedestrianSpeedMs: 1.2,
        impedanceModel:
          't = length / 1.2 m/s (stairs: 0.6 m/s + 15s delay; FOB: +20s elevation transition)',
        bufferWidthMeters: 45,
        algorithm:
          'Multi-Source Bidirectional Dijkstra with PostGIS Geometric Buffer Union (ST_Union + ST_Buffer 45m)',
        calculationTimestamp: new Date().toISOString(),
      },
      isochrones,
    };
  }

  /**
   * Returns Mumbai pedestrian street network as a GeoJSON FeatureCollection
   * for MapLibre vector map layer visualization.
   */
  async getPedestrianNetworkGeoJson(
    bbox?: string,
  ): Promise<PedestrianNetworkGeoJson> {
    let whereClause = 'WHERE is_active = true';

    if (bbox) {
      const parts = bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [minLon, minLat, maxLon, maxLat] = parts;
        whereClause += ` AND ST_Intersects(geom, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))`;
      }
    }

    const rows: Array<{
      id: string;
      osm_id: bigint | null;
      highway_type: string;
      surface: string | null;
      length_meters: number;
      traversal_time_seconds: number;
      is_crossing: boolean;
      is_elevated_fob: boolean;
      has_tactile_paving: boolean;
      lit: boolean | null;
      source_type: string;
      study_area: string | null;
      level: string | null;
      tags: any;
      geojson: string;
    }> = await this.prisma.$queryRawUnsafe(`
      SELECT id, osm_id, highway_type, surface, length_meters, traversal_time_seconds,
             is_crossing, is_elevated_fob, has_tactile_paving, lit,
             source_type, study_area, level, tags,
             ST_AsGeoJSON(geom) as geojson
      FROM pedestrian_network
      ${whereClause};
    `);

    let totalLengthM = 0;
    let elevatedFobCount = 0;
    let crossingsCount = 0;

    const features = rows.map((r) => {
      totalLengthM += Number(r.length_meters);
      if (r.is_elevated_fob) elevatedFobCount++;
      if (r.is_crossing) crossingsCount++;

      const isProvisional = r.source_type === 'PROVISIONAL_SYNTHESIZED';
      let confidence = 1.0;
      if (isProvisional) {
        try {
          const parsedTags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags;
          confidence = parsedTags?.confidence ?? 0.85;
        } catch {
          confidence = 0.85;
        }
      }

      return {
        type: 'Feature' as const,
        geometry: JSON.parse(r.geojson),
        properties: {
          id: r.id,
          osmId: r.osm_id ? r.osm_id.toString() : null,
          highwayType: r.highway_type,
          surface: r.surface,
          lengthMeters: Number(r.length_meters),
          traversalTimeSeconds: Number(r.traversal_time_seconds),
          isCrossing: r.is_crossing,
          isElevatedFob: r.is_elevated_fob,
          hasTactilePaving: r.has_tactile_paving,
          lit: r.lit,
          sourceType: r.source_type,
          studyArea: r.study_area,
          isProvisional,
          confidence,
          level: r.level,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
      metadata: {
        totalEdges: features.length,
        totalLengthKm: parseFloat((totalLengthM / 1000.0).toFixed(2)),
        elevatedFobCount,
        crossingsCount,
      },
    };
  }
}
