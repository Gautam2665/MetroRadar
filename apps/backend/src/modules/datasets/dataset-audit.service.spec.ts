import { Test, TestingModule } from '@nestjs/testing';
import { DatasetAuditService } from './services/dataset-audit.service';
import { EntranceSnappingService } from './services/entrance-snapping.service';
import { DatabaseService } from '../../database/database.service';

describe('DatasetAuditService', () => {
  let service: DatasetAuditService;
  let db: any;
  let snappingService: any;

  beforeEach(async () => {
    db = {
      line: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'line-7-uuid',
            code: 'LINE_7',
            name: 'Red Line (Line 7)',
            color: '#ef4444',
            system: { name: 'Mumbai Metro', city: 'Mumbai' },
            sequences: [{}, {}, {}],
            trips: [{}, {}],
          },
          {
            id: 'line-1-uuid',
            code: 'LINE_1',
            name: 'Blue Line (Line 1)',
            color: '#3b82f6',
            system: { name: 'Mumbai Metro', city: 'Mumbai' },
            sequences: [{}, {}],
            trips: [{}, {}],
          },
        ]),
      },
      $queryRawUnsafe: jest.fn().mockImplementation((query: string) => {
        if (query.includes('total_edges')) {
          return Promise.resolve([
            {
              total_edges: 1164,
              total_length_m: 53930.5,
              fob_count: 14,
              crossing_count: 85,
            },
          ]);
        }
        if (query.includes('GROUP BY surface')) {
          return Promise.resolve([
            { surface: 'paved', count: 750 },
            { surface: 'asphalt', count: 320 },
          ]);
        }
        if (query.includes('GROUP BY highway_type')) {
          return Promise.resolve([
            { highway_type: 'footway', count: 820 },
            { highway_type: 'crossing', count: 85 },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    snappingService = {
      getSnappingStatus: jest.fn().mockResolvedValue({
        totalActiveEntrances: 430,
        snappedWithin100m: 430,
        snapSuccessRatePercent: 100.0,
        avgSnapDistanceMeters: 0,
        unsnappedEntrances: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetAuditService,
        { provide: DatabaseService, useValue: db },
        { provide: EntranceSnappingService, useValue: snappingService },
      ],
    }).compile();

    service = module.get<DatasetAuditService>(DatasetAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate transport-planning audit report with data lineage and pedestrian network stats', async () => {
    const report = await service.getAuditReport();

    expect(report).toBeDefined();
    expect(report.system.canonicalModelVersion).toBe('CTM v1.0');
    expect(report.system.overallStatus).toBe('HEALTHY');
    expect(report.system.dataCompletenessScore).toBeGreaterThanOrEqual(90);

    // Lineage verification
    expect(report.lineLineage).toHaveLength(2);
    const line7 = report.lineLineage.find((l) => l.code === 'LINE_7');
    expect(line7).toBeDefined();
    expect(line7?.lineage).toContain('Official DMRC / MMMOCL GTFS Tier A');
    expect(line7?.tier).toBe('TIER_A');

    const line1 = report.lineLineage.find((l) => l.code === 'LINE_1');
    expect(line1).toBeDefined();
    expect(line1?.lineage).toContain(
      'Synthesized MMOPL Static Timetable Tier X',
    );
    expect(line1?.tier).toBe('TIER_X');

    // Pedestrian network verification
    expect(report.pedestrianNetwork.source).toBe(
      'OpenStreetMap Pedestrian Extract (OSM 2026-Q1)',
    );
    expect(report.pedestrianNetwork.totalWalkableEdges).toBe(1164);
    expect(report.pedestrianNetwork.totalNetworkLengthKm).toBe(53.93);
    expect(report.pedestrianNetwork.traversalSpeedStandardMs).toBe(1.2);
    expect(report.pedestrianNetwork.impedanceModel).toContain('1.2 m/s');

    // Entrance snapping verification
    expect(report.entranceSnappingAudit.totalActiveEntrances).toBe(430);
    expect(report.entranceSnappingAudit.snappedWithin100m).toBe(430);
    expect(report.entranceSnappingAudit.snapSuccessRatePercent).toBe(100.0);
  });
});
