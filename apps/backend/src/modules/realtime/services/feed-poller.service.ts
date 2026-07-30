import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeedDownloaderService } from './feed-downloader.service';
import { GtfsRtParserService } from './gtfs-rt-parser.service';
import { VehiclePositionService } from './vehicle-position.service';

const PROVIDER = 'OTD';
const SYSTEM_CODE = 'DMRC';

@Injectable()
export class FeedPollerService implements OnModuleInit {
  private readonly logger = new Logger(FeedPollerService.name);
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly downloader: FeedDownloaderService,
    private readonly parser: GtfsRtParserService,
    private readonly vehicleCache: VehiclePositionService,
  ) {
    const pollSeconds = Number(
      this.config.get<number>('REALTIME_POLL_INTERVAL_SECONDS') ?? 30,
    );
    this.intervalMs = pollSeconds * 1000;
  }

  onModuleInit(): void {
    this.logger.log(
      `[FeedPoller] Starting background poll every ${this.intervalMs / 1000}s for ${PROVIDER}:${SYSTEM_CODE}`,
    );
    // Kick off immediately, then on interval
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalMs);
  }

  private async poll(): Promise<void> {
    const startMs = Date.now();
    try {
      const buffer = await this.downloader.downloadVehiclePositions();
      const vehicles = this.parser.parseVehiclePositions(buffer);
      const ttlSeconds = Math.round((this.intervalMs / 1000) * 3);
      await this.vehicleCache.saveVehicles(
        PROVIDER,
        SYSTEM_CODE,
        vehicles,
        ttlSeconds,
      );
      this.logger.log(
        `[FeedPoller] Polled ${PROVIDER} feed for ${SYSTEM_CODE}: ` +
          `${vehicles.length} vehicles parsed in ${Date.now() - startMs}ms. Redis cache updated.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[FeedPoller] Poll failed for ${PROVIDER}:${SYSTEM_CODE} — ${msg}. ` +
          `Last cached data will be served with isStale=true.`,
      );
    }
  }
}
