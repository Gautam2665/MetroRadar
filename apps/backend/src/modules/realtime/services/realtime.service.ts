import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { VehiclePositionService } from './vehicle-position.service';
import {
  NormalizedVehicle,
  RealtimeFeedResponse,
} from '../interfaces/gtfs-realtime.interface';

const PROVIDER = 'OTD';
const SYSTEM_CODE = 'DMRC';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly vehicleCache: VehiclePositionService,
    private readonly db: DatabaseService,
  ) {}

  async getVehicles(
    system = SYSTEM_CODE,
    lineFilter?: string,
  ): Promise<RealtimeFeedResponse> {
    const cached = await this.vehicleCache.getVehicles(PROVIDER, system);

    if (!cached) {
      return {
        system,
        provider: PROVIDER,
        generatedAt: new Date().toISOString(),
        cachedAt: null,
        isStale: false,
        staleAgeSeconds: 0,
        vehicleCount: 0,
        vehicles: [],
      };
    }

    const cachedAt = new Date(cached.cachedAt);
    const staleAgeSeconds = Math.round(
      (Date.now() - cachedAt.getTime()) / 1000,
    );

    let vehicles = cached.vehicles;

    // Apply optional line filter by routeId prefix
    if (lineFilter) {
      const upper = lineFilter.toUpperCase();
      vehicles = vehicles.filter((v) =>
        v.routeId?.toUpperCase().includes(upper),
      );
    }

    // Enrich vehicles with line name/color from DB
    vehicles = await this.enrichVehicles(vehicles);

    return {
      system,
      provider: PROVIDER,
      generatedAt: new Date().toISOString(),
      cachedAt: cached.cachedAt,
      isStale: staleAgeSeconds > 120,
      staleAgeSeconds,
      vehicleCount: vehicles.length,
      vehicles,
    };
  }

  private async enrichVehicles(
    vehicles: NormalizedVehicle[],
  ): Promise<NormalizedVehicle[]> {
    const routeIds = [
      ...new Set(vehicles.map((v) => v.routeId).filter(Boolean)),
    ] as string[];

    if (routeIds.length === 0) return [];

    try {
      const lines = await this.db.line.findMany({
        where: { code: { in: routeIds } },
        select: { code: true, name: true, color: true },
      });

      const lineMap = new Map(lines.map((l) => [l.code, l] as const));

      // Strictly filter to ONLY include vehicles matching registered Metro lines
      return vehicles
        .filter((v) => v.routeId && lineMap.has(v.routeId))
        .map((v) => {
          const line = lineMap.get(v.routeId!);
          return {
            ...v,
            lineName: line?.name ?? null,
            lineColor: line?.color ?? null,
          };
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[RealtimeService] DB enrichment failed: ${msg}`);
      return [];
    }
  }
}
