import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsochroneService } from '../services/isochrone.service';
import {
  PedestrianNetworkGeoJson,
  StationCatchmentResult,
} from '../interfaces/catchment.interface';

@ApiTags('Mobility Analytics & Geospatial Intelligence')
@Controller(['api/v1/analytics', 'analytics'])
export class AnalyticsController {
  constructor(private readonly isochroneService: IsochroneService) {}

  @Get('stations/:id/catchment')
  @ApiOperation({
    summary: 'Station Pedestrian Catchment & Walk Isochrones',
    description:
      'Calculates 5-minute and 10-minute pedestrian walking isochrones radiating outwards from all active snapped station entrances along the OSM pedestrian network. Computes true network catchment area, barrier severance ratio, and returns GeoJSON polygon geometry.',
  })
  @ApiParam({
    name: 'id',
    description:
      'Station UUID, code (e.g. STN_L7_014), or name (e.g. Gundavali)',
    example: 'GUNDAVALI',
  })
  @ApiQuery({
    name: 'minutes',
    required: false,
    description: 'Comma-separated time thresholds in minutes (default: 5,10)',
    example: '5,10',
  })
  @ApiResponse({
    status: 200,
    description:
      'Station pedestrian catchment polygons and reachability metrics',
  })
  async getStationCatchment(
    @Param('id') stationId: string,
    @Query('minutes') minutesQuery?: string,
  ): Promise<StationCatchmentResult> {
    const minutesList = minutesQuery
      ? minutesQuery
          .split(',')
          .map((m) => parseInt(m.trim(), 10))
          .filter((n) => !isNaN(n))
      : [5, 10];

    return this.isochroneService.getStationCatchment(stationId, minutesList);
  }

  @Get('pedestrian-network')
  @ApiOperation({
    summary: 'Walkable Pedestrian Street Network GeoJSON',
    description:
      'Returns the walkable street network, footways, FOB skywalks, and crosswalks as GeoJSON FeatureCollection for MapLibre layer rendering.',
  })
  @ApiQuery({
    name: 'bbox',
    required: false,
    description: 'Bounding box filter: minLon,minLat,maxLon,maxLat',
    example: '72.80,19.00,72.95,19.25',
  })
  @ApiResponse({
    status: 200,
    description: 'GeoJSON FeatureCollection of pedestrian street network links',
  })
  async getPedestrianNetwork(
    @Query('bbox') bbox?: string,
  ): Promise<PedestrianNetworkGeoJson> {
    return this.isochroneService.getPedestrianNetworkGeoJson(bbox);
  }
}
