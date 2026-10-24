import { Test, TestingModule } from '@nestjs/testing';
import { IsochroneService } from './isochrone.service';
import { DatabaseService } from '../../../database/database.service';
import { NotFoundException } from '@nestjs/common';

describe('IsochroneService', () => {
  let service: IsochroneService;
  let prisma: any;

  const mockStation = {
    id: 'station-uuid-1',
    name: 'Gundavali',
    code: 'STN_L7_014',
    latitude: 19.114439,
    longitude: 72.855172,
    entrances: [
      {
        id: 'ent-1',
        name: 'Gate 1 (West Side)',
        latitude: 19.1145,
        longitude: 72.8552,
        snappedNodeId: 5000000001n,
        snapDistanceMeters: 5.2,
      },
      {
        id: 'ent-2',
        name: 'Gate 2 (East Side)',
        latitude: 19.1143,
        longitude: 72.8550,
        snappedNodeId: 5000000002n,
        snapDistanceMeters: 8.0,
      },
    ],
  };

  const mockLocalEdges = [
    {
      id: 'edge-1',
      osm_id: 1001n,
      highway_type: 'footway',
      surface: 'paving_stones',
      length_meters: 120,
      traversal_time_seconds: 100,
      from_node: '5000000001',
      to_node: '5000000002',
      is_crossing: false,
      is_elevated_fob: false,
      has_tactile_paving: true,
      lit: true,
      geojson: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [72.8551, 19.1144],
          [72.8553, 19.1146],
        ],
      }),
    },
    {
      id: 'edge-2',
      osm_id: 1002n,
      highway_type: 'footway',
      surface: 'concrete',
      length_meters: 80,
      traversal_time_seconds: 85,
      from_node: '5000000002',
      to_node: '5000000003',
      is_crossing: false,
      is_elevated_fob: true,
      has_tactile_paving: true,
      lit: true,
      geojson: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [72.8553, 19.1146],
          [72.8555, 19.1148],
        ],
      }),
    },
  ];

  beforeEach(async () => {
    prisma = {
      station: {
        findFirst: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsochroneService,
        {
          provide: DatabaseService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<IsochroneService>(IsochroneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStationCatchment', () => {
    it('should throw NotFoundException if station does not exist', async () => {
      prisma.station.findFirst.mockResolvedValue(null);

      await expect(service.getStationCatchment('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should compute catchment isochrones with valid network areas and severance ratio', async () => {
      prisma.station.findFirst.mockResolvedValue(mockStation);

      // First query is local pedestrian edges
      // Subsequent queries are PostGIS polygon unifications for 5 and 10 min
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockLocalEdges)
        .mockResolvedValueOnce([
          {
            polygon_geojson: JSON.stringify({
              type: 'MultiPolygon',
              coordinates: [],
            }),
            area_sq_km: 0.035,
          },
        ])
        .mockResolvedValueOnce([
          {
            polygon_geojson: JSON.stringify({
              type: 'MultiPolygon',
              coordinates: [],
            }),
            area_sq_km: 0.035,
          },
        ]);

      const result = await service.getStationCatchment('Gundavali', [5, 10]);

      expect(result).toBeDefined();
      expect(result.station.name).toBe('Gundavali');
      expect(result.station.activeEntrancesCount).toBe(2);
      expect(result.isochrones).toHaveLength(2);

      const iso5 = result.isochrones[0];
      expect(iso5.minutes).toBe(5);
      expect(iso5.seconds).toBe(300);
      expect(iso5.reachedEdgesCount).toBe(2);
      expect(iso5.walkableNetworkLengthKm).toBe(0.2); // 120m + 80m = 200m = 0.2km
      expect(iso5.networkAreaSqKm).toBe(0.035);
      expect(iso5.euclideanRadiusMeters).toBe(360);
      expect(iso5.severanceRatio).toBeGreaterThan(0);
      expect(iso5.polygonGeoJson).toBeDefined();
    });
  });

  describe('getPedestrianNetworkGeoJson', () => {
    it('should return a GeoJSON FeatureCollection of pedestrian edges', async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce(mockLocalEdges);

      const geojson = await service.getPedestrianNetworkGeoJson();

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(2);
      expect(geojson.metadata.totalEdges).toBe(2);
      expect(geojson.metadata.elevatedFobCount).toBe(1);
      expect(geojson.features[0].properties.highwayType).toBe('footway');
    });
  });
});
