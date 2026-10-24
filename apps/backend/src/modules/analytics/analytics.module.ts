import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AnalyticsController } from './controllers/analytics.controller';
import { IsochroneService } from './services/isochrone.service';
import { PedestrianRoutingService } from './services/pedestrian-routing.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [IsochroneService, PedestrianRoutingService],
  exports: [IsochroneService, PedestrianRoutingService],
})
export class AnalyticsModule {}
