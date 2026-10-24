import { Test, TestingModule } from '@nestjs/testing';
import { PedestrianRoutingService } from './pedestrian-routing.service';
import { DatabaseService } from '../../../database/database.service';

describe('PedestrianRoutingService', () => {
  let service: PedestrianRoutingService;
  let prisma: any;

  const mockOriginEntrance = {
    id: 'ent-dn-1',
    name: 'D. N. Nagar Gate 1 (J.P. Road - North-West Side)',
    latitude: 19.1282721,
    longitude: 72.830744,
    snappedNodeId: 1001n,
    snapDistanceMeters: 8.22,
    station: {
      id: 'stn-dn',
      name: 'D. N. Nagar',
      code: 'STN_L1_002',
    },
  };

  const mockDestEntrance = {
    id: 'ent-aw-1',
    name: 'Andheri (West) Gate 1 (New Link Road - West Side North)',
    latitude: 19.129339,
    longitude: 72.831065,
    snappedNodeId: 1003n,
    snapDistanceMeters: 5.18,
    station: {
      id: 'stn-aw',
      name: 'Andheri (West)',
      code: 'STN_L2A_017',
    },
  };

  const mockConnectedEdges = [
    {
      id: 'edge-1',
      osm_id: 1331511001n,
      from_node_id: 1001n,
      to_node_id: 1002n,
      length_meters: 43.1,
      highway_type: 'footway',
      surface: 'concrete',
      is_elevated_fob: true,
      is_crossing: false,
      has_tactile_paving: true,
      level: '1',
      source_type: 'OSM_OFFICIAL',
      geojson: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [72.8306729, 19.1283029],
          [72.83088, 19.12832],
          [72.8310809, 19.1283359],
        ],
      }),
    },
    {
      id: 'edge-2',
      osm_id: 9900000001n,
      from_node_id: 1002n,
      to_node_id: 1003n,
      length_meters: 168.0,
      highway_type: 'footway',
      surface: 'tiles',
      is_elevated_fob: true,
      is_crossing: false,
      has_tactile_paving: true,
      level: '1',
      source_type: 'PROVISIONAL_SYNTHESIZED',
      geojson: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [72.8310809, 19.1283359],
          [72.8313, 19.129],
          [72.8316696, 19.1297505],
        ],
      }),
    },
  ];

  beforeEach(async () => {
    prisma = {
      entrance: {
        findFirst: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedestrianRoutingService,
        {
          provide: DatabaseService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PedestrianRoutingService>(PedestrianRoutingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Benchmark: D.N. Nagar to Andheri West routing', () => {
    it('should calculate connected route preserving real multi-point LineString geometry and provenance', async () => {
      prisma.entrance.findFirst
        .mockResolvedValueOnce(mockOriginEntrance)
        .mockResolvedValueOnce(mockDestEntrance);

      prisma.$queryRawUnsafe.mockResolvedValueOnce(mockConnectedEdges);

      const result = await service.route(
        'D. N. Nagar Gate 1',
        'Andheri (West) Gate 1',
        { allowProvisional: true },
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.distanceMeters).toBe(211.1); // 43.1 + 168.0
      expect(result.steps).toHaveLength(2);
      expect(result.geometry).toBeDefined();
      expect(result.geometry?.coordinates).toHaveLength(5); // 3 coords + 3 coords minus 1 shared endpoint

      // Check provenance separation
      expect(result.provenance.containsProvisionalSegments).toBe(true);
      expect(result.provenance.hasOfficialOsmSegments).toBe(true);
      expect(result.provenance.sourceTypes).toContain('OSM_OFFICIAL');
      expect(result.provenance.sourceTypes).toContain(
        'PROVISIONAL_SYNTHESIZED',
      );
      expect(result.provenance.confidenceScore).toBe(0.85);

      // Check walk and transition time breakdown
      expect(result.walkDurationSeconds).toBeGreaterThan(0);
      expect(result.totalDurationSeconds).toBeGreaterThanOrEqual(
        result.walkDurationSeconds,
      );
    });

    it('should return NO_PATH_FOUND if provisional connector is disallowed and no official path connects them', async () => {
      prisma.entrance.findFirst
        .mockResolvedValueOnce(mockOriginEntrance)
        .mockResolvedValueOnce(mockDestEntrance);

      // Return only official edge 1 (terminating at node 1002, leaving node 1003 disconnected)
      prisma.$queryRawUnsafe.mockResolvedValueOnce([mockConnectedEdges[0]]);

      const result = await service.route(
        'D. N. Nagar Gate 1',
        'Andheri (West) Gate 1',
        { allowProvisional: false },
      );

      expect(result.status).toBe('NO_PATH_FOUND');
      expect(result.distanceMeters).toBe(0);
      expect(result.geometry).toBeNull();
      expect(result.steps).toHaveLength(0);
      expect(result.errorMessage).toContain('not reachable');
    });

    it('should return ENTRANCE_NOT_FOUND when unknown entrance is provided', async () => {
      prisma.entrance.findFirst.mockResolvedValueOnce(null);

      const result = await service.route(
        'NonExistentGate',
        'Andheri (West) Gate 1',
      );

      expect(result.status).toBe('ENTRANCE_NOT_FOUND');
      expect(result.geometry).toBeNull();
    });

    it('should reject private access ways and not route across unconnected 2D line crossings', async () => {
      prisma.entrance.findFirst
        .mockResolvedValueOnce(mockOriginEntrance)
        .mockResolvedValueOnce(mockDestEntrance);

      // Edge has a different disjoint node ID 9999, so topological graph has no link to 1003
      const disjointEdge = {
        ...mockConnectedEdges[1],
        from_node_id: 8888n,
        to_node_id: 1003n,
      };

      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        mockConnectedEdges[0],
        disjointEdge,
      ]);

      const result = await service.route(
        'D. N. Nagar Gate 1',
        'Andheri (West) Gate 1',
      );

      expect(result.status).toBe('NO_PATH_FOUND');
      expect(result.geometry).toBeNull();
    });
  });
});
