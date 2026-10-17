import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeepAliveService.name);

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.logger.log(
      'KeepAliveService initialized: automated keep-alive ping scheduled every 10 minutes to prevent container cold-sleep.',
    );
  }

  @Cron('0 */10 * * * *') // Runs every 10 minutes
  async keepAlivePing(): Promise<void> {
    const port = this.configService.get<number>('PORT', 3001);
    const targetUrl =
      this.configService.get<string>('KEEP_ALIVE_URL') ||
      this.configService.get<string>('RENDER_EXTERNAL_URL') ||
      `http://localhost:${port}/health`;

    const url = targetUrl.endsWith('/health')
      ? targetUrl
      : `${targetUrl.replace(/\/+$/, '')}/health`;

    try {
      this.logger.debug(`Keep-alive pinging: ${url}`);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'MetroRadar-KeepAlive/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      this.logger.log(`Keep-alive ping succeeded (${url}) -> HTTP ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`Keep-alive ping non-fatal notice: ${err?.message || err}`);
    }
  }
}
