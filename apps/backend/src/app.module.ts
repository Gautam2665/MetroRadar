import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RedisModule } from './redis/redis.module';
import { GisModule } from './modules/gis/gis.module';
import { JourneyModule } from './modules/journey/journey.module';
import { validateEnv } from './config/config.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    IngestionModule,
    GisModule,
    JourneyModule,
  ],
})
export class AppModule {}
