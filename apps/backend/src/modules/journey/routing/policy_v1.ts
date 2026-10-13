import { EdgeType } from '../graph/edge.types';
import { GraphEdge, TransitGraph } from '../graph/graph.types';

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

/** Fares v2 Result Structure */
export interface FareResult {
  paperFare: number;
  smartCardFare: number;
  currency: string;
  tariffSlab: string;
  isContinuousTariff: boolean;
}

/**
 * Deterministic Mumbai Metro Fare Calculator (GTFS-Fares v2 Slabs)
 *
 * Slabs based on continuous cumulative distance:
 *  - 0 - 3 km: ₹10 (NCMC ₹9)
 *  - 3 - 12 km: ₹20 (NCMC ₹18)
 *  - 12 - 18 km: ₹30 (NCMC ₹27)
 *  - 18 - 24 km: ₹40 (NCMC ₹36)
 *  - 24 - 30 km: ₹50 (NCMC ₹45)
 *  - > 30 km: ₹60 (NCMC ₹54)
 */
export function calculateMumbaiFare(
  distanceMeters: number,
  isContinuousNetwork: boolean = true,
  isCrossOperator: boolean = false,
  operatorLegDistances: number[] = [],
): FareResult {
  // If travel spans non-continuous separate operators (e.g. Line 1 MMOPL + Line 2A MMMOCL),
  // fares are summed per operator leg unless connected seamlessly.
  if (isCrossOperator && operatorLegDistances.length > 1) {
    let totalPaper = 0;
    let totalNCMC = 0;
    for (const dist of operatorLegDistances) {
      const res = calculateSingleNetworkFare(dist);
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

  return calculateSingleNetworkFare(distanceMeters);
}

function calculateSingleNetworkFare(distanceMeters: number): FareResult {
  const distKm = distanceMeters / 1000;
  let paperFare = 10;
  let smartCardFare = 9;
  let slab = '0-3 km';

  if (distKm <= 3) {
    paperFare = 10;
    smartCardFare = 9;
    slab = '0-3 km';
  } else if (distKm <= 12) {
    paperFare = 20;
    smartCardFare = 18;
    slab = '3-12 km';
  } else if (distKm <= 18) {
    paperFare = 30;
    smartCardFare = 27;
    slab = '12-18 km';
  } else if (distKm <= 24) {
    paperFare = 40;
    smartCardFare = 36;
    slab = '18-24 km';
  } else if (distKm <= 30) {
    paperFare = 50;
    smartCardFare = 45;
    slab = '24-30 km';
  } else {
    paperFare = 60;
    smartCardFare = 54;
    slab = '30+ km';
  }

  return {
    paperFare,
    smartCardFare,
    currency: 'INR',
    tariffSlab: slab,
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
