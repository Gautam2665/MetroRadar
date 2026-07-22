import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JourneyQueryDto } from '../dto/journey-query.dto';
import { JourneyService, JourneyResponse } from '../routing/journey.service';

@ApiTags('Journey')
@Controller('journeys')
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Plan a journey between two stations',
    description:
      'Returns the optimal route between two stations using Dijkstra shortest-path. ' +
      'Response includes journey metadata, scored legs, ordered station list, and a ' +
      'ready-to-render GeoJSON FeatureCollection for map highlight.',
  })
  @ApiQuery({ name: 'from', description: 'Origin station ID (UUID)', required: true })
  @ApiQuery({ name: 'to', description: 'Destination station ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Journey computed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or cross-system routing attempted.' })
  @ApiResponse({ status: 404, description: 'Station not found or no route exists.' })
  async planJourney(@Query() query: JourneyQueryDto): Promise<JourneyResponse> {
    return this.journeyService.planJourney(query);
  }
}
