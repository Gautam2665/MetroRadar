import { Controller, Get, Param, Query } from '@nestjs/common';
import { RealtimeService } from '../services/realtime.service';
import { RealtimeNetworkService } from '../services/realtime-network.service';
import { RealtimeVehiclesQueryDto } from '../dto/realtime-vehicles-query.dto';
import { RealtimeFeedResponse } from '../interfaces/gtfs-realtime.interface';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeNetworkService: RealtimeNetworkService,
  ) {}

  @Get('vehicles')
  async getVehicles(
    @Query() query: RealtimeVehiclesQueryDto,
  ): Promise<RealtimeFeedResponse> {
    return this.realtimeService.getVehicles(query.system, query.line);
  }

  @Get('station/:stationId')
  async getStationLiveBoarding(@Param('stationId') stationId: string) {
    return this.realtimeNetworkService.getLiveStationBoarding(stationId);
  }
}
