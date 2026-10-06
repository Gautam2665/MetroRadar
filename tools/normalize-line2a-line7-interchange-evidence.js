const fs = require('fs');
const path = require('path');

const registryPath = path.resolve('datasets/mumbai/network/interchange-complexes.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const byId = new Map(registry.complexes.map((complex) => [complex.complexId, complex]));

function unknown(note) {
  return {
    value: null,
    knowledgeState: 'UNKNOWN_SOURCE_REQUIRED',
    provenance: { note },
  };
}

function scrubConnector(complex, { name, systems, stations, evidence }) {
  complex.name = name;
  complex.participatingSystems = systems;
  complex.participatingStations = stations;
  complex.interchangeType = 'INTERCHANGE_PATH_UNVERIFIED';
  complex.attributes = {
    paidAreaTransfer: unknown('Paid-area continuity is not established by the available source.'),
    requiresAfcRetap: unknown('Current AFC retap instructions are required.'),
    requiresSecurityRescreening: unknown('Current station security instructions are required.'),
    walkingDistanceMeters: unknown('No measured full passenger transfer route is available.'),
    walkingTimeSeconds: unknown('No measured passenger transfer time is available.'),
    outdoorStreetExposure: unknown('Indoor/outdoor route conditions are unverified.'),
    elevatorAvailability: {
      status: 'UNKNOWN',
      knowledgeState: 'UNKNOWN_SOURCE_REQUIRED',
      provenance: { note: 'Step-free continuity across the complete passenger route is unverified.' },
    },
  };
  complex.pathways = [
    {
      pathwayId: `${complex.complexId}-PATH-A-TO-B`,
      from: systems[0],
      to: systems[1],
      elements: ['INTERCHANGE_PATH_UNVERIFIED'],
      walkingSeconds: null,
      knowledgeState: 'UNKNOWN_SOURCE_REQUIRED',
      luggageFrictionLevel: 'UNKNOWN',
      accessibilityStatus: 'UNKNOWN_SOURCE_REQUIRED',
    },
    {
      pathwayId: `${complex.complexId}-PATH-B-TO-A`,
      from: systems[1],
      to: systems[0],
      elements: ['INTERCHANGE_PATH_UNVERIFIED'],
      walkingSeconds: null,
      knowledgeState: 'UNKNOWN_SOURCE_REQUIRED',
      luggageFrictionLevel: 'UNKNOWN',
      accessibilityStatus: 'UNKNOWN_SOURCE_REQUIRED',
    },
  ];
  complex.evidenceSummary = evidence;
}

const dahisar = byId.get('ICX-DAHISAR-EAST');
dahisar.participatingSystems = ['MUMBAI_LINE2A', 'MUMBAI_LINE7', 'MUMBAI_LINE9'];
dahisar.participantsPendingCtm = [{
  systemCode: 'MUMBAI_LINE9',
  stationName: 'Dahisar (East)',
  status: 'OPERATIONAL_STATION_CTM_ID_REQUIRED',
  sourceId: 'SRC-MMRDA-L7-OVERVIEW',
  note: 'MMRDA reports Line 9 Phase I Dahisar East–Kashigaon operating since 2026-04-07; TransitOS does not yet have a Line 9 station entity to bind here.',
}];
dahisar.evidenceSummary = 'Dahisar East is a three-line node (2A, 7, 9). Exact as-built level arrangement, passenger pathways, ticketing boundaries, transfer time, and Line 9 CTM station ID remain unverified.';
dahisar.attributes = {
  paidAreaTransfer: unknown('Paid-area continuity among the three lines is unverified.'),
  requiresAfcRetap: unknown('Current AFC rules for transfers among all three lines are unverified.'),
  requiresSecurityRescreening: unknown('Current security path among the three lines is unverified.'),
  walkingDistanceMeters: unknown('No measured route across all interchange movements is available.'),
  walkingTimeSeconds: unknown('No measured transfer time is available.'),
  outdoorStreetExposure: unknown('The complete transfer paths are unverified.'),
  elevatorAvailability: { status: 'UNKNOWN', knowledgeState: 'UNKNOWN_SOURCE_REQUIRED', provenance: { note: 'As-built terminal levels and continuous step-free pathways are unverified.' } },
};
dahisar.pathways = [
  ['MUMBAI_LINE2A', 'MUMBAI_LINE7'], ['MUMBAI_LINE7', 'MUMBAI_LINE2A'],
  ['MUMBAI_LINE2A', 'MUMBAI_LINE9'], ['MUMBAI_LINE9', 'MUMBAI_LINE2A'],
  ['MUMBAI_LINE7', 'MUMBAI_LINE9'], ['MUMBAI_LINE9', 'MUMBAI_LINE7'],
].map(([from, to]) => ({
  pathwayId: `PATH-DAHISAR-${from}-TO-${to}`,
  from,
  to,
  elements: ['INTERCHANGE_PATH_UNVERIFIED'],
  walkingSeconds: null,
  knowledgeState: 'UNKNOWN_SOURCE_REQUIRED',
  luggageFrictionLevel: 'UNKNOWN',
  accessibilityStatus: 'UNKNOWN_SOURCE_REQUIRED',
}));
dahisar.pathway = (dahisar.pathway || []).map((segment) => ({
  ...segment,
  distanceMeters: null,
  sourceState: 'UNKNOWN_SOURCE_REQUIRED',
}));

scrubConnector(byId.get('ICX-DN-NAGAR'), {
  name: 'D.N. Nagar (Line 1) / Andheri West (Line 2A) Interchange',
  systems: ['MUMBAI_LINE1', 'MUMBAI_LINE2A'],
  stations: ['STN_L1_002', 'STN_L2A_017'],
  evidence: 'MMRDA confirms Andheri West Line 2A is connected to D.N. Nagar. Detailed transfer route, levels beyond the announced Andheri West levels, route distance/time, fare boundary, AFC, security and accessibility remain unverified.',
});
const dn = byId.get('ICX-DN-NAGAR');
dn.attributes.andheriWestLevelCount = {
  value: 3,
  knowledgeState: 'KNOWN_FROM_ENGINEERING',
  provenance: { sourceId: 'SRC-MMRDA-ANDHERI-WEST-3LEVEL-2023', evidence: 'MMRDA identifies Property Development, Concourse, and Platform levels at Andheri West.' },
};
dn.pathway = (dn.pathway || []).map((segment) => ({ ...segment, sourceState: 'UNKNOWN_SOURCE_REQUIRED', distanceMeters: null }));

scrubConnector(byId.get('ICX-WEH-GUNDAVALI'), {
  name: 'Western Express Highway (Line 1) / Gundavali (Line 7) Interchange',
  systems: ['MUMBAI_LINE1', 'MUMBAI_LINE7'],
  stations: ['STN_L1_005', 'STN_L7_014'],
  evidence: 'MMRDA confirms an FOB link and a 58 m structural span (4–8 m wide). This is not the complete passenger walking distance or time. Ticketing, security, covering, travelators and step-free continuity remain unverified.',
});
const weh = byId.get('ICX-WEH-GUNDAVALI');
weh.attributes.fobBridgeSpanMeters = {
  value: 58,
  knowledgeState: 'KNOWN_FROM_ENGINEERING',
  provenance: { sourceId: 'SRC-MMRDA-GUNDAVALI-FOB-2022', evidence: 'MMRDA announcement gives the FOB structural length as 58 m.' },
};
weh.pathway = (weh.pathway || []).map((segment) => {
  if (segment.segmentId === 'SEG_WEH_FOB_SPAN') {
    return {
      ...segment,
      structureLengthMeters: 58,
      distanceMeters: undefined,
      sourceState: 'KNOWN_FROM_ENGINEERING',
      provenance: { sourceId: 'SRC-MMRDA-GUNDAVALI-FOB-2022', evidence: '58 m structural bridge span; not total passenger transfer route.' },
    };
  }
  return { ...segment, sourceState: 'UNKNOWN_SOURCE_REQUIRED', distanceMeters: null };
});

registry.lastUpdated = '2026-10-05';
registry.description = 'Mumbai network interchange complexes with attributed evidence; unknown pathway and fare attributes are retained as null until operator wayfinding, AFC evidence, as-built plans, or a survey establishes them.';
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log('Normalized evidence states for the three Line 2A/Line 7 interchange hubs.');
