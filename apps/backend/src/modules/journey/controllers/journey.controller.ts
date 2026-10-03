import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JourneyQueryDto } from '../dto/journey-query.dto';
import { JourneyService } from '../routing/journey.service';
import { JourneyResponse } from '../routing/candidate.types';

@ApiTags('Journey')
@Controller('journeys')
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Plan a journey — returns top-K candidate routes',
    description:
      "Generates up to K feasible candidate journeys using Yen's K-shortest loopless paths algorithm. " +
      'Candidates are filtered (feasibility + dominance) and ranked by a configurable composite score. ' +
      'Each RouteCandidate includes timing breakdown (in-vehicle, walking, waiting), transfer count, ' +
      'line list, structured attribute flags (fastest, direct, fewestTransfers…), and tradeoff deltas ' +
      'vs rank-1. GeoJSON is included per candidate for map rendering. ' +
      'Future Intent engine can re-rank candidates via Intent JSON without re-routing.',
  })
  @ApiQuery({
    name: 'from',
    description: 'Origin station ID (UUID)',
    required: true,
  })
  @ApiQuery({
    name: 'to',
    description: 'Destination station ID (UUID)',
    required: true,
  })
  @ApiQuery({
    name: 'k',
    description: 'Number of candidate routes to return (1–10). Default: 5.',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate journeys computed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or cross-system routing attempted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Station not found or no route exists.',
  })
  async planJourney(@Query() query: JourneyQueryDto): Promise<JourneyResponse> {
    return this.journeyService.planJourney(query);
  }
}
