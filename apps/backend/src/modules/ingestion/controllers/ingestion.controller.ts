/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from '../services/ingestion.service';
import { ImportSessionService } from '../services/import-session.service';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly sessionService: ImportSessionService,
  ) {}

  @Post('gtfs')
  @UseInterceptors(FileInterceptor('file'))
  async ingestGtfs(
    @Query('systemId', ParseUUIDPipe) systemId: string,
    @Query('dryRun') dryRunQuery: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No GTFS ZIP file uploaded.');
    }

    const dryRun = dryRunQuery === 'true';
    const report = await this.ingestionService.ingestGtfs(
      systemId,
      file.buffer,
      file.originalname,
      dryRun,
    );

    return report;
  }

  @Get('sessions')
  async getSessions() {
    return this.sessionService.getSessions();
  }

  @Get('sessions/:id')
  async getSessionReport(@Param('id', ParseUUIDPipe) id: string) {
    const report = await this.sessionService.getSessionReport(id);
    if (!report) {
      throw new BadRequestException(`Import session with ID ${id} not found.`);
    }
    return report;
  }
}
