const { enrichJourneyWithInterchanges } = require('./interchange-enrichment');
const { PASSENGER_PROFILES, evaluatePersonaJourney } = require('./persona-cost-engine');

/**
 * Ranks candidate journeys for a specific passenger profile.
 * 1. Enriches pure topological candidates with physical interchange data.
 * 2. Evaluates persona-specific constraints & friction costs.
 * 3. Filters infeasible candidates (or ranks them below feasible options).
 * 4. Sorts feasible candidates by effective cost.
 */
function rankJourneysForPersona(rawCandidates, profileId) {
  const evaluations = rawCandidates.map(c => {
    const enriched = enrichJourneyWithInterchanges(c);
    return evaluatePersonaJourney(enriched, profileId);
  });

  // Sort: Feasible first, then by effectiveCostSeconds ascending
  evaluations.sort((a, b) => {
    if (a.isFeasible !== b.isFeasible) {
      return a.isFeasible ? -1 : 1;
    }
    return a.effectiveCostSeconds - b.effectiveCostSeconds;
  });

  return {
    profileId,
    profileName: PASSENGER_PROFILES[profileId]?.name || profileId,
    totalCandidatesEvaluated: evaluations.length,
    feasibleCandidatesCount: evaluations.filter(e => e.isFeasible).length,
    rankedCandidates: evaluations
  };
}

module.exports = {
  rankJourneysForPersona
};
