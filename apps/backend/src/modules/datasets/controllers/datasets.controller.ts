import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatasetAuditService, DatasetAuditReport } from '../services/dataset-audit.service';
import { EntranceSnappingService, EntranceSnappingResult } from '../services/entrance-snapping.service';

@ApiTags('Datasets Governance & Audit')
@Controller(['api/v1/datasets', 'datasets'])
export class DatasetsController {
  constructor(
    private readonly auditService: DatasetAuditService,
    private readonly snappingService: EntranceSnappingService,
  ) {}

  @Get('audit')
  @ApiOperation({
    summary: 'Dataset Governance Audit',
    description:
      'Outputs comprehensive transport-planning data lineage (e.g. Line 7: Official DMRC GTFS Tier A, Line 1: Synthesized Tier X, Pedestrian: OSM 2026-Q1), pedestrian network stats, and entrance snapping ratios.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data lineage and pedestrian network governance audit report',
  })
  async getAudit(): Promise<DatasetAuditReport> {
    return this.auditService.getAuditReport();
  }

  @Post('pedestrian/snap')
  @ApiOperation({
    summary: 'Trigger Entrance Snapping',
    description:
      'Snaps each station entrance to the nearest walkable street edge in pedestrian_network within 100 meters using PostGIS spatial join.',
  })
  @ApiResponse({
    status: 200,
    description: 'Entrance snapping execution results and updated audit statistics',
  })
  async triggerEntranceSnapping(
    @Query('maxDistanceMeters') maxDistanceQuery?: string,
  ): Promise<EntranceSnappingResult> {
    const maxDistance = maxDistanceQuery ? parseFloat(maxDistanceQuery) : 100;
    return this.snappingService.snapAllEntrances(maxDistance);
  }
}
