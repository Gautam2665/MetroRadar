import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RealtimeController } from './controllers/realtime.controller';
import { FeedPollerService } from './services/feed-poller.service';
import { FeedDownloaderService } from './services/feed-downloader.service';
import { GtfsRtParserService } from './services/gtfs-rt-parser.service';
import { VehiclePositionService } from './services/vehicle-position.service';
import { RealtimeService } from './services/realtime.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RealtimeController],
  providers: [
    FeedPollerService,
    FeedDownloaderService,
    GtfsRtParserService,
    VehiclePositionService,
    RealtimeService,
  ],
  exports: [RealtimeService],
})
export class RealtimeModule {}
