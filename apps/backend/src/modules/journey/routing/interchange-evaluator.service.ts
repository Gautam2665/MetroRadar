import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RouteCandidate, JourneyLeg } from './candidate.types';

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
        if (suitability === 'IDEAL_FOR_LUGGAGE') {
          reasonCodes.push('IDEAL_FOR_LUGGAGE', 'FLAT_FORECOURT');
          summaryParts.push(`${complex.name}: Easy transfer with direct lifts/escalators and flat forecourt connection.`);
        } else if (outdoorStreet && requiresSecurity) {
          summaryParts.push(`${complex.name}: Outdoor transfer requiring street walk and secondary security check.`);
        }
      } else {
        // Standard commuter: minimal policy friction, relies purely on nominal walk time
        if (paidArea) {
          reasonCodes.push('PAID_AREA_TRANSFER');
          summaryParts.push(`${complex.name}: Paid-to-paid concourse connection.`);
        } else {
          reasonCodes.push('OUT_OF_STATION_TRANSFER');
          summaryParts.push(`${complex.name}: Short transfer connection.`);
        }
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
}
