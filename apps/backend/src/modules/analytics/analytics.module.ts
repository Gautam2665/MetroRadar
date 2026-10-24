import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AnalyticsController } from './controllers/analytics.controller';
import { IsochroneService } from './services/isochrone.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [IsochroneService],
  exports: [IsochroneService],
})
export class AnalyticsModule {}
