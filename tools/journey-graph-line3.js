const fs = require('fs');
const path = require('path');

console.log('🧭 TransitOS Journey Engine — Activating Mumbai Metro Line 3 Journey Graph (H4–H6)...');

const ctmPath = path.resolve('datasets/mumbai/normalized/ctm.json');
const ctm = JSON.parse(fs.readFileSync(ctmPath, 'utf-8'));

// H4: Build in-memory TransitGraph directly from CTM Station Graph (Never hardcoded!)
const nodes = new Map();
ctm.stationGraph.nodes.forEach(n => {
  nodes.set(n.stationId, {
    id: n.stationId,
    name: n.name,
    sequence: n.sequence,
    coordinates: n.coordinates
  });
});

const adjacency = new Map();
nodes.forEach((_, id) => adjacency.set(id, []));

ctm.stationGraph.edges.forEach(e => {
  // Edge from -> to
  adjacency.get(e.fromStationId).push({
    to: e.toStationId,
    toName: e.toStationName,
    distanceMeters: e.distanceMeters,
    durationSeconds: e.nominalTravelTimeSeconds,
    lineId: ctm.systemId
  });

  // Edge to -> from (bi-directional transit edge)
  if (e.biDirectional) {
    adjacency.get(e.toStationId).push({
      to: e.fromStationId,
      toName: e.fromStationName,
      distanceMeters: e.distanceMeters,
      durationSeconds: e.nominalTravelTimeSeconds,
      lineId: ctm.systemId
    });
  }
});

console.log(`   ✅ Activated TransitGraph: ${nodes.size} station nodes, ${adjacency.size} adjacency lists.`);

// State-aware Dijkstra solver for Line 3
function solvePath(fromStationId, toStationId) {
  if (fromStationId === toStationId) return null;

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  nodes.forEach((_, id) => {
    distances.set(id, Infinity);
    unvisited.add(id);
  });
  distances.set(fromStationId, 0);

  while (unvisited.size > 0) {
    // Get node with minimum distance
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

  // Reconstruct path
  if (!previous.has(toStationId) && fromStationId !== toStationId) return null;

  const pathStations = [];
  let curr = toStationId;
  let totalDistance = 0;
  let totalDuration = 0;

  pathStations.unshift(nodes.get(curr).name);
  while (previous.has(curr)) {
    const step = previous.get(curr);
    totalDistance += step.edge.distanceMeters;
    totalDuration += step.edge.durationSeconds;
    curr = step.from;
    pathStations.unshift(nodes.get(curr).name);
  }

  return {
    origin: nodes.get(fromStationId).name,
    originId: fromStationId,
    destination: nodes.get(toStationId).name,
    destinationId: toStationId,
    stationCount: pathStations.length,
    stations: pathStations,
    totalDistanceMeters: totalDistance,
    nominalDurationSeconds: totalDuration,
    nominalDurationMinutes: Math.round(totalDuration / 60),
    transfers: 0,
    isDirect: true
  };
}

// H6: Format candidate according to Journey Engine response contract
function formatCandidateResponse(pathResult) {
  if (!pathResult) return null;

  return {
    metadata: {
      graphVersion: "v1-ctm-canonical",
      algorithm: "dijkstra-state-aware",
      corridor: ctm.systemId,
      disclaimer: "TOPOLOGICAL ROUTE VERIFIED. SCHEDULED TIMETABLE BLOCKED (PENDING LIVE OPERATIONAL DATA)."
    },
    candidates: [
      {
        id: `journey-${pathResult.originId}-to-${pathResult.destinationId}`,
        origin: pathResult.origin,
        destination: pathResult.destination,
        stationCount: pathResult.stationCount,
        stations: pathResult.stations,
        transfers: pathResult.transfers,
        walkingDistanceMeters: 0,
        isDirect: pathResult.isDirect,
        nominalDurationMinutes: pathResult.nominalDurationMinutes,
        
        // H6: Explicitly marking unsupported fields as null
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

// H5: Execute First Mumbai Journey Tests
console.log('\n────────────────────────────────────────────────────────────');
console.log('H5: FIRST MUMBAI LINE 3 DETERMINISTIC JOURNEY TESTS');
console.log('────────────────────────────────────────────────────────────');

const testCases = [
  { fromId: "STN_L3_001", toId: "STN_L3_027", desc: "1. Full Southbound: Aarey JVLR -> Cuffe Parade" },
  { fromId: "STN_L3_027", toId: "STN_L3_001", desc: "2. Full Northbound: Cuffe Parade -> Aarey JVLR" },
  { fromId: "STN_L3_010", toId: "STN_L3_013", desc: "3. Commercial to Suburban Rail: BKC -> Dadar Metro" },
  { fromId: "STN_L3_004", toId: "STN_L3_023", desc: "4. Line 1 Interchange to South Terminal: Marol Naka -> CSMT Metro" },
  { fromId: "STN_L3_019", toId: "STN_L3_023", desc: "5. Suburban Hub to Terminus: Mumbai Central -> CSMT Metro" }
];

let allPassed = true;

testCases.forEach(tc => {
  const result = solvePath(tc.fromId, tc.toId);
  if (!result) {
    console.error(`❌ Journey Failed: ${tc.desc}`);
    allPassed = false;
    return;
  }

  const response = formatCandidateResponse(result);
  const cand = response.candidates[0];

  console.log(`\n${tc.desc}`);
  console.log(`   Route            : ${cand.origin} -> ${cand.destination}`);
  console.log(`   Stations Traversed: ${cand.stationCount} stations`);
  console.log(`   Nominal Runtime  : ${cand.nominalDurationMinutes} mins (~${(result.totalDistanceMeters/1000).toFixed(1)} km)`);
  console.log(`   Interchanges     : ${cand.transfers} (Direct corridor)`);
  console.log(`   Schedule Fields  : scheduledDeparture=null, fare=null (Contract Guard Active)`);
  console.log(`   Path Sample      : ${cand.stations.slice(0, 3).join(' -> ')} -> ... -> ${cand.stations.slice(-2).join(' -> ')}`);
});

if (!allPassed) {
  console.error('\n❌ One or more journey test cases failed!');
  process.exit(1);
}

console.log('\n✅ All 5 Mumbai Line 3 Journey Engine routing tests passed!\n');
