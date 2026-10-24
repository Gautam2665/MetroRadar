require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditGateConnectivity() {
  console.log('=== GATE CONNECTIVITY & LEVEL AUDIT FOR D.N. NAGAR ===');

  const station = await prisma.station.findFirst({
    where: { name: { contains: 'D. N. Nagar', mode: 'insensitive' } },
    include: { entrances: { where: { isActive: true } } }
  });

  // Fetch all active edges
  const edges = await prisma.$queryRawUnsafe(`
    SELECT id, osm_id, from_node_id::text, to_node_id::text, length_meters, 
           traversal_time_seconds, level, is_elevated_fob, highway_type
    FROM pedestrian_network
    WHERE is_active = true;
  `);

  const adj = new Map();
  const nodeLevels = new Map();

  for (const e of edges) {
    const u = e.from_node_id;
    const v = e.to_node_id;
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u).push({ to: v, edge: e });
    adj.get(v).push({ to: u, edge: e });

    nodeLevels.set(u, e.level || '0');
    nodeLevels.set(v, e.level || '0');
  }

  // Check each entrance
  for (const ent of station.entrances) {
    const nodeId = ent.snappedNodeId ? ent.snappedNodeId.toString() : null;
    let reachableNodes = 0;
    let isConnected = false;
    let connectedLevel = null;

    if (nodeId && adj.has(nodeId)) {
      // BFS from entrance node
      const visited = new Set([nodeId]);
      const queue = [nodeId];
      while (queue.length > 0) {
        const curr = queue.shift();
        for (const nb of (adj.get(curr) || [])) {
          if (!visited.has(nb.to)) {
            visited.add(nb.to);
            queue.push(nb.to);
          }
        }
      }
      reachableNodes = visited.size;
      isConnected = reachableNodes > 10;
      connectedLevel = nodeLevels.get(nodeId);
    }

    const gateLevel = /concourse|fob|skywalk|bridge/i.test(ent.name) ? '1' : '0';
    const isLevelMatch = connectedLevel === gateLevel;

    console.log(`\nGate: ${ent.name}`);
    console.log(`  Snap Distance: ${ent.snapDistanceMeters}m`);
    console.log(`  Snapped Node: ${nodeId}`);
    console.log(`  Reachable Graph Nodes: ${reachableNodes}`);
    console.log(`  Graph Connected: ${isConnected ? 'YES (Active Component)' : 'NO (Isolated)'}`);
    console.log(`  Gate Expected Level: ${gateLevel} | Snapped Edge Level: ${connectedLevel} (Match: ${isLevelMatch})`);
  }

  console.log('\n=== CHECKING EDGES FOR NODE 10287252380 ===');
  const nodeEdges = await prisma.$queryRawUnsafe(`
    SELECT id, osm_id, from_node_id::text as from_node, to_node_id::text as to_node, highway_type, length_meters
    FROM pedestrian_network
    WHERE is_active = true
      AND (from_node_id = 10287252380 OR to_node_id = 10287252380);
  `);
  console.table(nodeEdges);
}

auditGateConnectivity().catch(console.error);
