import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RealtimeService } from '../services/realtime.service';
import { RealtimeNetworkService } from '../services/realtime-network.service';
import { RealtimeVehiclesQueryDto } from '../dto/realtime-vehicles-query.dto';
import { RealtimeFeedResponse } from '../interfaces/gtfs-realtime.interface';

@ApiTags('Realtime Telemetry & GTFS-RT')
@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly realtimeNetworkService: RealtimeNetworkService,
  ) {}

  @Get('vehicles')
  @ApiOperation({
    summary: 'Get live vehicle fleet telemetry (VehiclePositions)',
    description:
      'Returns real-time vehicle fleet tracking for active trains across Mumbai Metro corridors, including coordinates, bearing, heading, delay, and current stop status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active vehicle positions feed payload.',
  })
  async getVehicles(
    @Query() query: RealtimeVehiclesQueryDto,
  ): Promise<RealtimeFeedResponse> {
    return this.realtimeService.getVehicles(query.system, query.line);
  }

  @Get('station/:stationId')
  @ApiOperation({
    summary: 'Get live station platform boarding predictions (TripUpdates)',
    description:
      'Returns upcoming train arrivals and departures per platform for a given station ID, including ETA in minutes, delay seconds, and coach crowding predictions.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Station UUID',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Live station platform boarding countdown.',
  })
  async getStationLiveBoarding(@Param('stationId') stationId: string) {
    return this.realtimeNetworkService.getLiveStationBoarding(stationId);
  }
}
