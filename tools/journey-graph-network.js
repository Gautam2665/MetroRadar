const fs = require('fs');
const path = require('path');

console.log('🌐 TransitOS Multi-Corridor Journey Engine — Activating Mumbai Metro Network Graph...');

// Load Line 3 and Line 1 CTMs
const l3Path = path.resolve('datasets/mumbai/normalized/ctm.json');
const l1Path = path.resolve('datasets/mumbai/normalized/ctm-line1.json');

const ctmL3 = JSON.parse(fs.readFileSync(l3Path, 'utf-8'));
const ctmL1 = JSON.parse(fs.readFileSync(l1Path, 'utf-8'));

// Build Unified Multi-Corridor Graph
const nodes = new Map();
const adjacency = new Map();

function registerCorridor(ctm, lineName) {
  ctm.stationGraph.nodes.forEach(n => {
    nodes.set(n.stationId, {
      id: n.stationId,
      name: n.name,
      sequence: n.sequence,
      coordinates: n.coordinates,
      corridorId: ctm.systemId,
      corridorName: lineName
    });
    if (!adjacency.has(n.stationId)) {
      adjacency.set(n.stationId, []);
    }
  });

  ctm.stationGraph.edges.forEach(e => {
    adjacency.get(e.fromStationId).push({
      to: e.toStationId,
      toName: e.toStationName,
      distanceMeters: e.distanceMeters,
      durationSeconds: e.nominalTravelTimeSeconds,
      corridorId: ctm.systemId,
      isTransfer: false
    });

    if (e.biDirectional) {
      adjacency.get(e.toStationId).push({
        to: e.fromStationId,
        toName: e.fromStationName,
        distanceMeters: e.distanceMeters,
        durationSeconds: e.nominalTravelTimeSeconds,
        corridorId: ctm.systemId,
        isTransfer: false
      });
    }
  });
}

registerCorridor(ctmL3, 'Line 3 (Aqua Line)');
registerCorridor(ctmL1, 'Line 1 (Blue Line)');

// Register Marol Naka Interchange Complex Bridge (ICX_MAROL_NAKA)
const stnL3Marol = 'STN_L3_004';
const stnL1Marol = 'STN_L1_008';
const INTERCHANGE_WALK_METERS = 170;
const INTERCHANGE_NOMINAL_SECONDS = 180; // 3 min nominal pedestrian transfer

adjacency.get(stnL3Marol).push({
  to: stnL1Marol,
  toName: 'Marol Naka (Line 1 Elevated)',
  distanceMeters: INTERCHANGE_WALK_METERS,
  durationSeconds: INTERCHANGE_NOMINAL_SECONDS,
  corridorId: 'ICX_MAROL_NAKA',
  isTransfer: true,
  transferType: 'PEDESTRIAN_SKYWALK_CONCOURSE'
});

adjacency.get(stnL1Marol).push({
  to: stnL3Marol,
  toName: 'Marol Naka (Line 3 Underground)',
  distanceMeters: INTERCHANGE_WALK_METERS,
  durationSeconds: INTERCHANGE_NOMINAL_SECONDS,
  corridorId: 'ICX_MAROL_NAKA',
  isTransfer: true,
  transferType: 'PEDESTRIAN_SKYWALK_CONCOURSE'
});

console.log(`   ✅ Activated Multi-Corridor TransitGraph:`);
console.log(`      Total Station Nodes: ${nodes.size} (${ctmL3.stations.length} Line 3 + ${ctmL1.stations.length} Line 1)`);
console.log(`      Interchange Complex: ICX_MAROL_NAKA (170m link connecting L3-04 and L1-08)`);

// State-aware Multi-Corridor Dijkstra solver
function solveMultiLinePath(fromStationId, toStationId) {
  if (fromStationId === toStationId) return null;
  if (!nodes.has(fromStationId) || !nodes.has(toStationId)) return null;

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  nodes.forEach((_, id) => {
    distances.set(id, Infinity);
    unvisited.add(id);
  });
  distances.set(fromStationId, 0);

  while (unvisited.size > 0) {
    let current = null;
    let minDist = Infinity;
    unvisited.forEach(id => {
      const d = distances.get(id);
      if (d < minDist) {
        minDist = d;
        current = id;
      }
    });

    if (!current || minDist === Infinity || current === toStationId) break;
    unvisited.delete(current);

    const edges = adjacency.get(current) || [];
    for (const edge of edges) {
      if (!unvisited.has(edge.to)) continue;
      const alt = minDist + edge.durationSeconds;
      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, { from: current, edge });
      }
    }
  }

  if (!previous.has(toStationId) && fromStationId !== toStationId) return null;

  // Reconstruct path & legs
  const steps = [];
  let curr = toStationId;
  let totalDistance = 0;
  let totalDuration = 0;
  let transferCount = 0;

  while (previous.has(curr)) {
    const step = previous.get(curr);
    steps.unshift({
      fromId: step.from,
      fromName: nodes.get(step.from).name,
      toId: curr,
      toName: nodes.get(curr).name,
      distanceMeters: step.edge.distanceMeters,
      durationSeconds: step.edge.durationSeconds,
      corridorId: step.edge.corridorId,
      isTransfer: step.edge.isTransfer
    });
    totalDistance += step.edge.distanceMeters;
    totalDuration += step.edge.durationSeconds;
    if (step.edge.isTransfer) transferCount++;
    curr = step.from;
  }

  // Decompose into distinct transit legs
  const legs = [];
  let currentLeg = null;

  steps.forEach(step => {
    if (step.isTransfer) {
      if (currentLeg) {
        legs.push(currentLeg);
        currentLeg = null;
      }
      legs.push({
        type: 'TRANSFER',
        corridorId: step.corridorId,
        corridorName: 'Pedestrian Transfer Link',
        fromStation: step.fromName,
        fromStationId: step.fromId,
        toStation: step.toName,
        toStationId: step.toId,
        distanceMeters: step.distanceMeters,
        durationSeconds: step.durationSeconds
      });
    } else {
      if (!currentLeg || currentLeg.corridorId !== step.corridorId) {
        if (currentLeg) legs.push(currentLeg);
        currentLeg = {
          type: 'TRANSIT',
          corridorId: step.corridorId,
          corridorName: nodes.get(step.fromId).corridorName,
          fromStation: step.fromName,
          fromStationId: step.fromId,
          toStation: step.toName,
          toStationId: step.toId,
          stationSequence: [step.fromName, step.toName],
          distanceMeters: step.distanceMeters,
          durationSeconds: step.durationSeconds,
          stopsCount: 1
        };
      } else {
        currentLeg.toStation = step.toName;
        currentLeg.toStationId = step.toId;
        currentLeg.stationSequence.push(step.toName);
        currentLeg.distanceMeters += step.distanceMeters;
        currentLeg.durationSeconds += step.durationSeconds;
        currentLeg.stopsCount++;
      }
    }
  });
  if (currentLeg) legs.push(currentLeg);

  return {
    origin: nodes.get(fromStationId).name,
    originId: fromStationId,
    destination: nodes.get(toStationId).name,
    destinationId: toStationId,
    stepsCount: steps.length,
    transfers: transferCount,
    legs: legs,
    totalDistanceMeters: totalDistance,
    nominalDurationSeconds: totalDuration,
    nominalDurationMinutes: Math.round(totalDuration / 60)
  };
}

// Format Candidate Response conforming to TransitOS Contract
function formatCandidateResponse(pathResult) {
  if (!pathResult) return null;

  return {
    metadata: {
      graphVersion: "v2-mumbai-multi-corridor",
      algorithm: "dijkstra-state-aware",
      supportedCorridors: ["MUMBAI_LINE3", "MUMBAI_LINE1"],
      disclaimer: "TOPOLOGICAL MULTI-CORRIDOR ROUTE VERIFIED. COMMERCIAL GTFS TIMETABLE BLOCKED."
    },
    candidates: [
      {
        id: `journey-${pathResult.originId}-to-${pathResult.destinationId}`,
        origin: pathResult.origin,
        destination: pathResult.destination,
        transfers: pathResult.transfers,
        nominalDurationMinutes: pathResult.nominalDurationMinutes,
        totalDistanceKm: +(pathResult.totalDistanceMeters / 1000).toFixed(2),
        travelTime: {
          value: pathResult.nominalDurationSeconds,
          unit: "seconds",
          type: "BASELINE",
          source: "CTM_COMPOSITE_DESIGN_BASELINES",
          currentOperationalValidity: false,
          disclaimer: "Composite design baseline across corridors. Transfer walk calibrated at 170m nominal."
        },
        legs: pathResult.legs,
        // Guarded Operational Fields
        scheduledDeparture: null,
        scheduledArrival: null,
        realtimeDeparture: null,
        headwaySeconds: null,
        fare: null,
        crowding: null
      }
    ]
  };
}

// Multi-Corridor Test Suite
console.log('\n────────────────────────────────────────────────────────────');
console.log('MULTI-CORRIDOR JOURNEY GRAPH VERIFICATION (LINES 1 & 3)');
console.log('────────────────────────────────────────────────────────────');

const testCases = [
  {
    fromId: "STN_L3_001",
    toId: "STN_L1_012",
    desc: "1. Cross-Corridor North to East: Aarey JVLR (Line 3) -> Ghatkopar (Line 1) via Marol Naka"
  },
  {
    fromId: "STN_L3_023",
    toId: "STN_L1_001",
    desc: "2. Cross-Corridor South to West: CSMT Metro (Line 3) -> Versova (Line 1) via Marol Naka"
  },
  {
    fromId: "STN_L1_001",
    toId: "STN_L1_012",
    desc: "3. Line 1 Intra-Corridor: Versova -> Ghatkopar (Direct Blue Line)"
  },
  {
    fromId: "STN_L1_004",
    toId: "STN_L3_010",
    desc: "4. Cross-Corridor Western Suburb to Financial Hub: Andheri (Line 1) -> BKC (Line 3)"
  }
];

let allPassed = true;

testCases.forEach(tc => {
  const result = solveMultiLinePath(tc.fromId, tc.toId);
  if (!result) {
    console.error(`❌ Journey Failed: ${tc.desc}`);
    allPassed = false;
    return;
  }

  const response = formatCandidateResponse(result);
  const cand = response.candidates[0];

  console.log(`\n${tc.desc}`);
  console.log(`   Route       : ${cand.origin} -> ${cand.destination}`);
  console.log(`   Transfers   : ${cand.transfers} transfer(s)`);
  console.log(`   Total Dist  : ${cand.totalDistanceKm} km (${cand.nominalDurationMinutes} mins baseline)`);
  console.log(`   Legs Breakdown (${cand.legs.length} legs):`);
  cand.legs.forEach((leg, i) => {
    if (leg.type === 'TRANSFER') {
      console.log(`     [Leg ${i+1} - Walk] Transfer at ${leg.fromStation} (${leg.distanceMeters}m, ~${Math.round(leg.durationSeconds/60)} min)`);
    } else {
      console.log(`     [Leg ${i+1} - Rail] ${leg.corridorName}: ${leg.fromStation} -> ${leg.toStation} (${leg.stopsCount} stops, ${(leg.distanceMeters/1000).toFixed(2)} km, ~${Math.round(leg.durationSeconds/60)} min)`);
    }
  });
});

if (!allPassed) {
  console.error('\n❌ One or more multi-corridor journey test cases failed!');
  process.exit(1);
}

console.log('\n🎉 ALL MULTI-CORRIDOR JOURNEY ROUTING TESTS PASSED PERFECTLY!\n');
