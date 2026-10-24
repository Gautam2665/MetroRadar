import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DatasetsController } from './controllers/datasets.controller';
import { DatasetAuditService } from './services/dataset-audit.service';
import { EntranceSnappingService } from './services/entrance-snapping.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DatasetsController],
  providers: [DatasetAuditService, EntranceSnappingService],
  exports: [DatasetAuditService, EntranceSnappingService],
})
export class DatasetsModule {}
