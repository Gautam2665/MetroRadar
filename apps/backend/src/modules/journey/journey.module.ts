import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import { GraphBuilderService } from './graph/graph-builder.service';
import { GraphProviderService } from './graph/graph-provider.service';
import { RoutingService } from './routing/routing.service';
import { ScoringService } from './routing/scoring.service';
import { CandidateFilterService } from './routing/candidate-filter.service';
import { InterchangeEvaluatorService } from './routing/interchange-evaluator.service';
import { JourneyService } from './routing/journey.service';
import { JourneyController } from './controllers/journey.controller';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [JourneyController],
  providers: [
    GraphBuilderService,
    GraphProviderService,
    RoutingService,
    ScoringService,
    CandidateFilterService,
    InterchangeEvaluatorService,
    JourneyService,
  ],
  exports: [GraphProviderService, JourneyService, InterchangeEvaluatorService],
})
export class JourneyModule {}
