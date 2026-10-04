/**
 * TransitOS Persona Cost & Policy Engine
 * Evaluates candidate journeys against passenger profiles, computing
 * policy-driven friction costs and enforcing hard accessibility constraints.
 */

const PASSENGER_PROFILES = {
  STANDARD_COMMUTER: {
    id: "STANDARD_COMMUTER",
    name: "Standard Commuter (Time-Minimized)",
    description: "Accepts any physical transfer to achieve the fastest nominal arrival.",
    constraints: {
      outdoorStreetTransferAllowed: true,
      accessibilityRequired: false,
      elevatorVerificationRequired: false
    },
    frictionPolicies: {
      unpaidStreetWalk: 0,
      securityRescreening: 0,
      verticalMovementPerMeter: 0,
      afcRetap: 0
    }
  },

  LUGGAGE_HEAVY: {
    id: "LUGGAGE_HEAVY",
    name: "Commuter with Heavy Luggage / Bags",
    description: "Heavily penalizes broken sidewalks, security baggage scanning queues, and vertical stairs/escalator changes.",
    constraints: {
      outdoorStreetTransferAllowed: true,
      accessibilityRequired: false,
      elevatorVerificationRequired: false
    },
    frictionPolicies: {
      unpaidStreetWalk: 600,         // +10 mins policy penalty for outdoor street/sidewalk drag
      securityRescreening: 300,      // +5 mins policy penalty for luggage lifting / X-ray queue
      verticalMovementPerMeter: 10,  // +10s penalty per vertical meter if not level grade
      afcRetap: 60                   // +1 min penalty for wrestling luggage through turnstiles
    }
  },

  ACCESSIBLE_REDUCED_MOBILITY: {
    id: "ACCESSIBLE_REDUCED_MOBILITY",
    name: "Passenger with Reduced Mobility / Wheelchair",
    description: "Requires continuous verified step-free access. Rejects unverified elevator nodes and outdoor street transfers.",
    constraints: {
      outdoorStreetTransferAllowed: false,
      accessibilityRequired: true,
      elevatorVerificationRequired: true
    },
    frictionPolicies: {
      unpaidStreetWalk: 1200,
      securityRescreening: 180,
      verticalMovementPerMeter: 0,
      afcRetap: 60
    }
  }
};

/**
 * Evaluates a candidate journey against a passenger profile.
 * Computes feasibility and effective journey cost.
 */
function evaluatePersonaJourney(journey, profileId) {
  const profile = PASSENGER_PROFILES[profileId] || PASSENGER_PROFILES.STANDARD_COMMUTER;
  const frictionBreakdown = [];
  let totalFrictionSeconds = 0;
  let isFeasible = true;
  const feasibilityViolations = [];

  for (const leg of journey.legs) {
    if (leg.type !== 'TRANSFER' || !leg.interchangeEnrichment) continue;

    const ie = leg.interchangeEnrichment;
    const attrs = ie.attributes || {};

    // 1. HARD CONSTRAINT CHECK: Outdoor Street Transfer
    if (!profile.constraints.outdoorStreetTransferAllowed && attrs.outdoorStreetExposure) {
      isFeasible = false;
      feasibilityViolations.push({
        constraint: "outdoorStreetTransferAllowed",
        complexId: ie.complexId,
        violation: `Outdoor street transfer along ${ie.complexName} violates accessibility policy`
      });
    }

    // 2. HARD CONSTRAINT CHECK: Elevator Verification
    if (profile.constraints.elevatorVerificationRequired) {
      const elevStatus = attrs.elevatorAvailability;
      if (elevStatus !== 'VERIFIED_ELEVATOR') {
        isFeasible = false;
        feasibilityViolations.push({
          constraint: "elevatorVerificationRequired",
          complexId: ie.complexId,
          violation: `Elevator status is '${elevStatus}' at ${ie.complexName}. Unverified step-free path rejected by strict safety contract.`
        });
      }
    }

    // 3. FRICTION PENALTY COMPUTATION (Explicitly marked as model/policy penalties, NOT physical travel time)
    if (attrs.outdoorStreetExposure && profile.frictionPolicies.unpaidStreetWalk > 0) {
      const penalty = profile.frictionPolicies.unpaidStreetWalk;
      frictionBreakdown.push({
        component: "unpaidStreetWalk",
        penaltySeconds: penalty,
        complexId: ie.complexId,
        source: "PERSONA_POLICY_V1",
        type: "FRICTION_PENALTY",
        reason: `Commuter dragging luggage across outdoor footpath at ${ie.complexName}`
      });
      totalFrictionSeconds += penalty;
    }

    if (attrs.requiresSecurityRescreening && profile.frictionPolicies.securityRescreening > 0) {
      const penalty = profile.frictionPolicies.securityRescreening;
      frictionBreakdown.push({
        component: "securityRescreening",
        penaltySeconds: penalty,
        complexId: ie.complexId,
        source: "PERSONA_POLICY_V1",
        type: "FRICTION_PENALTY",
        reason: `Luggage lifting and secondary X-ray queue at ${ie.complexName}`
      });
      totalFrictionSeconds += penalty;
    }

    if (attrs.requiresAfcRetap && profile.frictionPolicies.afcRetap > 0) {
      const penalty = profile.frictionPolicies.afcRetap;
      frictionBreakdown.push({
        component: "afcRetap",
        penaltySeconds: penalty,
        complexId: ie.complexId,
        source: "PERSONA_POLICY_V1",
        type: "FRICTION_PENALTY",
        reason: `Secondary turnstile tap and barrier clearance at ${ie.complexName}`
      });
      totalFrictionSeconds += penalty;
    }

    if (attrs.verticalDropMeters && profile.frictionPolicies.verticalMovementPerMeter > 0) {
      const penalty = Math.round(attrs.verticalDropMeters * profile.frictionPolicies.verticalMovementPerMeter);
      frictionBreakdown.push({
        component: "verticalMovement",
        penaltySeconds: penalty,
        complexId: ie.complexId,
        source: "PERSONA_POLICY_V1",
        type: "FRICTION_PENALTY",
        reason: `Vertical transition across ${attrs.verticalDropMeters}m drop at ${ie.complexName}`
      });
      totalFrictionSeconds += penalty;
    }
  }

  const nominalDurationSeconds = journey.nominalDurationSeconds || (journey.nominalDurationMinutes * 60);
  const effectiveCostSeconds = nominalDurationSeconds + totalFrictionSeconds;

  return {
    journeyId: journey.id || `journey-${Date.now()}`,
    profileId: profile.id,
    profileName: profile.name,
    isFeasible,
    feasibilityViolations,
    nominalDurationSeconds,
    nominalDurationMinutes: Math.round(nominalDurationSeconds / 60),
    totalFrictionSeconds,
    totalFrictionMinutes: Math.round(totalFrictionSeconds / 60),
    effectiveCostSeconds,
    effectiveCostMinutes: Math.round(effectiveCostSeconds / 60),
    frictionBreakdown,
    enrichedJourney: journey
  };
}

module.exports = {
  PASSENGER_PROFILES,
  evaluatePersonaJourney
};
