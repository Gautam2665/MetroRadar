import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JourneyModule } from '../journey/journey.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { GisModule } from '../gis/gis.module';
import { StationResolverService } from './services/station-resolver.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { AiAssistantService } from './services/ai-assistant.service';
import { AssistantController } from './controllers/assistant.controller';

@Module({
  imports: [DatabaseModule, JourneyModule, RealtimeModule, GisModule],
  controllers: [AssistantController],
  providers: [
    StationResolverService,
    AssistantToolsService,
    AiAssistantService,
  ],
  exports: [StationResolverService, AssistantToolsService, AiAssistantService],
})
export class AssistantModule {}
