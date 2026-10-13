import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiAssistantService, AssistantChatResponse, ChatMessage } from '../services/ai-assistant.service';

export class ChatQueryDto {
  message: string;
  city?: string;
  history?: ChatMessage[];
}

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AiAssistantService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Process commuter text or voice query via AI Gateway',
    description:
      'Extracts commuter intent, executes deterministic routing / live boarding / facility tools, ' +
      'and returns human guidance alongside a rich UI card payload.',
  })
  async chat(@Body() body: ChatQueryDto): Promise<AssistantChatResponse> {
    return this.assistantService.processCommuterQuery(
      body.message,
      body.city,
      body.history || [],
    );
  }
}
