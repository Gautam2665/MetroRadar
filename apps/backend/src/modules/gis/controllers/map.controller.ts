import {
  Controller,
  Get,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GeojsonService } from '../services/geojson.service';
import { SearchService } from '../services/search.service';
import { RedisService } from '../../../redis/redis.service';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(
    private readonly geojsonService: GeojsonService,
    private readonly searchService: SearchService,
    private readonly redisService: RedisService,
  ) {}

  @Get('layers')
  @ApiOperation({ summary: 'Get dynamic GIS map layers configurations' })
  getLayers(): unknown {
    return this.geojsonService.getLayerRegistry();
  }

  @Get('systems')
  @ApiOperation({ summary: 'Get systems GeoJSON Features' })
  async getSystems(): Promise<unknown> {
    const cacheKey = 'geojson:systems:v9';
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.geojsonService.getSystemsGeoJson();
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('lines')
  @ApiOperation({
    summary: 'Get lines GeoJSON Features (reconstructed polylines)',
  })
  async getLines(): Promise<unknown> {
    const cacheKey = 'geojson:lines:v16';
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.geojsonService.getLinesGeoJson();
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('stations')
  @ApiOperation({ summary: 'Get active stations GeoJSON Features' })
  async getStations(): Promise<unknown> {
    const cacheKey = 'geojson:stations:v30';
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.geojsonService.getStationsGeoJson();
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('stations/:id')
  @ApiOperation({ summary: 'Get single station GeoJSON Feature' })
  @ApiParam({ name: 'id', type: String, description: 'Station UUID' })
  async getStation(@Param('id') id: string): Promise<unknown> {
    const cacheKey = `geojson:station:v9:${id}`;
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.geojsonService.getStationFeature(id);
    if (!result) throw new BadRequestException(`Station ID ${id} not found`);
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('stations/:id/indoor')
  @ApiOperation({
    summary:
      'Get station indoor features (levels, platforms, entrances) GeoJSON',
  })
  @ApiParam({ name: 'id', type: String, description: 'Station UUID or Code' })
  @ApiQuery({
    name: 'level',
    type: String,
    required: false,
    description: 'Floor level (G, L1, L2)',
  })
  async getStationIndoor(
    @Param('id') id: string,
    @Query('level') level?: string,
  ): Promise<unknown> {
    return this.geojsonService.getStationIndoorGeoJson(id, level);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search systems, lines, operators, and stations' })
  @ApiQuery({ name: 'q', type: String, description: 'Text query' })
  @ApiQuery({
    name: 'type',
    type: String,
    required: false,
    description: 'Filters (e.g. station,line,system)',
  })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
  ): Promise<unknown> {
    if (!q) throw new BadRequestException('Query parameter q is required');
    const filterTypes = type ? type.split(',') : undefined;

    const cacheKey = `search:v20:${q}:${type || 'all'}`;
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.searchService.search(q, filterTypes);
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Query entities within a PostGIS geography radius' })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitude coordinate' })
  @ApiQuery({ name: 'lon', type: Number, description: 'Longitude coordinate' })
  @ApiQuery({
    name: 'radius',
    type: Number,
    required: false,
    description: 'Search radius in meters (default 1000m)',
  })
  @ApiQuery({
    name: 'types',
    type: String,
    required: false,
    description: 'Filter entities (e.g. station,entrance)',
  })
  async nearby(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('radius') radiusStr?: string,
    @Query('types') typesStr?: string,
  ): Promise<unknown> {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const radius = radiusStr ? parseFloat(radiusStr) : 1000;
    const types = typesStr ? typesStr.split(',') : [];

    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException(
        'Query parameters lat and lon must be valid numbers',
      );
    }

    const cacheKey = `nearby:${lat}:${lon}:${radius}:${typesStr || 'all'}`;
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.searchService.getNearbyEntities(
      lat,
      lon,
      radius,
      types,
    );
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }
}
