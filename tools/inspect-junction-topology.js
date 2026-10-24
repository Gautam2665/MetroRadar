require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectJunction() {
  const targetNodes = [
    '12319820407', '12319820408', '12319820409',
    '9900000002', '14197852601', '3389153385', '6249729379', '7157873781',
    '6249729380', '7157873783', '10287252380'
  ];
  const nodeInList = targetNodes.map(n => `'${n}'`).join(',');
  const edges = await prisma.$queryRawUnsafe(`
    SELECT id, osm_id, from_node_id::text as from_node, to_node_id::text as to_node, highway_type, 
           is_elevated_fob, level, source_type, length_meters, traversal_time_seconds,
           ST_AsGeoJSON(geom) as geojson
    FROM pedestrian_network
    WHERE is_active = true
      AND (from_node_id::text IN (${nodeInList}) OR to_node_id::text IN (${nodeInList}))
    ORDER BY is_elevated_fob DESC, highway_type;
  `);

  console.log('=== EDGES ATTACHED TO INTERCHANGE NODES ===');
  console.table(edges.map(e => ({
    id: e.id.slice(0, 8),
    osmId: e.osm_id ? e.osm_id.toString() : 'null',
    from: e.from_node,
    to: e.to_node,
    hw: e.highway_type,
    isFob: e.is_elevated_fob,
    level: e.level,
    source: e.source_type,
    len: Number(e.length_meters)
  })));

  // Check the two entrances in question
  const DN_NAGAR_GATE_1 = '356a0950-2469-488b-bf25-1af60ff7a854';
  const ANDHERI_WEST_GATE_1 = '90e8b743-611a-43bc-be89-9927a23ef2a8';

  const entrances = await prisma.entrance.findMany({
    where: { id: { in: [DN_NAGAR_GATE_1, ANDHERI_WEST_GATE_1] } },
    include: { station: true }
  });

  console.log('\n=== ENTRANCE ATTACHMENTS ===');
  for (const ent of entrances) {
    console.log(`Gate: ${ent.station.name} - ${ent.name}`);
    console.log(`  Coords: [${ent.longitude}, ${ent.latitude}]`);
    console.log(`  Snapped Node ID: ${ent.snappedNodeId}`);
    console.log(`  Snap Distance: ${ent.snapDistanceMeters}m`);
  }

  await prisma.$disconnect();
}

inspectJunction().catch(console.error);
