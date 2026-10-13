import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RouteCandidate, TransferDetails } from './candidate.types';
import { EdgeType } from '../graph/edge.types';

interface InterchangeAttribute<T> {
  value?: T | null;
  status?: string;
  knowledgeState?: string;
}

interface InterchangeComplex {
  complexId: string;
  name: string;
  participatingStations?: string[];
  pathways?: Array<{
    walkingSeconds?: number | null;
    from?: string;
    to?: string;
  }>;
  pathway?: Array<{
    segmentId?: string;
    from: string;
    to: string;
    type: string;
    distanceMeters?: number | null;
    structureLengthMeters?: number | null;
    sourceState?: string;
  }>;
  instructions?: string[];
  reasonCodes?: string[];
  throughRunningRelations?: Array<{
    from: string;
    to: string;
    viaStationId?: string;
    relation?: string;
  }>;
  estimatedDurationSeconds?: number | null;
  attributes?: {
    paidAreaTransfer?: InterchangeAttribute<boolean>;
    requiresSecurityRescreening?: InterchangeAttribute<boolean>;
    requiresAfcRetap?: InterchangeAttribute<boolean>;
    verticalDropMeters?: InterchangeAttribute<number>;
    outdoorStreetExposure?: InterchangeAttribute<boolean>;
    elevatorAvailability?: InterchangeAttribute<boolean>;
    suitabilityNote?: InterchangeAttribute<string>;
    walkingDistanceMeters?: InterchangeAttribute<number>;
  };
}

interface InterchangeRegistry {
  complexes: InterchangeComplex[];
}

interface GtfsTransferFacts {
  transfers: Array<{ fromStopId: string; toStopId: string; minTransferTime: number | null }>;
  pathways: Array<{ fromStopId: string; toStopId: string; length: number | null; traversalTime: number | null }>;
  stationByStopId: Map<string, string>;
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
  private gtfsTransferFacts: GtfsTransferFacts | null = null;

  constructor() {
    this.loadRegistry();
  }

  private loadRegistry() {
    const candidatePaths = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        __dirname,
        '../../../../datasets/mumbai/network/interchange-complexes.json',
      ),
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
    this.logger.warn(
      'Interchange Complex Registry not found; running in standalone mode.',
    );
  }

  private indexRegistry() {
    if (!this.icxRegistry?.complexes) return;

    for (const complex of this.icxRegistry.complexes) {
      for (const stationCode of complex.participatingStations ?? []) {
        this.stationCodeToComplex.set(stationCode, complex);
      }
    }
  }

  private parseGtfsCsv(content: string): Array<Record<string, string>> {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const parseLine = (line: string) =>
      line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((value) =>
        value.replace(/^"|"$/g, '').replace(/""/g, '"'),
      );
    const headers = parseLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
  }

  private loadGtfsTransferFacts(): GtfsTransferFacts | null {
    if (this.gtfsTransferFacts) return this.gtfsTransferFacts;
    const directories = [
      path.resolve(process.cwd(), 'datasets/mumbai/gtfs'),
      path.resolve(__dirname, '../../../../../../datasets/mumbai/gtfs'),
    ];
    for (const directory of directories) {
      try {
        const stops = this.parseGtfsCsv(fs.readFileSync(path.join(directory, 'stops.txt'), 'utf8'));
        const transfers = this.parseGtfsCsv(fs.readFileSync(path.join(directory, 'transfers.txt'), 'utf8'));
        const pathways = this.parseGtfsCsv(fs.readFileSync(path.join(directory, 'pathways.txt'), 'utf8'));
        this.gtfsTransferFacts = {
          stationByStopId: new Map(stops.map((stop) => [stop.stop_id, stop.parent_station || stop.stop_id])),
          transfers: transfers.map((row) => ({
            fromStopId: row.from_stop_id,
            toStopId: row.to_stop_id,
            minTransferTime: row.min_transfer_time === '' ? null : Number(row.min_transfer_time),
          })),
          pathways: pathways.map((row) => ({
            fromStopId: row.from_stop_id,
            toStopId: row.to_stop_id,
            length: row.length === '' ? null : Number(row.length),
            traversalTime: row.traversal_time === '' ? null : Number(row.traversal_time),
          })),
        };
        return this.gtfsTransferFacts;
      } catch {
        // Continue to the next known path for packaged/runtime layouts.
      }
    }
    return null;
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
        const complexTo = toSt
          ? this.stationCodeToComplex.get(toSt.code)
          : null;
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

    const summaryParts: string[] = [];

    // 3. Evaluate physical facts per traversed complex
    for (const complex of traversedComplexes) {
      const attrs = complex.attributes || {};
      const paidArea = attrs.paidAreaTransfer?.value;
      const requiresSecurity = attrs.requiresSecurityRescreening?.value;
      const requiresAfc = attrs.requiresAfcRetap?.value;
      const verticalDrop = attrs.verticalDropMeters?.value;
      const outdoorStreet = attrs.outdoorStreetExposure?.value;
      const elevatorStatus = attrs.elevatorAvailability?.status ?? 'UNKNOWN';
      const suitability = attrs.suitabilityNote?.value ?? '';

      // Check Hard Constraints for Reduced Mobility
      if (mobility === 'REDUCED') {
        if (outdoorStreet === true) {
          violations.push(
            `Outdoor street transfer at ${complex.name} is inaccessible for reduced mobility.`,
          );
        }
        if (elevatorStatus !== 'VERIFIED_ELEVATOR') {
          violations.push(`Unverified elevator status at ${complex.name}.`);
        }
      }

      // Check user avoid preferences
      if (avoidList.includes('OUTDOOR_STREET_WALK') && outdoorStreet === true) {
        violations.push(
          `Route includes outdoor street walk at ${complex.name}.`,
        );
      }
      if (
        avoidList.includes('STREET_MARKET') &&
        suitability.includes('STREET_MARKET')
      ) {
        violations.push(
          `Route passes through congested street market at ${complex.name}.`,
        );
      }
      if (avoidList.includes('AFC_EXIT') && paidArea === false) {
        violations.push(
          `Transfer requires exiting paid area at ${complex.name}.`,
        );
      }

      // Dynamic Policy Friction Computation (derived from physical facts)
      if (luggage === 'HEAVY') {
        if (outdoorStreet === true) {
          frictionSeconds += 600; // +10m drag penalty
          reasonCodes.push('OUTDOOR_STREET_WALK');
        }
        if (requiresSecurity === true) {
          frictionSeconds += 300; // +5m bag scanning queue
          reasonCodes.push('SECURITY_RESCREENING');
        }
        if (requiresAfc === true) {
          frictionSeconds += 60; // +1m turnstile bag maneuver
          reasonCodes.push('AFC_RETAP');
        }
        if (typeof verticalDrop === 'number' && verticalDrop > 10) {
          frictionSeconds += Math.round(verticalDrop * 10); // 10s per vertical meter
          reasonCodes.push('HEAVY_VERTICAL_MOVEMENT');
        }
      }

      // Dynamic GTFS-driven transfer summary — derived from physical attributes
      // No hardcoded station names; all text is produced from attribute flags.
      if (elevatorStatus === 'VERIFIED_ELEVATOR' && outdoorStreet !== true) {
        reasonCodes.push('LIFT_VERIFIED');
        summaryParts.push(
          `${complex.name}: Step-free lift/escalator access confirmed — suitable for luggage and reduced mobility.`,
        );
      } else if (outdoorStreet === true && requiresSecurity === true) {
        reasonCodes.push('OUTDOOR_STREET_WALK', 'SECURITY_RESCREENING');
        summaryParts.push(
          `${complex.name}: Outdoor street-level transfer. Exit paid area, complete street walk, then clear security re-screening at destination concourse.`,
        );
      } else if (outdoorStreet === true) {
        reasonCodes.push('OUTDOOR_STREET_WALK');
        summaryParts.push(
          `${complex.name}: Outdoor street-level transfer. Exit paid area and walk to connecting station entrance.`,
        );
      } else if (paidArea === true) {
        reasonCodes.push('PAID_AREA_TRANSFER');
        summaryParts.push(
          `${complex.name}: Paid-area concourse transfer — no tap-out required.`,
        );
      } else if (paidArea === false && requiresAfc === true) {
        reasonCodes.push('OUT_OF_STATION_TRANSFER', 'AFC_RETAP');
        summaryParts.push(
          `${complex.name}: Out-of-station transfer. Tap out, complete interchange walk, then tap in at connecting concourse.`,
        );
      } else {
        reasonCodes.push('STANDARD_TRANSFER');
        summaryParts.push(`${complex.name}: Standard interchange transfer.`);
      }

      if (elevatorStatus === 'VERIFIED_ELEVATOR') {
        reasonCodes.push('LIFT_VERIFIED');
      }
    }

    // Determine friction level
    let frictionLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' =
      'MINIMAL';
    if (frictionSeconds > 900) frictionLevel = 'CRITICAL';
    else if (frictionSeconds > 500) frictionLevel = 'HIGH';
    else if (frictionSeconds > 200) frictionLevel = 'MODERATE';
    else if (frictionSeconds > 0) frictionLevel = 'LOW';

    const isFeasible = violations.length === 0;
    const humanSummary =
      summaryParts.length > 0
        ? summaryParts.join(' ')
        : 'Standard transfer between lines.';

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
   * Generates a human-readable step instruction from a single GTFS pathway edge.
   *
   * All text is derived purely from the edge's pathway_mode, signposted_as,
   * length, and the destination node's stop_name — no station names are hardcoded.
   *
   * GTFS pathway_mode values:
   *   1 = Walkway / Footpath
   *   2 = Stairs
   *   3 = Moving walkway / Travelator
   *   4 = Escalator
   *   5 = Elevator / Lift
   *   6 = Fare gate / Turnstile (AFC)
   *   7 = Security checkpoint
   */
  private formatPathwayStep(
    pathwayMode: number,
    signpostedAs: string | null | undefined,
    toNodeName: string,
    lengthMeters: number | null | undefined,
    traversalTime: number | null | undefined,
  ): string {
    let dest = signpostedAs || toNodeName;
    // Humanize technical node codes like "L7_CONCOURSE" -> "Concourse", "FOB" -> "Foot Overbridge (FOB)", "L1_PLATFORM" -> "Platform"
    if (!signpostedAs && toNodeName) {
      if (toNodeName.toUpperCase().includes('CONCOURSE')) {
        dest = toNodeName.includes('_') ? `${toNodeName.split('_')[0]} Concourse` : 'Concourse';
      } else if (toNodeName.toUpperCase().includes('PLATFORM')) {
        dest = toNodeName.includes('_') ? `${toNodeName.split('_')[0]} Platform` : 'Platform';
      } else if (toNodeName.toUpperCase() === 'FOB') {
        dest = 'Foot Overbridge (FOB)';
      }
    }
    const distText = lengthMeters
      ? `${Math.round(lengthMeters)}m`
      : traversalTime
        ? `~${Math.round(traversalTime)}s`
        : '';

    switch (pathwayMode) {
      case 1: // Walkway
        return distText
          ? `Walk ${distText} via ${dest}`
          : `Walk to ${dest}`;
      case 2: // Stairs
        return `Take stairs to ${dest}`;
      case 3: // Moving walkway / Travelator
        return `Take moving walkway (${distText}) to ${dest}`;
      case 4: // Escalator
        return `Take escalator to ${dest}`;
      case 5: // Elevator / Lift
        return `Take lift to ${dest}`;
      case 6: // Fare gate / AFC turnstile
        return `Tap through AFC gates → ${dest}`;
      case 7: // Security checkpoint
        return `Clear security screening at ${dest}`;
      default:
        return `Proceed to ${dest}`;
    }
  }

  /**
   * Deterministically resolves transfer details for an interchange leg.
   *
   * Reads entirely from the registered InterchangeComplex pathway segments —
   * no station-name switch-cases or hardcoded instruction strings.
   * Duration is the sum of traversal_time across all traversed pathway edges.
   */
  resolveTransferDetails(
    fromStationCodeOrName: string,
    toStationCodeOrName: string,
    prevLineName?: string | null,
    nextLineName?: string | null,
    fromStationCode?: string | null,
    toStationCode?: string | null,
  ): TransferDetails | null {
    const fromU = (fromStationCodeOrName || '').toUpperCase();
    const toU = (toStationCodeOrName || '').toUpperCase();
    const gtfs = this.loadGtfsTransferFacts();
    const fromCode = fromStationCode ?? fromStationCodeOrName;
    const toCode = toStationCode ?? toStationCodeOrName;

    // Look up a registered complex that covers both stations
    const registeredComplex =
      this.icxRegistry?.complexes.find((complex) => {
        const participants = complex.participatingStations ?? [];
        // Match by station code first (precise), then by name substring
        if (fromCode && toCode) {
          return (
            participants.includes(fromCode) &&
            participants.includes(toCode)
          );
        }
        return participants.some(
          (p) => fromU.includes(p.toUpperCase()) || toU.includes(p.toUpperCase()),
        );
      }) ?? null;

    const gtfsTransfer = gtfs?.transfers.find((transfer) =>
      (transfer.fromStopId === fromCode && transfer.toStopId === toCode) ||
      (transfer.fromStopId === toCode && transfer.toStopId === fromCode),
    );
    if (!registeredComplex && !gtfsTransfer) return null;

    // Build step instructions from pathway segments if defined,
    // otherwise fall back to the registered instructions array.
    const instructions: string[] = [];
    let totalDistanceMeters = 0;
    let totalTraversalTime = 0;

    if (registeredComplex?.pathway && registeredComplex.pathway.length > 0) {
      for (const seg of registeredComplex.pathway) {
        // Infer pathway_mode from segment type string
        let pathwayMode = 1; // default: walkway
        const segType = (seg.type || '').toUpperCase();
        if (segType === 'VERTICAL') pathwayMode = 2;       // stairs/lift — generic vertical
        else if (segType === 'ESCALATOR') pathwayMode = 4;
        else if (segType === 'LIFT' || segType === 'ELEVATOR') pathwayMode = 5;
        else if (segType === 'AFC' || segType === 'FARE_GATE') pathwayMode = 6;
        else if (segType === 'SECURITY') pathwayMode = 7;
        else if (segType === 'TRAVELATOR') pathwayMode = 3;

        const lengthM = seg.structureLengthMeters ?? seg.distanceMeters ?? null;
        if (typeof lengthM === 'number') totalDistanceMeters += lengthM;
        const traversalTime = (seg as { traversalTime?: number | null }).traversalTime;
        if (typeof traversalTime === 'number') totalTraversalTime += traversalTime;

        const step = this.formatPathwayStep(
          pathwayMode,
          null,
          seg.to,
          lengthM,
          null,
        );
        instructions.push(step);
      }
    } else if (registeredComplex?.instructions?.length) {
      // Use any pre-authored instructions verbatim (they come from the JSON registry,
      // not from hardcoded TypeScript strings)
      instructions.push(...registeredComplex.instructions);
    } else {
      // Generic fallback — no hardcoded station names
      instructions.push(
        `Follow interchange signage towards ${nextLineName || toStationCodeOrName} concourse`,
        `Tap through AFC gates and proceed to connecting platform`,
      );
    }

    // Compute duration: prefer registered seconds, then sum traversal times
    const matchingGtfsPathways = (gtfs?.pathways ?? []).filter((pathway) => {
      const pathwayFromStation = gtfs?.stationByStopId.get(pathway.fromStopId);
      const pathwayToStation = gtfs?.stationByStopId.get(pathway.toStopId);
      return (
        (pathwayFromStation === fromCode && pathwayToStation === toCode) ||
        (pathwayFromStation === toCode && pathwayToStation === fromCode)
      );
    });
    let gtfsPathwayMeters = 0;
    for (const pathway of matchingGtfsPathways) {
      if (typeof pathway.length === 'number') gtfsPathwayMeters += pathway.length;
      if (typeof pathway.traversalTime === 'number') totalTraversalTime += pathway.traversalTime;
    }
    if (gtfsPathwayMeters > 0) totalDistanceMeters = gtfsPathwayMeters;

    const registeredSeconds =
      (gtfsTransfer?.minTransferTime && gtfsTransfer.minTransferTime > 0
        ? gtfsTransfer.minTransferTime
        : null) ??
      registeredComplex?.pathways?.find(
        (item) =>
          typeof item.walkingSeconds === 'number' &&
          Number.isFinite(item.walkingSeconds),
      )?.walkingSeconds ??
      registeredComplex?.estimatedDurationSeconds ??
      null;

    const estimatedDurationSeconds =
      typeof registeredSeconds === 'number'
        ? registeredSeconds
        : totalTraversalTime > 0
          ? totalTraversalTime
          : null;

    const durationDisplay =
      typeof estimatedDurationSeconds === 'number'
        ? `~${Math.max(1, Math.round(estimatedDurationSeconds / 60))} min`
        : 'Time unknown';

    // Copy physical attributes from registry
    const attributes: TransferDetails['attributes'] = {};
    const copyBoolean = (
      key:
        | 'paidAreaTransfer'
        | 'requiresAfcRetap'
        | 'requiresSecurityRescreening'
        | 'outdoorStreetExposure',
    ) => {
      const value = registeredComplex?.attributes?.[key]?.value;
      if (typeof value === 'boolean') attributes[key] = value;
    };
    copyBoolean('paidAreaTransfer');
    copyBoolean('requiresAfcRetap');
    copyBoolean('requiresSecurityRescreening');
    copyBoolean('outdoorStreetExposure');
    const verticalDrop =
      registeredComplex?.attributes?.verticalDropMeters?.value;
    if (typeof verticalDrop === 'number')
      attributes.verticalDropMeters = verticalDrop;

    const walkingDistance =
      registeredComplex?.attributes?.walkingDistanceMeters?.value;

    return {
      complexId: registeredComplex?.complexId ?? 'GTFS_TRANSFER',
      name: registeredComplex?.name ?? `${fromStationCodeOrName} Interchange`,
      pathwayDistanceMeters:
        totalDistanceMeters > 0
          ? totalDistanceMeters
          : typeof walkingDistance === 'number'
            ? walkingDistance
            : null,
      estimatedDurationSeconds,
      durationDisplay,
      attributes,
      pathway: registeredComplex?.pathway,
      reasonCodes: registeredComplex?.reasonCodes ?? ['GTFS_TRANSFER'],
      instructions,
    };
  }

  /** True when two CTM corridors represent one uninterrupted passenger service at this station. */
  isThroughRunningTransition(
    fromLineCode: string | null | undefined,
    toLineCode: string | null | undefined,
    stationCode: string | null | undefined,
  ): boolean {
    if (
      !fromLineCode ||
      !toLineCode ||
      !stationCode ||
      fromLineCode === toLineCode
    )
      return false;
    return (this.icxRegistry?.complexes ?? []).some((complex) =>
      (complex.throughRunningRelations ?? []).some(
        (relation) =>
          relation.viaStationId === stationCode &&
          ((relation.from === fromLineCode && relation.to === toLineCode) ||
            (relation.from === toLineCode && relation.to === fromLineCode)),
      ),
    );
  }
}
