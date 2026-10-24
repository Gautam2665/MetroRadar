require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const { DatabaseService } = require(path.resolve('apps/backend/dist/database/database.service'));
  const { IsochroneService } = require(path.resolve('apps/backend/dist/modules/analytics/services/isochrone.service'));

  const db = new DatabaseService();
  const isochroneService = new IsochroneService(db);

  console.log('=== 1. DIAGNOSING CATCHMENT FOR D. N. NAGAR ===');
  const catchment = await isochroneService.getStationCatchment('D. N. Nagar', [5, 10]);
  console.log('Station:', catchment.station.name, catchment.station.code);
  console.log('Active Entrances:', catchment.station.activeEntrancesCount);
  console.log('Entrances:', catchment.station.entrances);

  console.log('\nIsochrones:');
  for (const iso of catchment.isochrones) {
    console.log(`- ${iso.minutes} mins (${iso.seconds}s):`);
    console.log(`  reachedEdgesCount: ${iso.reachedEdgesCount}`);
    console.log(`  walkableNetworkLengthKm: ${iso.walkableNetworkLengthKm} km`);
    console.log(`  networkAreaSqKm: ${iso.networkAreaSqKm} km²`);
    console.log(`  euclideanAreaSqKm: ${iso.euclideanAreaSqKm} km²`);
    console.log(`  severanceRatio: ${iso.severanceRatio} (${Math.round(iso.severanceRatio * 100)}%)`);
    console.log(`  hasPolygon: ${!!iso.polygonGeoJson}`);
    console.log(`  reachedEdgeIds:`, iso.reachedEdgesGeoJson.features.map(f => ({
      id: f.properties.id,
      osmId: f.properties.osmId,
      highwayType: f.properties.highwayType,
      isElevatedFob: f.properties.isElevatedFob,
      length: f.properties.lengthMeters,
      accessSec: f.properties.minAccessSeconds
    })));
  }

  console.log('\n=== 2. DIAGNOSING PEDESTRIAN NETWORK GEOJSON ===');
  const net = await isochroneService.getPedestrianNetworkGeoJson();
  console.log('Metadata:', net.metadata);
  
  // Find all FOB edges
  const fobEdges = net.features.filter(f => f.properties.isElevatedFob);
  console.log(`Elevated FOB edges count: ${fobEdges.length}`);
  for (const f of fobEdges) {
    console.log(`- Edge ${f.properties.id}: osmId=${f.properties.osmId}, length=${f.properties.lengthMeters}m, coords=${JSON.stringify(f.geometry.coordinates)}`);
  }

  console.log('\n=== 3. ALL EDGES IN DN_NAGAR_ANDHERI_WEST ===');
  const dnEdges = await prisma.$queryRawUnsafe(`
    SELECT id, osm_id, from_node_id::text, to_node_id::text, highway_type, is_elevated_fob, length_meters
    FROM pedestrian_network
    WHERE study_area = 'DN_NAGAR_ANDHERI_WEST'
    ORDER BY id;
  `);
  console.table(dnEdges);

  // Let's see which nodes are connected to which
  const nodeConnections = {};
  for (const e of dnEdges) {
    nodeConnections[e.from_node_id] = nodeConnections[e.from_node_id] || [];
    nodeConnections[e.from_node_id].push({ to: e.to_node_id, id: e.id, osm: e.osm_id });
    nodeConnections[e.to_node_id] = nodeConnections[e.to_node_id] || [];
    nodeConnections[e.to_node_id].push({ to: e.from_node_id, id: e.id, osm: e.osm_id });
  }

  // Find connected components among dnEdges
  const visited = new Set();
  const components = [];
  for (const node of Object.keys(nodeConnections)) {
    if (visited.has(node)) continue;
    const comp = [];
    const queue = [node];
    visited.add(node);
    while (queue.length > 0) {
      const curr = queue.shift();
      comp.push(curr);
      for (const nxt of nodeConnections[curr]) {
        if (!visited.has(nxt.to)) {
          visited.add(nxt.to);
          queue.push(nxt.to);
        }
      }
    }
    components.push(comp);
  }
  console.log(`Connected components in DN_NAGAR_ANDHERI_WEST: ${components.length}`);
  components.forEach((c, idx) => {
    console.log(`Component ${idx + 1}: ${c.length} nodes:`, c);
  });

  await prisma.$disconnect();
}

run().catch(console.error);
