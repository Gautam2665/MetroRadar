const EdgeType = {
  TRANSIT: 'TRANSIT',
  TRANSFER: 'TRANSFER',
  WALK: 'WALK',
};

const POLICY_PROFILES = {
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

function calculateMumbaiFare(
  distanceMeters,
  isContinuousNetwork = true,
  isCrossOperator = false,
  operatorLegDistances = [],
) {
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

function calculateSingleNetworkFare(distanceMeters) {
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

function calculateEdgeCost(edge, policy, isLineChange = false) {
  if (policy.stepFreeMandatory && edge.pathwayMode === 2) {
    return Infinity; // Prune stairs
  }

  let duration = edge.duration;
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

module.exports = {
  POLICY_PROFILES,
  calculateMumbaiFare,
  calculateEdgeCost,
};
