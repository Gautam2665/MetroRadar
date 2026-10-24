import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

export interface EntranceSnappingStats {
  totalActiveEntrances: number;
  snappedWithin100m: number;
  snapSuccessRatePercent: number;
  avgSnapDistanceMeters: number;
  unsnappedEntrances: Array<{
    id: string;
    name: string;
    stationName: string;
    latitude: number;
    longitude: number;
  }>;
}

export interface EntranceSnappingResult extends EntranceSnappingStats {
  updatedCount: number;
  executionTimeMs: number;
}

@Injectable()
export class EntranceSnappingService {
  private readonly logger = new Logger(EntranceSnappingService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Snaps all active station entrances to the nearest pedestrian street edge within maxDistanceMeters (default 100m).
   * Executes high-performance spatial join via PostGIS ST_DWithin and ST_Distance.
   */
  async snapAllEntrances(
    maxDistanceMeters = 100,
  ): Promise<EntranceSnappingResult> {
    const startTime = Date.now();
    this.logger.log(
      `Starting entrance snapping pass with max radius ${maxDistanceMeters}m...`,
    );

    const updateSql = `
      UPDATE entrances e
      SET 
        snapped_pedestrian_edge_id = nearest.id,
        snap_distance_meters = ROUND(nearest.dist::numeric, 2),
        snapped_node_id = nearest.from_node_id
      FROM (
        SELECT DISTINCT ON (e_inner.id)
          e_inner.id as entrance_id,
          pn.id,
          pn.from_node_id,
          ST_Distance(
            COALESCE(e_inner.geom, ST_SetSRID(ST_MakePoint(e_inner.longitude, e_inner.latitude), 4326))::geography,
            pn.geom::geography
          ) as dist
        FROM entrances e_inner
        CROSS JOIN LATERAL (
          SELECT id, from_node_id, geom
          FROM pedestrian_network
          WHERE ST_DWithin(
            COALESCE(e_inner.geom, ST_SetSRID(ST_MakePoint(e_inner.longitude, e_inner.latitude), 4326))::geography,
            geom::geography,
            ${maxDistanceMeters}
          )
          ORDER BY COALESCE(e_inner.geom, ST_SetSRID(ST_MakePoint(e_inner.longitude, e_inner.latitude), 4326)) <-> geom
          LIMIT 1
        ) pn
        WHERE e_inner."isActive" = true
      ) nearest
      WHERE e.id = nearest.entrance_id;
    `;

    const updatedCount = await this.db.$executeRawUnsafe(updateSql);
    const stats = await this.getSnappingStatus();
    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `Entrance snapping completed in ${executionTimeMs}ms. Updated: ${updatedCount}, Snapped: ${stats.snappedWithin100m}/${stats.totalActiveEntrances} (${stats.snapSuccessRatePercent}%).`,
    );

    return {
      ...stats,
      updatedCount,
      executionTimeMs,
    };
  }

  /**
   * Retrieves current snapping governance audit metrics across all station entrances.
   */
  async getSnappingStatus(): Promise<EntranceSnappingStats> {
    const totalEntrancesCount = await this.db.entrance.count({
      where: { isActive: true },
    });

    const snappedSummary = await this.db.$queryRawUnsafe<
      Array<{ count: number; avg_dist: number | null }>
    >(`
      SELECT 
        COUNT(*)::int as count,
        ROUND(AVG(snap_distance_meters)::numeric, 2) as avg_dist
      FROM entrances
      WHERE "isActive" = true AND snapped_pedestrian_edge_id IS NOT NULL;
    `);

    const numSnapped = snappedSummary[0]?.count || 0;
    const avgDist = snappedSummary[0]?.avg_dist
      ? Number(snappedSummary[0].avg_dist)
      : 0;
    const snapSuccessRatePercent =
      totalEntrancesCount > 0
        ? parseFloat(((numSnapped / totalEntrancesCount) * 100).toFixed(1))
        : 0;

    const unsnappedRows = await this.db.entrance.findMany({
      where: {
        isActive: true,
        snappedPedestrianEdgeId: null,
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        station: {
          select: { name: true },
        },
      },
      take: 20,
    });

    const unsnappedEntrances = unsnappedRows.map((u) => ({
      id: u.id,
      name: u.name,
      stationName: u.station.name,
      latitude: u.latitude,
      longitude: u.longitude,
    }));

    return {
      totalActiveEntrances: totalEntrancesCount,
      snappedWithin100m: numSnapped,
      snapSuccessRatePercent,
      avgSnapDistanceMeters: avgDist,
      unsnappedEntrances,
    };
  }
}
