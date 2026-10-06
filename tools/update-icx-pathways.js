const fs = require('fs');
const path = require('path');

const icxPath = path.resolve('datasets/mumbai/network/interchange-complexes.json');
const icx = JSON.parse(fs.readFileSync(icxPath, 'utf8'));

// 1. Update ICX-WEH-GUNDAVALI
const icxWeh = icx.complexes.find(c => c.complexId === 'ICX-WEH-GUNDAVALI');
if (icxWeh) {
  icxWeh.participatingStations = ['STN_L1_005', 'STN_L7_014'];
  icxWeh.attributes.walkingDistanceMeters = {
    value: null,
    knowledgeState: "UNKNOWN_SOURCE_REQUIRED",
    provenance: {
      note: "Full platform-to-platform walking distance unmeasured. Structural FOB across highway is 58m."
    }
  };
  delete icxWeh.attributes.travelatorInstalled;
  icxWeh.attributes.fobBridgeSpanMeters = {
    value: 58,
    knowledgeState: "KNOWN_FROM_ENGINEERING",
    provenance: {
      sourceId: "SRC-MMRDA-CIVIL-TENDER-L7",
      evidence: "MMRDA Line 7 as-built engineering package for Western Express Highway Foot Overbridge"
    }
  };
  icxWeh.pathway = [
    {
      segmentId: "SEG_WEH_L7_PF_TO_CONCOURSE",
      from: "L7_PLATFORM",
      to: "L7_CONCOURSE",
      type: "VERTICAL",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_WEH_L7_CONCOURSE_TO_FOB",
      from: "L7_CONCOURSE",
      to: "FOB",
      type: "PEDESTRIAN",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_WEH_FOB_SPAN",
      from: "FOB",
      to: "L1_CONCOURSE",
      type: "FOB",
      structureLengthMeters: 58,
      sourceState: "KNOWN_FROM_ENGINEERING",
      provenance: {
        sourceId: "SRC-MMRDA-CIVIL-TENDER-L7",
        evidence: "58m structural FOB spanning Western Express Highway"
      }
    },
    {
      segmentId: "SEG_WEH_L1_CONCOURSE_TO_PF",
      from: "L1_CONCOURSE",
      to: "L1_PLATFORM",
      type: "VERTICAL",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    }
  ];
}

// 2. Update ICX-DN-NAGAR
const icxDnn = icx.complexes.find(c => c.complexId === 'ICX-DN-NAGAR');
if (icxDnn) {
  icxDnn.participatingStations = ['STN_L1_002', 'STN_L2A_017'];
  icxDnn.attributes.walkingDistanceMeters = {
    value: null,
    knowledgeState: "UNKNOWN_SOURCE_REQUIRED",
    provenance: {
      note: "Platform-to-platform internal distance unmeasured pending footway survey"
    }
  };
  icxDnn.pathway = [
    {
      segmentId: "SEG_DNN_L2A_PF_TO_CONCOURSE",
      from: "L2A_PLATFORM",
      to: "L2A_CONCOURSE",
      type: "VERTICAL",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_DNN_L2A_CONCOURSE_TO_FOB",
      from: "L2A_CONCOURSE",
      to: "FOB",
      type: "PEDESTRIAN",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_DNN_FOB_SPAN",
      from: "FOB",
      to: "L1_CONCOURSE",
      type: "FOB",
      structureLengthMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_DNN_L1_CONCOURSE_TO_PF",
      from: "L1_CONCOURSE",
      to: "L1_PLATFORM",
      type: "VERTICAL",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    }
  ];
}

// 3. Update ICX-DAHISAR-EAST
const icxDah = icx.complexes.find(c => c.complexId === 'ICX-DAHISAR-EAST');
if (icxDah) {
  icxDah.participatingStations = [...new Set([
    ...(icxDah.participatingStations || []),
    'STN_L2A_001',
    'STN_L7_001',
  ])];
  icxDah.attributes.walkingDistanceMeters = {
    value: null,
    knowledgeState: "UNKNOWN_SOURCE_REQUIRED",
    provenance: {
      note: "Transfer route and distance have not been verified from an authoritative station layout or survey."
    }
  };
  icxDah.pathway = [
    {
      segmentId: "SEG_DAH_L2A_PF_TO_CONCOURSE",
      from: "L2A_PLATFORM",
      to: "INTERCHANGE_AREA_UNVERIFIED",
      type: "VERTICAL",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_DAH_CROSS_CONCOURSE",
      from: "INTERCHANGE_AREA_UNVERIFIED",
      to: "INTERCHANGE_AREA_UNVERIFIED",
      type: "PEDESTRIAN",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    },
    {
      segmentId: "SEG_DAH_CONCOURSE_TO_L7_PF",
      from: "INTERCHANGE_AREA_UNVERIFIED",
      to: "L7_PLATFORM",
      type: "VERTICAL",
      distanceMeters: null,
      sourceState: "UNKNOWN_SOURCE_REQUIRED"
    }
  ];
}

fs.writeFileSync(icxPath, JSON.stringify(icx, null, 2), 'utf8');
console.log('✅ Updated ICX Registry with explainable segmented pedestrian transfer pathways.');
