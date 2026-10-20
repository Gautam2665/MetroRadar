import { EdgeType } from '../graph/edge.types';
import { GraphEdge, TransitGraph } from '../graph/graph.types';
import { FareBreakdownItem, JourneyLeg } from './candidate.types';

/** Supported semantic policy profiles */
export type PolicyProfileType =
  'FASTEST' | 'HEAVY_LUGGAGE' | 'STEP_FREE_MANDATORY';

/** Mathematical weights configuration for multi-criteria graph routing */
export interface JourneyPolicy {
  profile: PolicyProfileType;
  wStairs: number;
  wElevator: number;
  wWalk: number;
  wTransfer: number; // Seconds added per transfer
  stepFreeMandatory: boolean;
}

/** Pre-defined Policy Profile Configurations */
export const POLICY_PROFILES: Record<PolicyProfileType, JourneyPolicy> = {
  FASTEST: {
    profile: 'FASTEST',
    wStairs: 1.0,
    wElevator: 1.0,
    wWalk: 1.0,
    wTransfer: 180, // 3 minutes equivalent transfer penalty
    stepFreeMandatory: false,
  },
  HEAVY_LUGGAGE: {
    profile: 'HEAVY_LUGGAGE',
    wStairs: 5.0, // Heavy 5x time penalty for stair ascent/descent
    wElevator: 0.8, // 20% preference bonus for lifts
    wWalk: 1.5,
    wTransfer: 450, // 7.5 minutes transfer penalty
    stepFreeMandatory: false,
  },
  STEP_FREE_MANDATORY: {
    profile: 'STEP_FREE_MANDATORY',
    wStairs: Infinity, // Prune/disallow stairs completely
    wElevator: 1.0,
    wWalk: 1.2,
    wTransfer: 300,
    stepFreeMandatory: true,
  },
};

/** Supported Mumbai Transit Operating Authorities */
export type MumbaiTransitOperator = 'MMOPL' | 'MMMOCL' | 'MMRCL' | 'MMRDA_MONO';

export function getOperatorForLine(
  lineCodeOrId?: string | null,
): MumbaiTransitOperator {
  const norm = (lineCodeOrId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (norm.includes('MONO')) return 'MMRDA_MONO';
  if (norm.includes('LINE3') || norm.includes('L3') || norm.includes('AQUA')) {
    return 'MMRCL';
  }
  if (norm.includes('LINE1') || norm.includes('L1') || norm.includes('BLUE')) {
    return 'MMOPL';
  }
  // Lines 2A, 2B, 7, 9 are all run by Maha Mumbai Metro Operations Corp Ltd
  return 'MMMOCL';
}

export function getOperatorDisplayName(operator: MumbaiTransitOperator): string {
  switch (operator) {
    case 'MMOPL':
      return 'Mumbai Metro One (Reliance/MMOPL)';
    case 'MMMOCL':
      return 'Maha Mumbai Metro (MMMOCL)';
    case 'MMRCL':
      return 'Mumbai Metro Rail Corp (MMRCL)';
    case 'MMRDA_MONO':
      return 'Mumbai Monorail (MMRDA)';
  }
}

/**
 * Deterministic Operator-Specific Fare Matrix Calculation
 *
 * Tariff rules:
 * 1. MMOPL (Line 1: Versova - Ghatkopar):
 *    - 0-3 km: ₹10 (Token/Paper QR), ₹9 (Smart Card)
 *    - 3-8 km: ₹20 (Token/Paper QR), ₹18 (Smart Card)
 *    - 8-12 km: ₹30 (Token/Paper QR), ₹27 (Smart Card)
 *    - >12 km: ₹40 (Token/Paper QR), ₹36 (Smart Card)
 *
 * 2. MMMOCL (Lines 2A, 7, 2B):
 *    - 0-3 km: ₹10 (Smart Card ₹9)
 *    - 3-12 km: ₹20 (Smart Card ₹18)
 *    - 12-18 km: ₹30 (Smart Card ₹27)
 *    - 18-24 km: ₹40 (Smart Card ₹36)
 *    - 24-30 km: ₹50 (Smart Card ₹45)
 *    - 30-36 km: ₹60 (Smart Card ₹54)
 *    - 36-42 km: ₹70 (Smart Card ₹63)
 *    - >42 km: ₹80 (Smart Card ₹72)
 *
 * 3. MMRCL (Aqua Line 3 Underground):
 *    - 0-3 km: ₹10 (Smart Card ₹9)
 *    - 3-12 km: ₹20 (Smart Card ₹18)
 *    - 12-18 km: ₹30 (Smart Card ₹27)
 *    - 18-24 km: ₹40 (Smart Card ₹36)
 *    - 24-30 km: ₹50 (Smart Card ₹45)
 *    - >30 km: ₹60 (Smart Card ₹54)
 *
 * 4. MMRDA Monorail:
 *    - 0-3 km: ₹10
 *    - 3-8 km: ₹20
 *    - 8-12 km: ₹30
 *    - >12 km: ₹40
 */
export function calculateOperatorFare(
  operator: MumbaiTransitOperator,
  distanceMeters: number,
): { paperFare: number; smartCardFare: number; slab: string } {
  const distKm = Math.max(0.2, distanceMeters / 1000);

  if (operator === 'MMOPL') {
    if (distKm <= 3) return { paperFare: 10, smartCardFare: 9, slab: '0–3 km' };
    if (distKm <= 8) return { paperFare: 20, smartCardFare: 18, slab: '3–8 km' };
    if (distKm <= 12) return { paperFare: 30, smartCardFare: 27, slab: '8–12 km' };
    return { paperFare: 40, smartCardFare: 36, slab: '>12 km' };
  }

  if (operator === 'MMRCL') {
    if (distKm <= 3) return { paperFare: 10, smartCardFare: 9, slab: '0–3 km' };
    if (distKm <= 12) return { paperFare: 20, smartCardFare: 18, slab: '3–12 km' };
    if (distKm <= 18) return { paperFare: 30, smartCardFare: 27, slab: '12–18 km' };
    if (distKm <= 24) return { paperFare: 40, smartCardFare: 36, slab: '18–24 km' };
    if (distKm <= 30) return { paperFare: 50, smartCardFare: 45, slab: '24–30 km' };
    return { paperFare: 60, smartCardFare: 54, slab: '>30 km' };
  }

  if (operator === 'MMRDA_MONO') {
    if (distKm <= 3) return { paperFare: 10, smartCardFare: 10, slab: '0–3 km' };
    if (distKm <= 8) return { paperFare: 20, smartCardFare: 20, slab: '3–8 km' };
    if (distKm <= 12) return { paperFare: 30, smartCardFare: 30, slab: '8–12 km' };
    return { paperFare: 40, smartCardFare: 40, slab: '>12 km' };
  }

  // Default: MMMOCL (Line 2A, 7, 2B, 9)
  if (distKm <= 3) return { paperFare: 10, smartCardFare: 9, slab: '0–3 km' };
  if (distKm <= 12) return { paperFare: 20, smartCardFare: 18, slab: '3–12 km' };
  if (distKm <= 18) return { paperFare: 30, smartCardFare: 27, slab: '12–18 km' };
  if (distKm <= 24) return { paperFare: 40, smartCardFare: 36, slab: '18–24 km' };
  if (distKm <= 30) return { paperFare: 50, smartCardFare: 45, slab: '24–30 km' };
  if (distKm <= 36) return { paperFare: 60, smartCardFare: 54, slab: '30–36 km' };
  if (distKm <= 42) return { paperFare: 70, smartCardFare: 63, slab: '36–42 km' };
  return { paperFare: 80, smartCardFare: 72, slab: '>42 km' };
}

/** Fares v2 Result Structure */
export interface FareResult {
  paperFare: number;
  smartCardFare: number;
  currency: string;
  tariffSlab: string;
  isContinuousTariff: boolean;
}

export interface JourneyFareResult {
  totalPaperFare: number;
  totalSmartCardFare: number;
  currency: string;
  requiresMultipleTickets: boolean;
  breakdown: FareBreakdownItem[];
  tariffSlabSummary: string;
}

/**
 * Route Assembler Post-Processor: Computes exact journey fares
 * across one or more operating authorities.
 *
 * Rules:
 * - Pure transit distance per ticketing authority.
 * - Same operator + continuous paid transfer (e.g. Dahisar East L2A <-> L7) = single ticket.
 * - Cross operator or AFC retap transfer = separate tickets summed together.
 */
export function computeJourneyFares(legs: JourneyLeg[]): JourneyFareResult {
  const transitPartitions: Array<{
    operator: MumbaiTransitOperator;
    lines: string[];
    fromStation: string;
    toStation: string;
    distanceMeters: number;
  }> = [];

  let currentPartition: {
    operator: MumbaiTransitOperator;
    lines: string[];
    fromStation: string;
    toStation: string;
    distanceMeters: number;
  } | null = null;

  let retapPending = false;

  for (const leg of legs) {
    if (leg.type === EdgeType.WALK || leg.type === EdgeType.TRANSFER) {
      const isPaid = leg.transferDetails?.attributes.paidAreaTransfer;
      const requiresRetap = leg.transferDetails?.attributes.requiresAfcRetap;
      // If the transfer is known to leave the paid area or requires AFC retap:
      if (isPaid === false || requiresRetap === true) {
        retapPending = true;
      }
      continue;
    }

    if (leg.type === EdgeType.TRANSIT) {
      const lineIdentifier = leg.lineCode || leg.lineName || leg.lineId;
      const op = getOperatorForLine(lineIdentifier);
      const legDist = Math.max(leg.distanceMeters || 0, 1000); // 1km minimum floor
      const cleanLineName = leg.lineName || leg.lineCode || 'Metro Line';

      if (!currentPartition) {
        currentPartition = {
          operator: op,
          lines: [cleanLineName],
          fromStation: leg.fromStationName,
          toStation: leg.toStationName,
          distanceMeters: legDist,
        };
        retapPending = false;
      } else {
        // Can we merge into current ticket?
        // Only if: same operator AND no retap required in between!
        if (currentPartition.operator === op && !retapPending) {
          if (!currentPartition.lines.includes(cleanLineName)) {
            currentPartition.lines.push(cleanLineName);
          }
          currentPartition.toStation = leg.toStationName;
          currentPartition.distanceMeters += legDist;
        } else {
          // Different operator OR retap required:
          transitPartitions.push(currentPartition);
          currentPartition = {
            operator: op,
            lines: [cleanLineName],
            fromStation: leg.fromStationName,
            toStation: leg.toStationName,
            distanceMeters: legDist,
          };
          retapPending = false;
        }
      }
    }
  }

  if (currentPartition) {
    transitPartitions.push(currentPartition);
  }

  if (transitPartitions.length === 0) {
    return {
      totalPaperFare: 0,
      totalSmartCardFare: 0,
      currency: 'INR',
      requiresMultipleTickets: false,
      breakdown: [],
      tariffSlabSummary: 'Free / Walking',
    };
  }

  const breakdown: FareBreakdownItem[] = [];
  let totalPaper = 0;
  let totalCard = 0;

  for (const part of transitPartitions) {
    const fare = calculateOperatorFare(part.operator, part.distanceMeters);
    totalPaper += fare.paperFare;
    totalCard += fare.smartCardFare;

    const opName = getOperatorDisplayName(part.operator);
    const linesStr = part.lines.join(' / ');

    breakdown.push({
      operator: part.operator,
      operatorName: opName,
      lines: part.lines,
      fromStation: part.fromStation,
      toStation: part.toStation,
      distanceMeters: part.distanceMeters,
      distanceKm: Math.round((part.distanceMeters / 1000) * 10) / 10,
      paperFare: fare.paperFare,
      smartCardFare: fare.smartCardFare,
      tariffSlab: fare.slab,
      ticketLabel: `${opName}: ${linesStr}`,
    });
  }

  const requiresMultipleTickets = breakdown.length > 1;
  const slabSummary = breakdown
    .map((b) => `${b.operator} (${b.tariffSlab}: ₹${b.paperFare})`)
    .join(' + ');

  return {
    totalPaperFare: totalPaper,
    totalSmartCardFare: totalCard,
    currency: 'INR',
    requiresMultipleTickets,
    breakdown,
    tariffSlabSummary: slabSummary,
  };
}

/** Legacy Compatibility Wrapper */
export function calculateMumbaiFare(
  distanceMeters: number,
  isContinuousNetwork: boolean = true,
  isCrossOperator: boolean = false,
  operatorLegDistances: number[] = [],
): FareResult {
  if (isCrossOperator && operatorLegDistances.length > 1) {
    let totalPaper = 0;
    let totalNCMC = 0;
    for (const dist of operatorLegDistances) {
      const res = calculateOperatorFare('MMMOCL', dist);
      totalPaper += res.paperFare;
      totalNCMC += res.smartCardFare;
    }
    return {
      paperFare: totalPaper,
      smartCardFare: totalNCMC,
      currency: 'INR',
      tariffSlab: 'Multi-Operator Combined',
      isContinuousTariff: false,
    };
  }

  const res = calculateOperatorFare('MMMOCL', distanceMeters);
  return {
    paperFare: res.paperFare,
    smartCardFare: res.smartCardFare,
    currency: 'INR',
    tariffSlab: res.slab,
    isContinuousTariff: true,
  };
}

/**
 * Calculates dynamic edge cost based on Policy Profile
 */
export function calculateEdgeCost(
  edge: GraphEdge & { pathwayMode?: number },
  policy: JourneyPolicy,
  isLineChange: boolean = false,
): number {
  if (policy.stepFreeMandatory && edge.pathwayMode === 2) {
    return Infinity; // Prune stairs
  }

  const duration = edge.duration;
  let multiplier = policy.wWalk;

  if (edge.pathwayMode === 2) {
    multiplier = policy.wStairs;
  } else if (edge.pathwayMode === 5) {
    multiplier = policy.wElevator;
  } else if (edge.pathwayMode === 4) {
    multiplier = 0.9; // Escalator slight bonus
  } else if (edge.type === EdgeType.TRANSIT) {
    multiplier = 1.0;
  }

  let cost = duration * multiplier;
  if (isLineChange) {
    cost += policy.wTransfer;
  }
  return cost;
}
