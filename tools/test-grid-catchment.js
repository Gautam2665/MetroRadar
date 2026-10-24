const fs = require('fs');
const path = require('path');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) * Math.sin(dphi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateLineLengthMeters(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineMeters(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return total;
}

function runSimulation() {
  console.log('=== TESTING WALKABLE GRID TOPOLOGY & DIJKSTRA CATCHMENT ===');
  const rawData = JSON.parse(fs.readFileSync('datasets/mumbai/pedestrian/osm_dn_nagar_full_walkable.json', 'utf8'));
  const ways = rawData.elements.filter(e => e.type === 'way');
  console.log(`Loaded ${ways.length} OSM ways.`);

  // Node frequency to identify junctions
  const nodeCounts = new Map();
  for (const w of ways) {
    if (!w.nodes) continue;
    for (const n of w.nodes) {
      nodeCounts.set(n, (nodeCounts.get(n) || 0) + 1);
    }
  }

  const edges = [];
  let edgeId = 1;

  for (const w of ways) {
    if (!w.nodes || !w.geometry || w.nodes.length < 2) continue;
    const hw = w.tags?.highway || 'footway';
    const isSteps = hw === 'steps';
    const isBridge = w.tags?.bridge === 'yes';
    const isCrossing = w.tags?.footway === 'crossing';

    let segStartIdx = 0;
    for (let i = 1; i < w.nodes.length; i++) {
      const n = w.nodes[i];
      if (nodeCounts.get(n) > 1 || i === w.nodes.length - 1) {
        // Create edge from segStartIdx to i
        const segNodes = w.nodes.slice(segStartIdx, i + 1);
        const segGeom = w.geometry.slice(segStartIdx, i + 1);
        const coords = segGeom.map(pt => [pt.lon, pt.lat]);
        const lengthM = calculateLineLengthMeters(coords);

        let traversalTime = 0;
        if (isSteps) traversalTime = lengthM / 0.6 + 15;
        else if (isCrossing) traversalTime = lengthM / 1.2 + 10;
        else traversalTime = lengthM / 1.2;

        edges.push({
          id: `EDGE_${edgeId++}`,
          osmId: w.id,
          from: segNodes[0].toString(),
          to: segNodes[segNodes.length - 1].toString(),
          lengthM,
          traversalTime,
          coords,
          isElevatedFob: isBridge,
          highwayType: hw,
        });

        segStartIdx = i;
      }
    }
  }
  console.log(`Created ${edges.length} junction-to-junction street edges.`);

  // Add skywalk connector (Provisional)
  // Node 12319820407 (D.N. Nagar Footbridge East Landing) -> Node 9900000002 (Andheri West Concourse)
  const skywalkCoords = [
    [72.8310809, 19.1283359],
    [72.8310700, 19.1288390],
    [72.8310650, 19.1293390],
  ];
  const skywalkLen = calculateLineLengthMeters(skywalkCoords);
  edges.push({
    id: `EDGE_PROVISIONAL_SKYWALK`,
    osmId: 9900000001,
    from: '12319820407',
    to: '9900000002',
    lengthM: skywalkLen,
    traversalTime: skywalkLen / 1.2,
    coords: skywalkCoords,
    isElevatedFob: true,
    highwayType: 'footway',
    sourceType: 'PROVISIONAL_SYNTHESIZED'
  });

  // Connect staircase landings to J.P. Road street nodes (short entrance access connectors)
  const connectors = [
    { from: '6249729380', to: '7157873783', len: 28.1 }, // Gate 4 to JP Road South
    { from: '6249729379', to: '7157873781', len: 6.4 },  // Gate 2 to JP Road North
    { from: '12319820409', to: '10287252380', len: 27.0 }, // Gate 1 to JP Road North-West
    { from: '9900000002', to: '14197852601', len: 22.0 },  // Andheri West Concourse to Platform
  ];
  for (const c of connectors) {
    edges.push({
      id: `CONNECTOR_${c.from}_${c.to}`,
      osmId: 9990000000,
      from: c.from,
      to: c.to,
      lengthM: c.len,
      traversalTime: c.len / 1.2,
      coords: [],
      isElevatedFob: false,
      highwayType: 'footway',
    });
  }

  // Build Adjacency Graph
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from).push({ to: e.to, weight: e.traversalTime, edge: e });
    adj.get(e.to).push({ to: e.from, weight: e.traversalTime, edge: e });
  }

  // Multi-source Dijkstra from D.N. Nagar entrances:
  // Gate 4: 6249729380, Gate 1: 12319820409, Gate 2: 3389153385
  const startNodes = [
    { node: '6249729380', cost: 0 },
    { node: '12319820409', cost: 8.22 / 1.2 },
    { node: '3389153385', cost: 9.47 / 1.2 },
  ];

  const dist = new Map();
  const pq = [];
  for (const s of startNodes) {
    dist.set(s.node, s.cost);
    pq.push(s);
  }
  pq.sort((a, b) => a.cost - b.cost);

  while (pq.length > 0) {
    const curr = pq.shift();
    if (curr.cost > (dist.get(curr.node) ?? Infinity)) continue;
    const neighbors = adj.get(curr.node) || [];
    for (const nb of neighbors) {
      const nCost = curr.cost + nb.weight;
      if (!dist.has(nb.to) || nCost < dist.get(nb.to)) {
        dist.set(nb.to, nCost);
        pq.push({ node: nb.to, cost: nCost });
        pq.sort((a, b) => a.cost - b.cost);
      }
    }
  }

  for (const mins of [5, 10]) {
    const targetSec = mins * 60;
    const reachedEdges = new Set();
    let totalLenM = 0;

    for (const e of edges) {
      const c1 = dist.get(e.from);
      const c2 = dist.get(e.to);
      const minC = Math.min(c1 !== undefined ? c1 : Infinity, c2 !== undefined ? c2 : Infinity);
      if (minC <= targetSec) {
        reachedEdges.add(e.id);
        totalLenM += e.lengthM;
      }
    }

    const euclideanRadius = targetSec * 1.2;
    const euclideanArea = (Math.PI * Math.pow(euclideanRadius, 2)) / 1000000;
    // Approximating 45m street buffer area as ~ totalLength * 70m / 1e6
    const approxBufferArea = (totalLenM * 60) / 1000000;
    const severance = Math.max(0, Math.min(1, 1 - (approxBufferArea / euclideanArea)));

    console.log(`\n--- ${mins} Minutes (${targetSec}s) ---`);
    console.log(`Reached Edges Count: ${reachedEdges.size}`);
    console.log(`Total Walkable Network Length: ${(totalLenM / 1000).toFixed(2)} km`);
    console.log(`Approx Catchment Area: ${approxBufferArea.toFixed(4)} km²`);
    console.log(`Euclidean Area: ${euclideanArea.toFixed(4)} km²`);
    console.log(`Severance Ratio: ${(severance * 100).toFixed(1)}%`);
  }
}

runSimulation();
