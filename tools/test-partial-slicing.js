require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPartialSlicing() {
  const station = await prisma.station.findFirst({
    where: { name: { contains: 'D. N. Nagar', mode: 'insensitive' } },
    include: { entrances: { where: { isActive: true } } }
  });

  const localEdges = await prisma.$queryRawUnsafe(`
    SELECT id, osm_id, highway_type, length_meters, traversal_time_seconds,
           from_node_id::text as from_node, to_node_id::text as to_node,
           ST_AsGeoJSON(geom) as geojson
    FROM pedestrian_network
    WHERE ST_DWithin(
      geom::geography,
      ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)::geography,
      1500
    ) AND is_active = true;
  `);

  const adj = new Map();
  for (const e of localEdges) {
    if (!adj.has(e.from_node)) adj.set(e.from_node, []);
    if (!adj.has(e.to_node)) adj.set(e.to_node, []);
    adj.get(e.from_node).push({ to: e.to_node, w: Number(e.traversal_time_seconds), e });
    adj.get(e.to_node).push({ to: e.from_node, w: Number(e.traversal_time_seconds), e });
  }

  // Multi-source Dijkstra from all entrance nodes
  const dist = new Map();
  const pq = [];
  for (const ent of station.entrances) {
    if (!ent.snappedNodeId) continue;
    const n = ent.snappedNodeId.toString();
    const snapCost = (ent.snapDistanceMeters ?? 0) / 1.2;
    if (!dist.has(n) || snapCost < dist.get(n)) {
      dist.set(n, snapCost);
      pq.push({ node: n, cost: snapCost });
    }
  }
  pq.sort((a, b) => a.cost - b.cost);

  while (pq.length > 0) {
    const curr = pq.shift();
    if (curr.cost > (dist.get(curr.node) ?? Infinity)) continue;
    for (const nb of (adj.get(curr.node) || [])) {
      const nCost = curr.cost + nb.w;
      if (!dist.has(nb.to) || nCost < dist.get(nb.to)) {
        dist.set(nb.to, nCost);
        pq.push({ node: nb.to, cost: nCost });
        pq.sort((a, b) => a.cost - b.cost);
      }
    }
  }

  for (const mins of [5, 10]) {
    const T = mins * 60;
    const slices = [];
    let preciseLength = 0;
    let fullEdgesCount = 0;
    let partialEdgesCount = 0;

    for (const e of localEdges) {
      const c1 = dist.get(e.from_node);
      const c2 = dist.get(e.to_node);
      const w = Number(e.traversal_time_seconds);
      const len = Number(e.length_meters);

      const hasC1 = c1 !== undefined && c1 <= T;
      const hasC2 = c2 !== undefined && c2 <= T;

      if (hasC1 && hasC2) {
        slices.push(`ST_LineSubstring(geom, 0, 1)`);
        preciseLength += len;
        fullEdgesCount++;
      } else if (hasC1) {
        const f = Math.max(0.01, Math.min(1.0, (T - c1) / w));
        slices.push(`ST_LineSubstring(geom, 0, ${f.toFixed(4)})`);
        preciseLength += len * f;
        partialEdgesCount++;
      } else if (hasC2) {
        const f = Math.max(0.01, Math.min(1.0, (T - c2) / w));
        slices.push(`ST_LineSubstring(geom, ${(1 - f).toFixed(4)}, 1)`);
        preciseLength += len * f;
        partialEdgesCount++;
      }
    }

    console.log(`\n--- ${mins} Minutes (T = ${T}s) ---`);
    console.log(`Full Edges: ${fullEdgesCount} | Partial Boundary Edges: ${partialEdgesCount}`);
    console.log(`Precise Traversed Network Length: ${(preciseLength / 1000).toFixed(3)} km`);

    // Let's compute the PostGIS area with 35m buffer
    // Construct SQL query
    const sql = `
      WITH edge_slices AS (
        ${localEdges.map((e) => {
          const c1 = dist.get(e.from_node);
          const c2 = dist.get(e.to_node);
          const w = Number(e.traversal_time_seconds);
          const hasC1 = c1 !== undefined && c1 <= T;
          const hasC2 = c2 !== undefined && c2 <= T;

          if (hasC1 && hasC2) {
            return `SELECT ST_Buffer(geom::geography, 35)::geometry as g FROM pedestrian_network WHERE id = '${e.id}'`;
          } else if (hasC1) {
            const f = Math.max(0.01, Math.min(1.0, (T - c1) / w)).toFixed(4);
            return `SELECT ST_Buffer(ST_LineSubstring(geom, 0, ${f})::geography, 35)::geometry as g FROM pedestrian_network WHERE id = '${e.id}'`;
          } else if (hasC2) {
            const f = Math.max(0.01, Math.min(1.0, (T - c2) / w)).toFixed(4);
            const startF = (1 - f).toFixed(4);
            return `SELECT ST_Buffer(ST_LineSubstring(geom, ${startF}, 1)::geography, 35)::geometry as g FROM pedestrian_network WHERE id = '${e.id}'`;
          }
          return null;
        }).filter(Boolean).join('\nUNION ALL\n')}
      )
      SELECT 
        ROUND((ST_Area(ST_Union(g)::geography) / 1000000.0)::numeric, 4)::float as area_sq_km
      FROM edge_slices;
    `;

    const res = await prisma.$queryRawUnsafe(sql);
    const area = res[0]?.area_sq_km || 0;
    const euclideanRadius = T * 1.2;
    const euclideanArea = (Math.PI * Math.pow(euclideanRadius, 2)) / 1000000;
    const severance = 1 - area / euclideanArea;

    console.log(`Buffered Area (35m buffer with partial edge trimming): ${area} km²`);
    console.log(`Ideal Euclidean Area: ${euclideanArea.toFixed(4)} km²`);
    console.log(`Severance Ratio: ${(severance * 100).toFixed(1)}%`);
  }

  await prisma.$disconnect();
}

testPartialSlicing().catch(console.error);
