import { Test, TestingModule } from '@nestjs/testing';
import { GraphBuilderService } from './graph-builder.service';
import { DatabaseService } from '../../../database/database.service';
import { InterchangeEvaluatorService } from '../routing/interchange-evaluator.service';
import { EdgeType } from './edge.types';

describe('GraphBuilderService - GTFS StopTimes SSOT', () => {
  let service: GraphBuilderService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      system: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sys-mumbai',
          code: 'MM',
        }),
      },
      station: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'stn-valnai',
            code: 'STN_L2A_010',
            name: 'Valnai',
            systemId: 'sys-mumbai',
            latitude: 19.198,
            longitude: 72.842,
            sequences: [{ lineId: 'line-2a' }],
          },
          {
            id: 'stn-dahanukar',
            code: 'STN_L2A_011',
            name: 'Dahanukarwadi',
            systemId: 'sys-mumbai',
            latitude: 19.205,
            longitude: 72.844,
            sequences: [{ lineId: 'line-2a' }],
          },
          {
            id: 'stn-kandivali-w',
            code: 'STN_L2A_012',
            name: 'Kandivali (West)',
            systemId: 'sys-mumbai',
            latitude: 19.213,
            longitude: 72.847,
            sequences: [{ lineId: 'line-2a' }],
          },
        ]),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      trip: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'trip-1',
            lineId: 'line-2a',
            stopTimes: [
              {
                stationId: 'stn-valnai',
                arrivalTime: '06:06:30',
                departureTime: '06:06:55',
                stopSequence: 1,
              },
              {
                stationId: 'stn-dahanukar',
                arrivalTime: '06:08:20',
                departureTime: '06:08:45',
                stopSequence: 2,
              },
              {
                stationId: 'stn-kandivali-w',
                arrivalTime: '06:10:10',
                departureTime: '06:10:10',
                stopSequence: 3,
              },
            ],
          },
        ]),
      },
      stationSequence: {
        findMany: jest.fn().mockResolvedValue([
          // Obsolete/competing StationSequence seed data that should NOT override GTFS stop_times
          {
            lineId: 'line-2a',
            stationId: 'stn-valnai',
            nextStationId: 'stn-dahanukar',
            travelTimeFromPrevious: 85,
            sequence: 1,
          },
          {
            lineId: 'line-2a',
            stationId: 'stn-dahanukar',
            nextStationId: 'stn-kandivali-w',
            travelTimeFromPrevious: 85,
            sequence: 2,
          },
        ]),
      },
      line: {
        findMany: jest.fn().mockResolvedValue([{ id: 'line-2a', code: 'L2A' }]),
      },
      platform: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphBuilderService,
        InterchangeEvaluatorService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<GraphBuilderService>(GraphBuilderService);
  });

  it('builds transit edges directly from GTFS stop_times as SSOT, preserving intermediate dwell', async () => {
    const graph = await service.build('sys-mumbai');

    expect(graph).toBeDefined();
    expect(graph.nodes.size).toBe(3);

    // Stop 1 (Valnai) -> Stop 2 (Dahanukarwadi):
    // Departure at Valnai: 06:06:55
    // Departure at Dahanukarwadi (intermediate): 06:08:45
    // Duration must be 110s (85s rolling + 25s dwell), NOT 85s
    const valnaiEdges = graph.edges.get('stn-valnai') ?? [];
    const valnaiToDahanukar = valnaiEdges.find(
      (e) => e.to === 'stn-dahanukar' && e.type === EdgeType.TRANSIT,
    );

    expect(valnaiToDahanukar).toBeDefined();
    expect(valnaiToDahanukar!.duration).toBe(110);

    // Stop 2 (Dahanukarwadi) -> Stop 3 (Kandivali West):
    // Departure at Dahanukarwadi: 06:08:45
    // Arrival at terminal Kandivali West: 06:10:10 (06:10:10 - 06:08:45 = 85s)
    const dahanukarEdges = graph.edges.get('stn-dahanukar') ?? [];
    const dahanukarToKandivali = dahanukarEdges.find(
      (e) => e.to === 'stn-kandivali-w' && e.type === EdgeType.TRANSIT,
    );

    expect(dahanukarToKandivali).toBeDefined();
    expect(dahanukarToKandivali!.duration).toBe(85);

    // Sum of both hops: 110 + 85 = 195 seconds (06:10:10 - 06:06:55 = 195s)
    const totalTransit =
      valnaiToDahanukar!.duration + dahanukarToKandivali!.duration;
    expect(totalTransit).toBe(195);
  });

  it('does not override GTFS stop_times edge weights with StationSequence.travelTimeFromPrevious', async () => {
    const graph = await service.build('sys-mumbai');

    const valnaiEdges = graph.edges.get('stn-valnai') ?? [];
    const edge = valnaiEdges.find(
      (e) => e.to === 'stn-dahanukar' && e.type === EdgeType.TRANSIT,
    );

    // Must be GTFS duration (110s), NOT StationSequence.travelTimeFromPrevious (85s)
    expect(edge!.duration).not.toBe(85);
    expect(edge!.duration).toBe(110);
  });
});
