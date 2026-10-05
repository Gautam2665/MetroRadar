import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RouteCandidate, JourneyLeg, TransferDetails } from './candidate.types';

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
  private icxRegistry: Record<string, any> | null = null;
  private stationCodeToComplex = new Map<string, any>();

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
          this.icxRegistry = JSON.parse(fs.readFileSync(p, 'utf8'));
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
    const preferList = (constraints.prefer || []).map((p) => p.toUpperCase());

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
    const traversedComplexes = new Set<any>();
    for (const leg of candidate.legs) {
      if (leg.type === 'WALK') {
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

    // 2. Dhaula Kuan <-> South Campus Skywalk (Delhi)
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
