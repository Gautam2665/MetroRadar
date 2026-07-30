import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import {
  CachedVehiclePayload,
  NormalizedVehicle,
} from '../interfaces/gtfs-realtime.interface';

const CACHE_KEY_PREFIX = 'realtime:vehicles';

@Injectable()
export class VehiclePositionService {
  private readonly logger = new Logger(VehiclePositionService.name);

  constructor(private readonly redis: RedisService) {}

  async saveVehicles(
    provider: string,
    systemCode: string,
    vehicles: NormalizedVehicle[],
    ttlSeconds: number,
  ): Promise<void> {
    const key = `${CACHE_KEY_PREFIX}:${provider}:${systemCode}`;
    const payload: CachedVehiclePayload = {
      vehicles,
      cachedAt: new Date().toISOString(),
    };
    await this.redis.set(key, payload, ttlSeconds);
    this.logger.debug(
      `[${provider}:${systemCode}] Cached ${vehicles.length} vehicles (TTL=${ttlSeconds}s)`,
    );
  }

  async getVehicles(
    provider: string,
    systemCode: string,
  ): Promise<CachedVehiclePayload | null> {
    const key = `${CACHE_KEY_PREFIX}:${provider}:${systemCode}`;
    return this.redis.get<CachedVehiclePayload>(key);
  }
}
