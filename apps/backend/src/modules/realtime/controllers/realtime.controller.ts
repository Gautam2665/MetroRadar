import { Controller, Get, Query } from '@nestjs/common';
import { RealtimeService } from '../services/realtime.service';
import { RealtimeVehiclesQueryDto } from '../dto/realtime-vehicles-query.dto';
import { RealtimeFeedResponse } from '../interfaces/gtfs-realtime.interface';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('vehicles')
  async getVehicles(
    @Query() query: RealtimeVehiclesQueryDto,
  ): Promise<RealtimeFeedResponse> {
    return this.realtimeService.getVehicles(query.system, query.line);
  }
}
