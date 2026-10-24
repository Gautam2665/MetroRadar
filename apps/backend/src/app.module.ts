import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RedisModule } from './redis/redis.module';
import { GisModule } from './modules/gis/gis.module';
import { JourneyModule } from './modules/journey/journey.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/config.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds window
        limit: 120, // Max 120 requests per IP per minute
      },
    ]),
    DatabaseModule,
    RedisModule,
    HealthModule,
    IngestionModule,
    GisModule,
    JourneyModule,
    RealtimeModule,
    AssistantModule,
    DatasetsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
