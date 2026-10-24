import { Test, TestingModule } from '@nestjs/testing';
import { JourneyService } from './journey.service';
import { DatabaseService } from '../../../database/database.service';
import { GraphProviderService } from '../graph/graph-provider.service';
import { RoutingService } from './routing.service';
import { ScoringService } from './scoring.service';
import { CandidateFilterService } from './candidate-filter.service';
import { InterchangeEvaluatorService } from './interchange-evaluator.service';
import { RealtimePredictionService } from '../../realtime/services/realtime-prediction.service';
import { PedestrianRoutingService } from '../../analytics/services/pedestrian-routing.service';
import { EdgeType } from '../graph/edge.types';
import { JourneyLeg } from './candidate.types';

describe('JourneyService - Pedestrian Transfer Integration (Phase 5)', () => {
  let service: JourneyService;
  let db: any;
  let pedestrianRouting: any;
  let interchangeEvaluator: any;

  const mockPedRouteResult = {
    status: 'SUCCESS',
    distanceMeters: 232.7,
    walkDurationSeconds: 194,
    transitionDurationSeconds: 0,
    totalDurationSeconds: 194,
    geometry: {
      type: 'LineString',
      coordinates: [
        [72.8306729, 19.1283029],
        [72.83088, 19.12832],
        [72.8310809, 19.1283359],
        [72.8313, 19.129],
        [72.8316696, 19.1297505],
        [72.831371, 19.1299161],
      ],
    },
    steps: [
      {
        instruction: 'Cross elevated footbridge (54m, Level 1)',
        distanceMeters: 54.3,
        durationSeconds: 45,
        highwayType: 'footway',
        isElevatedFob: true,
        sourceType: 'OSM_OFFICIAL',
      },
      {
        instruction: 'Cross elevated footbridge (178m, Level 1)',
        distanceMeters: 178.4,
        durationSeconds: 149,
        highwayType: 'footway',
        isElevatedFob: true,
        sourceType: 'PROVISIONAL_SYNTHESIZED',
      },
    ],
    provenance: {
      sourceTypes: ['OSM_OFFICIAL', 'PROVISIONAL_SYNTHESIZED'],
      confidenceScore: 0.85,
      containsProvisionalSegments: true,
      hasOfficialOsmSegments: true,
      notes: ['Test provenance'],
      validationDate: '2026-10-24T00:00:00Z',
    },
  };

  beforeEach(async () => {
    db = {
      station: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      line: { findMany: jest.fn().mockResolvedValue([]) },
    };

    pedestrianRouting = {
      route: jest.fn(),
    };

    interchangeEvaluator = {
      resolveTransferDetails: jest.fn().mockReturnValue({
        complexId: 'ICX-GENERIC',
        name: 'Generic Transfer',
        pathwayDistanceMeters: 150,
        estimatedDurationSeconds: 180,
        durationDisplay: '~3 min',
        attributes: {},
        instructions: ['Follow concourse signs'],
        reasonCodes: ['DEFAULT_INTERCHANGE'],
      }),
      isThroughRunningTransition: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        { provide: DatabaseService, useValue: db },
        { provide: GraphProviderService, useValue: { getGraph: jest.fn() } },
        {
          provide: RoutingService,
          useValue: { findKShortestPaths: jest.fn() },
        },
        {
          provide: ScoringService,
          useValue: {
            score: jest.fn(),
            computeAttributes: jest.fn(),
            computeTradeoffs: jest.fn(),
            rankScore: jest.fn(),
          },
        },
        { provide: CandidateFilterService, useValue: { filter: jest.fn() } },
        {
          provide: InterchangeEvaluatorService,
          useValue: interchangeEvaluator,
        },
        {
          provide: RealtimePredictionService,
          useValue: {
            predictTransitDeparture: jest.fn().mockResolvedValue({
              actualDepartureSecs: 3600,
              realtimeEtaMins: 2,
              realtimeTimeStr: '12:00 PM',
              delaySeconds: 0,
            }),
            predictJourneyTrains: jest.fn().mockResolvedValue({}),
          },
        },
        { provide: PedestrianRoutingService, useValue: pedestrianRouting },
      ],
    }).compile();

    service = module.get<JourneyService>(JourneyService);
  });

  describe('D.N. Nagar <-> Andheri West Transfer Enrichment', () => {
    it('should use PedestrianRoutingService with explicit gate IDs for D.N. Nagar -> Andheri West', async () => {
      pedestrianRouting.route.mockResolvedValueOnce(mockPedRouteResult);

      const leg: JourneyLeg = {
        mode: 'TRANSFER',
        type: EdgeType.WALK,
        from: 'stn-dn-nagar',
        fromStationName: 'D. N. Nagar',
        fromStation: {
          id: 'stn-dn-nagar',
          code: 'STN_L1_002',
          name: 'D. N. Nagar',
          lat: 19.128,
          lng: 72.83,
        },
        to: 'stn-andheri-west',
        toStationName: 'Andheri (West)',
        toStation: {
          id: 'stn-andheri-west',
          code: 'STN_L2A_017',
          name: 'Andheri (West)',
          lat: 19.129,
          lng: 72.831,
        },
        duration: 180,
        durationSeconds: 180,
        durationMinutes: 3,
        lineId: null,
        lineName: null,
        lineColor: null,
        lineCode: null,
        hopCount: 1,
        visitedStationCount: 2,
        stationsCount: 1,
        stopsCount: 1,
        stopsText: 'Transfer',
      };

      await (service as any).enrichTransferLeg(leg, null, null);

      // Verify explicit gate IDs were queried
      expect(pedestrianRouting.route).toHaveBeenCalledWith(
        '356a0950-2469-488b-bf25-1af60ff7a854', // DN Nagar Gate 1
        '90e8b743-611a-43bc-be89-9927a23ef2a8', // Andheri West Gate 1
        { allowProvisional: true },
      );

      // Verify duration and distance updated from pedestrian router
      expect(leg.distanceMeters).toBe(233);
      expect(leg.durationSeconds).toBe(194);
      expect(leg.durationMinutes).toBe(3);

      // Verify provisional labeling is transparent
      expect(leg.transferTitle).toContain('(Provisional connector)');
      expect(leg.transferSummary).toContain('(Provisional connector)');
      expect(leg.transferInstructions?.[1]).toContain(
        '(Provisional skywalk connection - estimated transfer)',
      );
      expect(leg.transferDetails?.reasonCodes).toContain(
        'PROVISIONAL_CONNECTOR',
      );
      expect(leg.transferDetails?.reasonCodes).toContain(
        'VALIDATED_PEDESTRIAN_GRAPH',
      );

      // Verify rich geometry attached for map rendering
      expect(
        leg.transferDetails?.pedestrianRoute?.geometry?.coordinates,
      ).toHaveLength(6);
    });

    it('should use PedestrianRoutingService for reverse direction Andheri West -> D.N. Nagar', async () => {
      pedestrianRouting.route.mockResolvedValueOnce(mockPedRouteResult);

      const leg: JourneyLeg = {
        mode: 'TRANSFER',
        type: EdgeType.WALK,
        from: 'stn-andheri-west',
        fromStationName: 'Andheri (West)',
        fromStation: {
          id: 'stn-andheri-west',
          code: 'STN_L2A_017',
          name: 'Andheri (West)',
          lat: 19.129,
          lng: 72.831,
        },
        to: 'stn-dn-nagar',
        toStationName: 'D. N. Nagar',
        toStation: {
          id: 'stn-dn-nagar',
          code: 'STN_L1_002',
          name: 'D. N. Nagar',
          lat: 19.128,
          lng: 72.83,
        },
        duration: 180,
        durationSeconds: 180,
        durationMinutes: 3,
        lineId: null,
        lineName: null,
        lineColor: null,
        lineCode: null,
        hopCount: 1,
        visitedStationCount: 2,
        stationsCount: 1,
        stopsCount: 1,
        stopsText: 'Transfer',
      };

      await (service as any).enrichTransferLeg(leg, null, null);

      expect(pedestrianRouting.route).toHaveBeenCalledWith(
        '90e8b743-611a-43bc-be89-9927a23ef2a8', // Andheri West Gate 1
        '356a0950-2469-488b-bf25-1af60ff7a854', // DN Nagar Gate 1
        { allowProvisional: true },
      );
      expect(leg.distanceMeters).toBe(233);
      expect(leg.durationSeconds).toBe(194);
    });

    it('should preserve existing behavior for other interchanges without invoking pedestrian router', async () => {
      const leg: JourneyLeg = {
        mode: 'TRANSFER',
        type: EdgeType.WALK,
        from: 'stn-weh',
        fromStationName: 'Western Express Highway',
        fromStation: {
          id: 'stn-weh',
          code: 'STN_L1_005',
          name: 'Western Express Highway',
          lat: 19.115,
          lng: 72.856,
        },
        to: 'stn-gundavali',
        toStationName: 'Gundavali',
        toStation: {
          id: 'stn-gundavali',
          code: 'STN_L7_014',
          name: 'Gundavali',
          lat: 19.116,
          lng: 72.857,
        },
        duration: 180,
        durationSeconds: 180,
        durationMinutes: 3,
        lineId: null,
        lineName: null,
        lineColor: null,
        lineCode: null,
        hopCount: 1,
        visitedStationCount: 2,
        stationsCount: 1,
        stopsCount: 1,
        stopsText: 'Transfer',
      };

      await (service as any).enrichTransferLeg(leg, null, null);

      // Must NOT invoke pedestrian router for other interchanges
      expect(pedestrianRouting.route).not.toHaveBeenCalled();

      // Must use standard InterchangeEvaluator details
      expect(interchangeEvaluator.resolveTransferDetails).toHaveBeenCalled();
      expect(leg.transferTitle).toBe('Generic Transfer');
    });

    it('should fall back gracefully with clear estimation label when pedestrian route is not found', async () => {
      pedestrianRouting.route.mockResolvedValueOnce({
        status: 'NO_PATH_FOUND',
        distanceMeters: 0,
        walkDurationSeconds: 0,
        transitionDurationSeconds: 0,
        totalDurationSeconds: 0,
        geometry: null,
        steps: [],
        provenance: {
          sourceTypes: [],
          confidenceScore: 0,
          containsProvisionalSegments: false,
          hasOfficialOsmSegments: false,
          notes: [],
          validationDate: '',
        },
      });

      const leg: JourneyLeg = {
        mode: 'TRANSFER',
        type: EdgeType.WALK,
        from: 'stn-dn-nagar',
        fromStationName: 'D. N. Nagar',
        fromStation: {
          id: 'stn-dn-nagar',
          code: 'STN_L1_002',
          name: 'D. N. Nagar',
          lat: 19.128,
          lng: 72.83,
        },
        to: 'stn-andheri-west',
        toStationName: 'Andheri (West)',
        toStation: {
          id: 'stn-andheri-west',
          code: 'STN_L2A_017',
          name: 'Andheri (West)',
          lat: 19.129,
          lng: 72.831,
        },
        duration: 180,
        durationSeconds: 180,
        durationMinutes: 3,
        lineId: null,
        lineName: null,
        lineColor: null,
        lineCode: null,
        hopCount: 1,
        visitedStationCount: 2,
        stationsCount: 1,
        stopsCount: 1,
        stopsText: 'Transfer',
      };

      await (service as any).enrichTransferLeg(leg, null, null);

      // Falls back to evaluator
      expect(interchangeEvaluator.resolveTransferDetails).toHaveBeenCalled();
      // Explicitly labels fallback as estimated
      expect(leg.transferSummary).toContain('(Estimated transfer)');
      expect(leg.transferInstructions).toContainEqual(
        expect.stringContaining(
          '[Estimated Transfer] Precise walking route unavailable',
        ),
      );
    });
  });
});
