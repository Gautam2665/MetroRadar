const fs = require('fs');
const path = require('path');

const icxPath = path.resolve(__dirname, '../datasets/mumbai/network/interchange-complexes.json');
let icxData = null;

function getIcxRegistry() {
  if (!icxData) {
    icxData = JSON.parse(fs.readFileSync(icxPath, 'utf8'));
  }
  return icxData;
}

/**
 * Enriches candidate journey transfer legs with physical interchange complex data.
 * Pure function: takes candidate, returns enriched candidate without altering topology.
 */
function enrichJourneyWithInterchanges(journey) {
  const registry = getIcxRegistry();
  const complexesMap = new Map();
  registry.complexes.forEach(c => complexesMap.set(c.complexId, c));

  const enrichedLegs = journey.legs.map(leg => {
    if (leg.type !== 'TRANSFER') {
      return leg;
    }

    const complex = complexesMap.get(leg.corridorId);
    if (!complex) {
      return {
        ...leg,
        interchangeEnrichment: {
          status: 'UNREGISTERED_INTERCHANGE',
          paidAreaTransfer: false,
          requiresSecurityRescreening: true,
          requiresAfcRetap: true,
          elevatorAvailability: 'UNKNOWN'
        }
      };
    }

    // Find directional pathway if available
    const pathway = complex.pathways.find(p => 
      (p.from === leg.fromCorridorId && p.to === leg.toCorridorId) ||
      (p.pathwayId && p.pathwayId.toLowerCase().includes(leg.direction || ''))
    ) || complex.pathways[0];

    return {
      ...leg,
      interchangeEnrichment: {
        complexId: complex.complexId,
        complexName: complex.name,
        interchangeType: complex.interchangeType,
        attributes: {
          paidAreaTransfer: complex.attributes.paidAreaTransfer?.value ?? false,
          requiresAfcRetap: complex.attributes.requiresAfcRetap?.value ?? true,
          requiresSecurityRescreening: complex.attributes.requiresSecurityRescreening?.value ?? true,
          verticalDropMeters: complex.attributes.verticalDropMeters?.value ?? 0,
          outdoorStreetExposure: complex.attributes.outdoorStreetExposure?.value ?? false,
          elevatorAvailability: complex.attributes.elevatorAvailability?.status ?? 'UNKNOWN',
          escalatorDirectionality: complex.attributes.escalatorDirectionality?.status ?? 'UNKNOWN',
          walkingDistanceMeters: complex.attributes.walkingDistanceMeters?.value ?? null
        },
        pathway: pathway ? {
          pathwayId: pathway.pathwayId,
          elements: pathway.elements,
          luggageFrictionLevel: pathway.luggageFrictionLevel,
          accessibilityStatus: pathway.accessibilityStatus,
          knowledgeState: pathway.knowledgeState
        } : null
      }
    };
  });

  return {
    ...journey,
    legs: enrichedLegs
  };
}

module.exports = {
  enrichJourneyWithInterchanges,
  getIcxRegistry
};
