import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_500; // 1.5 s → 3 s → 6 s
const TIMEOUT_MS = 12_000; // 12-second hard limit per attempt

@Injectable()
export class FeedDownloaderService {
  private readonly logger = new Logger(FeedDownloaderService.name);

  constructor(private readonly config: ConfigService) {}

  async downloadVehiclePositions(): Promise<Buffer> {
    const baseUrl = this.config.get<string>('OTD_BASE_URL');
    const apiKey = this.config.get<string>('OTD_API_KEY');
    const url = `${baseUrl}/VehiclePositions.pb?key=${apiKey}`;

    let lastErr: Error = new Error('Unknown download error');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const startMs = Date.now();

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

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
      } catch (err: unknown) {
        clearTimeout(timeout);
        lastErr = err instanceof Error ? err : new Error(String(err));

        const isAbort = lastErr.name === 'AbortError';
        const isNetworkReset =
          lastErr.message.includes('ECONNRESET') ||
          lastErr.message.includes('ECONNREFUSED') ||
          lastErr.message.includes('wsarecv') ||
          lastErr.message.includes('forcibly closed') ||
          isAbort;

        if (!isNetworkReset || attempt === MAX_RETRIES) {
          // Non-retryable error OR out of retries — re-throw
          throw lastErr;
        }

        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[OTD] Attempt ${attempt}/${MAX_RETRIES} failed (${isAbort ? 'timeout' : 'connection reset'}). ` +
            `Retrying in ${delayMs}ms…`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    throw lastErr;
  }
}
