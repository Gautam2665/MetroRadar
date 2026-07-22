import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MapController } from './controllers/map.controller';
import { StationsController } from './controllers/stations.controller';
import { GeojsonService } from './services/geojson.service';
import { DigitalTwinService } from './services/digital-twin.service';
import { SearchService } from './services/search.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MapController, StationsController],
  providers: [GeojsonService, DigitalTwinService, SearchService],
  exports: [GeojsonService, DigitalTwinService, SearchService],
})
export class GisModule {}
