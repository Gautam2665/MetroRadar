import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeedDownloaderService {
  private readonly logger = new Logger(FeedDownloaderService.name);

  constructor(private readonly config: ConfigService) {}

  async downloadVehiclePositions(): Promise<Buffer> {
    const baseUrl = this.config.get<string>('OTD_BASE_URL');
    const apiKey = this.config.get<string>('OTD_API_KEY');

    const url = `${baseUrl}/VehiclePositions.pb?key=${apiKey}`;
    const startMs = Date.now();

    const response = await fetch(url);
    const latencyMs = Date.now() - startMs;

    if (!response.ok) {
      throw new Error(
        `OTD feed returned HTTP ${response.status} after ${latencyMs}ms`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    this.logger.log(
      `[OTD] Downloaded VehiclePositions.pb — ${buffer.length} bytes in ${latencyMs}ms`,
    );
    return buffer;
  }
}
