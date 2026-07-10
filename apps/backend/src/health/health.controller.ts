import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check API and dependency health status' })
  @ApiResponse({ status: 200, description: 'All services are healthy' })
  @ApiResponse({ status: 503, description: 'One or more services are offline' })
  async getHealth() {
    const dbHealthy = await this.databaseService.isHealthy();
    const redisHealthy = await this.checkRedis();

    const response = {
      status: dbHealthy && redisHealthy ? 'ok' : 'error',
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
      version: '0.1.0',
    };

    if (!dbHealthy || !redisHealthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async checkRedis(): Promise<boolean> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    const redis = new Redis({
      host,
      port,
      connectTimeout: 1000,
      maxRetriesPerRequest: 1,
    });

    try {
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    } finally {
      redis.disconnect();
    }
  }
}
