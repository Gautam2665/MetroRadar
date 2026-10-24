require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findNearestJunction() {
  const edges = await prisma.$queryRawUnsafe(`
    SELECT from_node_id::text as u, to_node_id::text as v, ST_AsGeoJSON(geom) as geojson
    FROM pedestrian_network
    WHERE is_active = true AND highway_type != 'steps' AND is_elevated_fob = false;
  `);

  // Target: Gate 1 [72.8306729, 19.1283029]
  const g1Lat = 19.1283029, g1Lon = 72.8306729;

  let bestNode = null;
  let bestDist = Infinity;
  let bestCoord = null;

  for (const e of edges) {
    const geo = JSON.parse(e.geojson);
    const coords = geo.coordinates;
    const startPt = coords[0];
    const endPt = coords[coords.length - 1];

    if (e.u !== '12319820409' && e.u !== '10287252380') {
      const dStart = haversine(g1Lat, g1Lon, startPt[1], startPt[0]);
      if (dStart < bestDist) {
        bestDist = dStart;
        bestNode = e.u;
        bestCoord = startPt;
      }
    }

    if (e.v !== '12319820409' && e.v !== '10287252380') {
      const dEnd = haversine(g1Lat, g1Lon, endPt[1], endPt[0]);
      if (dEnd < bestDist) {
        bestDist = dEnd;
        bestNode = e.v;
        bestCoord = endPt;
      }
    }
  }

  console.log(`Nearest active street network junction node to Gate 1 is: ${bestNode}`);
  console.log(`  Distance: ${bestDist.toFixed(1)}m`);
  console.log(`  Coords: [${bestCoord}]`);

  await prisma.$disconnect();
}

findNearestJunction().catch(console.error);
