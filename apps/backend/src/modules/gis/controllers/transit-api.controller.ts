import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../../../database/database.service';
import { DigitalTwinService } from '../services/digital-twin.service';
import { RedisService } from '../../../redis/redis.service';
import { DatasetAuditService } from '../../datasets/services/dataset-audit.service';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Transit Data Infrastructure (v1)')
@Controller('api/v1')
export class TransitApiController {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly digitalTwinService: DigitalTwinService,
    private readonly redisService: RedisService,
    private readonly auditService: DatasetAuditService,
  ) {}

  @Get('networks')
  @ApiOperation({
    summary: 'Discover transit networks and operating systems',
    description: 'Returns all active transit systems with operating metadata, geographic bounding boxes, line counts, and data trust tiers.',
  })
  @ApiResponse({ status: 200, description: 'List of active transit networks.' })
  async getNetworks(): Promise<unknown> {
    const cacheKey = 'transitos:v2:networks';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const systems = await this.prisma.system.findMany({
      where: { isActive: true },
      include: {
        lines: {
          where: { isActive: true },
          select: { id: true, code: true, name: true, color: true },
        },
        _count: {
          select: {
            stations: { where: { isActive: true } },
            lines: { where: { isActive: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      count: systems.length,
      data: systems.map((sys) => ({
        id: sys.id,
        systemCode: sys.code,
        name: sys.name,
        city: sys.city,
        country: sys.country,
        timezone: sys.timezone,
        status: sys.status,
        trustTier: sys.trustTier,
        sourceType: sys.sourceType,
        linesCount: sys._count.lines,
        stationsCount: sys._count.stations,
        lines: sys.lines,
      })),
    };

    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('corridors')
  @ApiOperation({
    summary: 'Retrieve metro and rail corridors',
    description: 'Returns active transit corridors with line colors, traction, signalling, length, and ordered station sequences.',
  })
  @ApiQuery({ name: 'systemCode', required: false, description: 'Filter corridors by system code (e.g. MMRDA, PUNE)' })
  @ApiResponse({ status: 200, description: 'List of active corridors.' })
  async getCorridors(@Query('systemCode') systemCode?: string): Promise<unknown> {
    const cacheKey = `transitos:v2:corridors:${systemCode || 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const whereClause: any = { isActive: true };
    if (systemCode) {
      const codeUpper = systemCode.toUpperCase();
      const resolvedCode = (codeUpper === 'MMRDA' || codeUpper === 'MUMBAI') ? 'MM' : codeUpper;
      whereClause.system = {
        OR: [
          { code: { equals: resolvedCode, mode: 'insensitive' } },
          { code: { equals: systemCode, mode: 'insensitive' } },
          { city: { contains: systemCode, mode: 'insensitive' } },
        ],
      };
    }

    const lines = await this.prisma.line.findMany({
      where: whereClause,
      include: {
        system: { select: { code: true, name: true, city: true } },
        sequences: {
          where: { isActive: true },
          orderBy: { sequence: 'asc' },
          include: {
            station: {
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
                wheelchairAccessible: true,
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const result = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      count: lines.length,
      data: lines.map((l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        color: l.color,
        systemCode: l.system.code,
        cityName: l.system.city,
        traction: l.traction,
        signalling: l.signalling,
        stationsCount: l.sequences.length,
        stations: l.sequences.map((seq) => ({
          sequence: seq.sequence,
          stationId: seq.station.id,
          code: seq.station.code,
          name: seq.station.name,
          latitude: seq.station.latitude,
          longitude: seq.station.longitude,
          distanceFromPreviousMeters: seq.distanceFromPrevious,
          travelTimeSeconds: seq.travelTimeFromPrevious,
          wheelchairAccessible: seq.station.wheelchairAccessible,
        })),
      })),
    };

    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('stations')
  @ApiOperation({
    summary: 'Query stations and geographical coordinates',
    description: 'Returns active stations with coordinate points, serving lines, and entrance gate counts.',
  })
  @ApiQuery({ name: 'lineCode', required: false, description: 'Filter by corridor code (e.g. LINE1, LINE7)' })
  @ApiQuery({ name: 'systemCode', required: false, description: 'Filter by system code (e.g. MMRDA)' })
  @ApiResponse({ status: 200, description: 'List of matching stations.' })
  async getStations(
    @Query('lineCode') lineCode?: string,
    @Query('systemCode') systemCode?: string,
  ): Promise<unknown> {
    const cacheKey = `transitos:v2:stations:${systemCode || 'all'}:${lineCode || 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const whereClause: any = { isActive: true };
    if (systemCode) {
      const codeUpper = systemCode.toUpperCase();
      const resolvedCode = (codeUpper === 'MMRDA' || codeUpper === 'MUMBAI') ? 'MM' : codeUpper;
      whereClause.system = {
        OR: [
          { code: { equals: resolvedCode, mode: 'insensitive' } },
          { code: { equals: systemCode, mode: 'insensitive' } },
          { city: { contains: systemCode, mode: 'insensitive' } },
        ],
      };
    }
    if (lineCode) {
      whereClause.sequences = {
        some: {
          line: { code: { equals: lineCode, mode: 'insensitive' } },
          isActive: true,
        },
      };
    }

    const stations = await this.prisma.station.findMany({
      where: whereClause,
      include: {
        system: { select: { code: true, name: true, city: true } },
        sequences: {
          where: { isActive: true },
          include: {
            line: { select: { id: true, code: true, name: true, color: true } },
          },
        },
        entrances: {
          where: { isActive: true },
          select: { id: true, name: true, lift: true, escalator: true, accessible: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      count: stations.length,
      data: stations.map((stn) => {
        const uniqueLines = Array.from(
          new Map(stn.sequences.map((s) => [s.line.code, s.line])).values(),
        );
        return {
          id: stn.id,
          code: stn.code,
          name: stn.name,
          latitude: stn.latitude,
          longitude: stn.longitude,
          city: stn.city,
          systemCode: stn.system.code,
          wheelchairAccessible: stn.wheelchairAccessible,
          parking: stn.parking,
          bikeParking: stn.bikeParking,
          entranceCount: stn.entrances.length,
          entrances: stn.entrances,
          servingLines: uniqueLines,
        };
      }),
    };

    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('stations/:id')
  @ApiOperation({
    summary: 'Retrieve composite station detail and physical infrastructure',
    description: 'Retrieves multi-level indoor layout, calibrated entrance gates, platform coordinates, amenities, and commercial spaces for a station UUID or code.',
  })
  @ApiParam({ name: 'id', description: 'Station UUID or Station Code (e.g. STN_L7_014)' })
  @ApiResponse({ status: 200, description: 'Composite station profile and digital twin.' })
  async getStationDetail(@Param('id') id: string): Promise<unknown> {
    const cacheKey = `transitos:v2:station_detail:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const result = await this.digitalTwinService.getStationDigitalTwin(id);
    await this.redisService.set(cacheKey, result, 300);
    return result;
  }

  @Get('interchanges')
  @ApiOperation({
    summary: 'Explore verified platform interchange connections',
    description: 'Returns the 40 verified physical platform-to-platform transfer pairs, walking distances, transfer times, and vertical connectivity.',
  })
  @ApiResponse({ status: 200, description: 'List of physical platform interchanges.' })
  async getInterchanges(): Promise<unknown> {
    const cacheKey = 'transitos:v2:interchanges';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const interchanges = await this.prisma.interchange.findMany({
      where: { isActive: true },
      include: {
        fromPlatform: {
          include: {
            line: { select: { code: true, name: true, color: true } },
            level: {
              include: {
                station: {
                  select: { id: true, code: true, name: true, latitude: true, longitude: true },
                },
              },
            },
          },
        },
        toPlatform: {
          include: {
            line: { select: { code: true, name: true, color: true } },
            level: {
              include: {
                station: {
                  select: { id: true, code: true, name: true, latitude: true, longitude: true },
                },
              },
            },
          },
        },
      },
      orderBy: { walkingDistance: 'asc' },
    });

    const result = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      count: interchanges.length,
      data: interchanges.map((ic) => ({
        id: ic.id,
        fromStation: {
          id: ic.fromPlatform.level.station.id,
          code: ic.fromPlatform.level.station.code,
          name: ic.fromPlatform.level.station.name,
          platformNumber: ic.fromPlatform.platformNumber,
          lineCode: ic.fromPlatform.line.code,
          lineName: ic.fromPlatform.line.name,
          lineColor: ic.fromPlatform.line.color,
        },
        toStation: {
          id: ic.toPlatform.level.station.id,
          code: ic.toPlatform.level.station.code,
          name: ic.toPlatform.level.station.name,
          platformNumber: ic.toPlatform.platformNumber,
          lineCode: ic.toPlatform.line.code,
          lineName: ic.toPlatform.line.name,
          lineColor: ic.toPlatform.line.color,
        },
        walkingDistanceMeters: ic.walkingDistance,
        walkingTimeSeconds: ic.walkingTime,
        accessible: ic.accessible,
        verticalMovement: ic.verticalMovement,
      })),
    };

    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('datasets')
  @ApiOperation({
    summary: 'Discover transit datasets, versions, and data provenance',
    description: 'Returns the searchable transit data catalogue, live data lineage, licenses, feed SHA256 hashes, and Trust Tiers (A, B, C, X).',
  })
  @ApiResponse({ status: 200, description: 'Authoritative dataset catalogue and live lineage audit.' })
  async getDatasets(): Promise<unknown> {
    const cacheKey = 'transitos:v2:datasets_catalog';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    let catalog: any = { datasets: [] };
    const catalogPath = path.join(process.cwd(), 'datasets/catalog.json');
    if (fs.existsSync(catalogPath)) {
      try {
        const raw = fs.readFileSync(catalogPath, 'utf8');
        catalog = JSON.parse(raw);
      } catch (err) {
        // fallback
      }
    }

    const auditReport = await this.auditService.getAuditReport();

    const result = {
      version: catalog.version || '1.1.0',
      schemaVersion: catalog.schemaVersion || 'CTM v1.0 + TDSE v0.6.5',
      generatedAt: new Date().toISOString(),
      rolloutWaves: catalog.rolloutWaves,
      datasetsCount: catalog.datasets?.length || 0,
      datasets: catalog.datasets || [],
      liveLineage: auditReport.lineLineage,
      pedestrianNetworkAudit: auditReport.pedestrianNetwork,
      entranceSnappingAudit: auditReport.entranceSnappingAudit,
      governanceSummary: auditReport.governanceSummary,
    };

    await this.redisService.set(cacheKey, result, 600);
    return result;
  }
}
