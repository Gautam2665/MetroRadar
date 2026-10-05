import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RouteCandidate, TransferDetails } from './candidate.types';
import { EdgeType } from '../graph/edge.types';

interface InterchangeAttribute<T> {
  value?: T | null;
  status?: string;
}

interface InterchangeComplex {
  complexId: string;
  name: string;
  attributes?: {
    paidAreaTransfer?: InterchangeAttribute<boolean>;
    requiresSecurityRescreening?: InterchangeAttribute<boolean>;
    requiresAfcRetap?: InterchangeAttribute<boolean>;
    verticalDropMeters?: InterchangeAttribute<number>;
    outdoorStreetExposure?: InterchangeAttribute<boolean>;
    elevatorAvailability?: InterchangeAttribute<boolean>;
    suitabilityNote?: InterchangeAttribute<string>;
  };
}

interface InterchangeRegistry {
  complexes: InterchangeComplex[];
}

export interface GenericConstraints {
  mobility?: 'STANDARD' | 'REDUCED';
  luggage?: 'NONE' | 'LIGHT' | 'HEAVY';
  avoid?: string[];
  prefer?: string[];
  objective?: 'MIN_TRAVEL_TIME' | 'MIN_FRICTION' | 'BALANCED';
}

export interface InterchangeEvaluationResult {
  isFeasible: boolean;
  violations: string[];
  frictionSeconds: number;
  effectiveCostSeconds: number;
  frictionLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  reasonCodes: string[];
  humanSummary: string;
}

@Injectable()
export class InterchangeEvaluatorService {
  private readonly logger = new Logger(InterchangeEvaluatorService.name);
  private icxRegistry: InterchangeRegistry | null = null;
  private stationCodeToComplex = new Map<string, InterchangeComplex>();

  constructor() {
    this.loadRegistry();
  }

  private loadRegistry() {
    const candidatePaths = [
      path.resolve(process.cwd(), 'datasets/mumbai/network/interchange-complexes.json'),
      path.resolve(__dirname, '../../../../../../datasets/mumbai/network/interchange-complexes.json'),
      path.resolve(__dirname, '../../../../../datasets/mumbai/network/interchange-complexes.json'),
      path.resolve(__dirname, '../../../../datasets/mumbai/network/interchange-complexes.json'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const parsedRegistry: unknown = JSON.parse(
            fs.readFileSync(p, 'utf8'),
          ) as unknown;
          this.icxRegistry = parsedRegistry as InterchangeRegistry;
          this.logger.log(`Loaded Interchange Complex Registry from ${p}`);
          this.indexRegistry();
          return;
        } catch (err) {
          this.logger.error(`Failed parsing ICX registry at ${p}:`, err);
        }
      }
    }
    this.logger.warn('Interchange Complex Registry not found; running in standalone mode.');
  }

  private indexRegistry() {
    if (!this.icxRegistry?.complexes) return;

    for (const complex of this.icxRegistry.complexes) {
      // Map station codes or canonical IDs to complex
      if (complex.complexId === 'ICX-MAROL-NAKA') {
        this.stationCodeToComplex.set('STN_L1_008', complex);
        this.stationCodeToComplex.set('STN_L3_004', complex);
      } else if (complex.complexId === 'ICX-MUMBAI-CENTRAL') {
        this.stationCodeToComplex.set('STN_L3_019', complex);
      } else if (complex.complexId === 'ICX-CHURCHGATE') {
        this.stationCodeToComplex.set('STN_L3_025', complex);
      } else if (complex.complexId === 'ICX-CSMT') {
        this.stationCodeToComplex.set('STN_L3_023', complex);
      } else if (complex.complexId === 'ICX-DADAR') {
        this.stationCodeToComplex.set('STN_L3_015', complex);
      } else if (complex.complexId === 'ICX-ANDHERI') {
        this.stationCodeToComplex.set('STN_L1_004', complex);
      } else if (complex.complexId === 'ICX-GHATKOPAR') {
        this.stationCodeToComplex.set('STN_L1_012', complex);
      } else if (complex.complexId === 'ICX-DN-NAGAR') {
        this.stationCodeToComplex.set('STN_L1_002', complex);
      } else if (complex.complexId === 'ICX-WEH-GUNDAVALI') {
        this.stationCodeToComplex.set('STN_L1_005', complex);
      } else if (complex.complexId === 'ICX-BKC') {
        this.stationCodeToComplex.set('STN_L3_011', complex);
      }
    }
  }

  /**
   * Evaluates a single candidate route against physical interchange facts and generic constraints.
   */
  evaluateCandidate(
    candidate: RouteCandidate,
    constraints: GenericConstraints,
  ): InterchangeEvaluationResult {
    const isDirect = candidate.transfers === 0;
    const reasonCodes: string[] = [];
    const violations: string[] = [];
    let frictionSeconds = 0;

    const mobility = constraints.mobility || 'STANDARD';
    const luggage = constraints.luggage || 'NONE';
    const avoidList = (constraints.avoid || []).map((a) => a.toUpperCase());

    // 1. Direct route evaluation
    if (isDirect) {
      reasonCodes.push('DIRECT_METRO', 'ZERO_TRANSFERS');
      return {
        isFeasible: true,
        violations: [],
        frictionSeconds: 0,
        effectiveCostSeconds: candidate.durationSeconds,
        frictionLevel: 'MINIMAL',
        reasonCodes,
        humanSummary: 'Direct route without transfers.',
      };
    }

    // 2. Identify interchange complexes specifically for transfer legs
    const traversedComplexes = new Set<InterchangeComplex>();
    for (const leg of candidate.legs) {
      if (leg.type === EdgeType.WALK) {
        // Walk leg connecting two stations
        const fromSt = candidate.stations.find(
          (s) => s.id === leg.from || s.name === leg.fromStationName,
        );
        const toSt = candidate.stations.find(
          (s) => s.id === leg.to || s.name === leg.toStationName,
        );
        const complexFrom = fromSt
          ? this.stationCodeToComplex.get(fromSt.code)
          : null;
        const complexTo = toSt ? this.stationCodeToComplex.get(toSt.code) : null;
        if (complexFrom) traversedComplexes.add(complexFrom);
        if (complexTo) traversedComplexes.add(complexTo);
      }
    }

    // If no explicit complex was matched, assign generic low-friction transfer
    if (traversedComplexes.size === 0) {
      reasonCodes.push('STANDARD_TRANSFER');
      return {
        isFeasible: true,
        violations: [],
        frictionSeconds: 60,
        effectiveCostSeconds: candidate.durationSeconds + 60,
        frictionLevel: 'LOW',
        reasonCodes,
        humanSummary: 'Standard metro transfer between lines.',
      };
    }

    let summaryParts: string[] = [];

    // 3. Evaluate physical facts per traversed complex
    for (const complex of traversedComplexes) {
      const attrs = complex.attributes || {};
      const paidArea = attrs.paidAreaTransfer?.value ?? false;
      const requiresSecurity = attrs.requiresSecurityRescreening?.value ?? true;
      const requiresAfc = attrs.requiresAfcRetap?.value ?? true;
      const verticalDrop = attrs.verticalDropMeters?.value ?? 0;
      const outdoorStreet = attrs.outdoorStreetExposure?.value ?? false;
      const elevatorStatus = attrs.elevatorAvailability?.status ?? 'UNKNOWN';
      const suitability = attrs.suitabilityNote?.value ?? '';

      // Check Hard Constraints for Reduced Mobility
      if (mobility === 'REDUCED') {
        if (outdoorStreet) {
          violations.push(`Outdoor street transfer at ${complex.name} is inaccessible for reduced mobility.`);
        }
        if (elevatorStatus !== 'VERIFIED_ELEVATOR') {
          violations.push(`Unverified elevator status at ${complex.name}.`);
        }
      }

      // Check user avoid preferences
      if (avoidList.includes('OUTDOOR_STREET_WALK') && outdoorStreet) {
        violations.push(`Route includes outdoor street walk at ${complex.name}.`);
      }
      if (avoidList.includes('STREET_MARKET') && suitability.includes('STREET_MARKET')) {
        violations.push(`Route passes through congested street market at ${complex.name}.`);
      }
      if (avoidList.includes('AFC_EXIT') && !paidArea) {
        violations.push(`Transfer requires exiting paid area at ${complex.name}.`);
      }

      // Dynamic Policy Friction Computation (derived from physical facts)
      if (luggage === 'HEAVY') {
        if (outdoorStreet) {
          frictionSeconds += 600; // +10m drag penalty
          reasonCodes.push('OUTDOOR_STREET_WALK');
        }
        if (requiresSecurity) {
          frictionSeconds += 300; // +5m bag scanning queue
          reasonCodes.push('SECURITY_RESCREENING');
        }
        if (requiresAfc) {
          frictionSeconds += 60; // +1m turnstile bag maneuver
          reasonCodes.push('AFC_RETAP');
        }
        if (verticalDrop > 10) {
          frictionSeconds += Math.round(verticalDrop * 10); // 10s per vertical meter
          reasonCodes.push('HEAVY_VERTICAL_MOVEMENT');
        }
      }

      // Specific ground-truth physical summaries per complex
      if (complex.complexId === 'ICX-MAROL-NAKA') {
          reasonCodes.push('OUT_OF_STATION_TRANSFER', 'AFC_RETAP', 'SECURITY_RESCREENING', 'OUTDOOR_STREET_WALK');
          summaryParts.push(
            'Marol Naka: Unpaid street-level transfer. Exit AFC gates, walk 155m along Andheri-Kurla Road, re-clear security screening and tap in to connecting line (elevated L1 ⇄ underground L3).'
          );
        } else if (complex.complexId === 'ICX-MUMBAI-CENTRAL') {
          reasonCodes.push('IDEAL_FOR_LUGGAGE', 'FLAT_FORECOURT', 'LIFT_VERIFIED');
          summaryParts.push(
            'Mumbai Central: Direct vertical access via lifts/escalators and a 100m flat forecourt walk to Western Railway station entrance. Step-free and ideal for luggage.'
          );
        } else if (complex.complexId === 'ICX-CHURCHGATE') {
          reasonCodes.push('PEDESTRIAN_WALK');
          summaryParts.push(
            'Churchgate: Direct pedestrian connection via footpath (~150m) to Western Railway suburban terminus.'
          );
        } else if (complex.complexId === 'ICX-CSMT') {
          reasonCodes.push('SUBWAY_CONNECTION', 'WEATHER_PROTECTED');
          summaryParts.push(
            'CSMT: Direct subway connection linking Metro Line 3 to Central Railway Terminus & BMC subway network.'
          );
        } else if (complex.complexId === 'ICX-DADAR') {
          reasonCodes.push('STREET_MARKET_WALK', 'HIGH_CROWD');
          summaryParts.push(
            'Dadar: 600m-700m connection through congested street market; heavy pedestrian density.'
          );
        } else if (complex.complexId === 'ICX-ANDHERI') {
          reasonCodes.push('FOB_CONNECTION');
          summaryParts.push(
            'Andheri: Direct skywalk & foot overbridge connection between Metro Line 1 and Suburban Railway.'
          );
        } else if (complex.complexId === 'ICX-GHATKOPAR') {
          reasonCodes.push('ELEVATED_FOB');
          summaryParts.push(
            'Ghatkopar: Direct elevated concourse foot overbridge linking Line 1 to Central Railway platforms.'
          );
        } else if (suitability === 'IDEAL_FOR_LUGGAGE') {
          reasonCodes.push('IDEAL_FOR_LUGGAGE', 'FLAT_FORECOURT');
          summaryParts.push(`${complex.name}: Easy transfer with direct lifts/escalators and flat forecourt connection.`);
        } else if (outdoorStreet && requiresSecurity) {
          reasonCodes.push('OUTDOOR_STREET_WALK', 'SECURITY_RESCREENING');
          summaryParts.push(`${complex.name}: Outdoor transfer requiring street walk and secondary security check.`);
        } else if (paidArea) {
          reasonCodes.push('PAID_AREA_TRANSFER');
          summaryParts.push(`${complex.name}: Paid-to-paid concourse connection.`);
        } else {
          reasonCodes.push('OUT_OF_STATION_TRANSFER');
          summaryParts.push(`${complex.name}: Street-level transfer connection requiring AFC tap-out and re-entry.`);
        }

      if (elevatorStatus === 'VERIFIED_ELEVATOR') {
        reasonCodes.push('LIFT_VERIFIED');
      }
    }

    // Determine friction level
    let frictionLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MINIMAL';
    if (frictionSeconds > 900) frictionLevel = 'CRITICAL';
    else if (frictionSeconds > 500) frictionLevel = 'HIGH';
    else if (frictionSeconds > 200) frictionLevel = 'MODERATE';
    else if (frictionSeconds > 0) frictionLevel = 'LOW';

    const isFeasible = violations.length === 0;
    const humanSummary = summaryParts.length > 0 ? summaryParts.join(' ') : 'Standard transfer between lines.';

    return {
      isFeasible,
      violations,
      frictionSeconds,
      effectiveCostSeconds: candidate.durationSeconds + frictionSeconds,
      frictionLevel,
      reasonCodes: [...new Set(reasonCodes)],
      humanSummary,
    };
  }

  /**
   * Deterministically resolves transfer details, pathway meters, and durations for an interchange leg.
   */
  resolveTransferDetails(
    fromStationCodeOrName: string,
    toStationCodeOrName: string,
    prevLineName?: string | null,
    nextLineName?: string | null,
  ): TransferDetails | null {
    const fromU = (fromStationCodeOrName || '').toUpperCase();
    const toU = (toStationCodeOrName || '').toUpperCase();
    const prevU = (prevLineName || '').toUpperCase();
    const nextU = (nextLineName || '').toUpperCase();

    // 1. Marol Naka (L3 <-> L1)
    if (fromU.includes('MAROL') && toU.includes('MAROL')) {
      const toL1 =
        nextU.includes('LINE 1') ||
        nextU.includes('BLUE') ||
        prevU.includes('LINE 3') ||
        prevU.includes('AQUA');

      return {
        complexId: 'ICX-MAROL-NAKA',
        name: 'Marol Naka Interchange Hub',
        pathwayDistanceMeters: 155,
        estimatedDurationSeconds: 450,
        durationDisplay: '~7–8 min',
        components: {
          verticalEgressSeconds: 120,
          afcExitSeconds: 30,
          streetWalkSeconds: 120,
          securityScreeningSeconds: 120,
          afcEntrySeconds: 30,
          platformAscentSeconds: 30,
        },
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: true,
          outdoorStreetExposure: true,
          verticalDropMeters: 31.5,
        },
        reasonCodes: [
          'UNPAID_TRANSFER',
          'SECURITY_RESCREEN_REQUIRED',
          'OUTDOOR_STREET_WALK',
          'VERTICAL_DROP_31M',
        ],
        instructions: toL1
          ? [
              'Exit Line 3 Gate A1/B1 to street level',
              'Walk 155m via Andheri-Kurla Road sidewalk',
              'Enter Line 1 Concourse · Clear security screening',
              'Tap in through MMOPL AFC gates & ascend to Platform 2 (Versova)',
            ]
          : [
              'Tap out of Line 1 Concourse & descend to street level',
              'Walk 155m via Andheri-Kurla Road sidewalk',
              'Enter Line 3 Concourse via Gate A1/B1 · Clear security screening',
              'Tap in through MMRCL AFC gates & descend to Aqua Line platform',
            ],
      };
    }

    // 2. Western Express Highway <-> Gundavali (L1 <-> L7)
    if (
      (fromU.includes('GUNDAVALI') && toU.includes('WESTERN EXPRESS')) ||
      (fromU.includes('WESTERN EXPRESS') && toU.includes('GUNDAVALI'))
    ) {
      const toL7 = nextU.includes('LINE 7') || nextU.includes('RED') || fromU.includes('WESTERN');
      return {
        complexId: 'ICX-WEH-GUNDAVALI',
        name: 'Western Express Highway – Gundavali Interchange Hub',
        pathwayDistanceMeters: null, // Full platform-to-platform distance unmeasured; do not guess
        estimatedDurationSeconds: 240,
        durationDisplay: '~4 min',
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: true,
          outdoorStreetExposure: false,
          verticalDropMeters: 0,
        },
        pathway: [
          {
            segmentId: 'SEG_WEH_L7_PF_TO_CONCOURSE',
            from: 'L7_PLATFORM',
            to: 'L7_CONCOURSE',
            type: 'VERTICAL',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_WEH_L7_CONCOURSE_TO_FOB',
            from: 'L7_CONCOURSE',
            to: 'FOB',
            type: 'PEDESTRIAN',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_WEH_FOB_SPAN',
            from: 'FOB',
            to: 'L1_CONCOURSE',
            type: 'FOB',
            structureLengthMeters: 58,
            sourceState: 'KNOWN_FROM_ENGINEERING',
          },
          {
            segmentId: 'SEG_WEH_L1_CONCOURSE_TO_PF',
            from: 'L1_CONCOURSE',
            to: 'L1_PLATFORM',
            type: 'VERTICAL',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
        ],
        reasonCodes: ['ELEVATED_FOB', 'HIGHWAY_CROSSING_COVERED', 'AFC_RETAP_REQUIRED'],
        instructions: toL7
          ? [
              'Exit Line 1 WEH Concourse to elevated Foot Over Bridge',
              'Cross Western Express Highway via 58m covered FOB span',
              'Enter Line 7 Gundavali Concourse · Tap in through MMMOCL AFC gates',
            ]
          : [
              'Exit Line 7 Gundavali Concourse to elevated Foot Over Bridge',
              'Cross Western Express Highway via 58m covered FOB span',
              'Enter Line 1 WEH Concourse · Tap in through MMOPL AFC gates',
            ],
      };
    }

    // 3. D.N. Nagar <-> Andheri (West) (L1 <-> L2A)
    if (
      (fromU.includes('D. N. NAGAR') && toU.includes('ANDHERI (WEST)')) ||
      (fromU.includes('ANDHERI (WEST)') && toU.includes('D. N. NAGAR')) ||
      (fromU.includes('DN NAGAR') && toU.includes('ANDHERI WEST'))
    ) {
      const toL2A = nextU.includes('LINE 2A') || nextU.includes('YELLOW') || fromU.includes('NAGAR');
      return {
        complexId: 'ICX-DN-NAGAR',
        name: 'D.N. Nagar – Andheri West Interchange Hub',
        pathwayDistanceMeters: null,
        estimatedDurationSeconds: 180,
        durationDisplay: '~3 min',
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: true,
          outdoorStreetExposure: false,
          verticalDropMeters: 0,
        },
        pathway: [
          {
            segmentId: 'SEG_DNN_L2A_PF_TO_CONCOURSE',
            from: 'L2A_PLATFORM',
            to: 'L2A_CONCOURSE',
            type: 'VERTICAL',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_DNN_L2A_CONCOURSE_TO_FOB',
            from: 'L2A_CONCOURSE',
            to: 'FOB',
            type: 'PEDESTRIAN',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_DNN_FOB_SPAN',
            from: 'FOB',
            to: 'L1_CONCOURSE',
            type: 'FOB',
            structureLengthMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_DNN_L1_CONCOURSE_TO_PF',
            from: 'L1_CONCOURSE',
            to: 'L1_PLATFORM',
            type: 'VERTICAL',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
        ],
        reasonCodes: ['ELEVATED_CONNECTOR', 'COVERED_BRIDGE', 'AFC_RETAP_REQUIRED'],
        instructions: toL2A
          ? [
              'Exit Line 1 D.N. Nagar concourse towards elevated connector',
              'Proceed along covered bridge to Line 2A Andheri West concourse',
              'Tap in through MMMOCL AFC gates & ascend to Platform 2',
            ]
          : [
              'Exit Line 2A Andheri West concourse towards elevated connector',
              'Proceed along covered bridge to Line 1 D.N. Nagar concourse',
              'Tap in through MMOPL AFC gates & ascend to Line 1 platform',
            ],
      };
    }

    // 4. Dahisar (East) Cross-Concourse (L2A <-> L7)
    if (
      fromU.includes('DAHISAR') &&
      toU.includes('DAHISAR') &&
      (prevU.includes('2A') || prevU.includes('7') || nextU.includes('2A') || nextU.includes('7'))
    ) {
      const toL7 = nextU.includes('7') || nextU.includes('RED');
      return {
        complexId: 'ICX-DAHISAR-EAST',
        name: 'Dahisar East Junction Hub',
        pathwayDistanceMeters: null,
        estimatedDurationSeconds: 120,
        durationDisplay: '~2 min',
        attributes: {
          paidAreaTransfer: true,
          requiresAfcRetap: false,
          requiresSecurityRescreening: false,
          outdoorStreetExposure: false,
          verticalDropMeters: 0,
        },
        pathway: [
          {
            segmentId: 'SEG_DAH_PF_TO_CONCOURSE',
            from: 'PLATFORM',
            to: 'UNIFIED_CONCOURSE',
            type: 'VERTICAL',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_DAH_CROSS_CONCOURSE',
            from: 'UNIFIED_CONCOURSE',
            to: 'UNIFIED_CONCOURSE',
            type: 'PEDESTRIAN',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
          {
            segmentId: 'SEG_DAH_CONCOURSE_TO_PF',
            from: 'UNIFIED_CONCOURSE',
            to: 'CONNECTING_PLATFORM',
            type: 'VERTICAL',
            distanceMeters: null,
            sourceState: 'UNKNOWN_SOURCE_REQUIRED',
          },
        ],
        reasonCodes: ['PAID_CROSS_CONCOURSE', 'SAME_OPERATOR_MMMOCL', 'NO_AFC_RETAP'],
        instructions: [
          'Cross unified concourse hall between Line 2A and Line 7',
          'Paid-area seamless transfer · No AFC retap required',
          toL7 ? 'Ascend to Line 7 Platform 1 (Gundavali)' : 'Ascend to Line 2A Platform 1 (Andheri West)',
        ],
      };
    }

    // 5. Dhaula Kuan <-> South Campus Skywalk (Delhi)
    if (
      (fromU.includes('DHAULA') && toU.includes('SOUTH CAMPUS')) ||
      (fromU.includes('SOUTH CAMPUS') && toU.includes('DHAULA'))
    ) {
      const toPink = nextU.includes('PINK') || fromU.includes('DHAULA');
      return {
        complexId: 'ICX-DHAULA-KUAN-SOUTH-CAMPUS',
        name: 'Dhaula Kuan – South Campus Skywalk',
        pathwayDistanceMeters: 755,
        estimatedDurationSeconds: 480,
        durationDisplay: '~8 min',
        components: {
          verticalEgressSeconds: 60,
          afcExitSeconds: 30,
          streetWalkSeconds: 330,
          securityScreeningSeconds: 0,
          afcEntrySeconds: 30,
          platformAscentSeconds: 30,
        },
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: false,
          outdoorStreetExposure: false,
          verticalDropMeters: 0,
        },
        reasonCodes: ['ELEVATED_SKYWALK', 'TRAVELATOR_AVAILABLE'],
        instructions: [
          'Follow Skywalk / Travelator to ' + (toPink ? 'Pink Line (755m)' : 'Airport Express (755m)'),
          'Tap in at ' + (toPink ? 'Durgabai Deshmukh South Campus Concourse' : 'Dhaula Kuan Concourse'),
        ],
      };
    }

    // 3. CSMT
    if (fromU.includes('CSMT') || toU.includes('CSMT')) {
      return {
        complexId: 'ICX-CSMT',
        name: 'Chhatrapati Shivaji Maharaj Terminus Hub',
        pathwayDistanceMeters: 180,
        estimatedDurationSeconds: 240,
        durationDisplay: '~4 min',
        components: {
          verticalEgressSeconds: 60,
          afcExitSeconds: 30,
          streetWalkSeconds: 90,
          securityScreeningSeconds: 30,
          afcEntrySeconds: 30,
          platformAscentSeconds: 0,
        },
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: true,
          outdoorStreetExposure: false,
          verticalDropMeters: 15.0,
        },
        reasonCodes: ['SUBWAY_CONNECTION', 'WEATHER_PROTECTED'],
        instructions: [
          'Direct underground BMC subway connection',
          'Direct access to CSMT Railway platforms',
        ],
      };
    }

    // 4. Mumbai Central
    if (fromU.includes('MUMBAI CENTRAL') || toU.includes('MUMBAI CENTRAL')) {
      return {
        complexId: 'ICX-MUMBAI-CENTRAL',
        name: 'Mumbai Central Interchange Hub',
        pathwayDistanceMeters: 100,
        estimatedDurationSeconds: 180,
        durationDisplay: '~3 min',
        components: {
          verticalEgressSeconds: 60,
          afcExitSeconds: 30,
          streetWalkSeconds: 60,
          securityScreeningSeconds: 30,
          afcEntrySeconds: 0,
          platformAscentSeconds: 0,
        },
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: true,
          outdoorStreetExposure: true,
          verticalDropMeters: 16.5,
        },
        reasonCodes: ['IDEAL_FOR_LUGGAGE', 'FLAT_FORECOURT', 'LIFT_VERIFIED'],
        instructions: [
          'Direct lift/escalator access to station forecourt (100m walk)',
          'Enter Western Railway main concourse',
        ],
      };
    }

    // 5. Churchgate
    if (fromU.includes('CHURCHGATE') || toU.includes('CHURCHGATE')) {
      return {
        complexId: 'ICX-CHURCHGATE',
        name: 'Churchgate Interchange Hub',
        pathwayDistanceMeters: 150,
        estimatedDurationSeconds: 240,
        durationDisplay: '~4 min',
        components: {
          verticalEgressSeconds: 60,
          afcExitSeconds: 30,
          streetWalkSeconds: 120,
          securityScreeningSeconds: 30,
          afcEntrySeconds: 0,
          platformAscentSeconds: 0,
        },
        attributes: {
          paidAreaTransfer: false,
          requiresAfcRetap: true,
          requiresSecurityRescreening: true,
          outdoorStreetExposure: true,
          verticalDropMeters: 18.0,
        },
        reasonCodes: ['PEDESTRIAN_WALK'],
        instructions: [
          'Exit station · Walk 150m along pedestrian walkway',
          'Enter Churchgate Railway Station',
        ],
      };
    }

    return null;
  }
}
