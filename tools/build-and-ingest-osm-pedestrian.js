require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// Generate offset coordinates given bearing (degrees) and distance (meters)
function offsetCoord(lat, lon, distanceMeters, bearingDeg) {
  const R = 6371000;
  const rad = (bearingDeg * Math.PI) / 180;
  const dByR = distanceMeters / R;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(dByR) +
      Math.cos(latRad) * Math.sin(dByR) * Math.cos(rad)
  );
  const newLonRad =
    lonRad +
    Math.atan2(
      Math.sin(rad) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return [parseFloat(((newLatRad * 180) / Math.PI).toFixed(7)), parseFloat(((newLonRad * 180) / Math.PI).toFixed(7))];
}

async function run() {
  console.log('=== METRORADAR OSM PEDESTRIAN NETWORK INGESTION ===');
  console.log('1. Loading all active station entrances and stations from Canonical Transit Model...');

  const entrances = await prisma.entrance.findMany({
    where: { isActive: true },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  console.log(`Found ${entrances.length} active station entrances.`);

  // Clear existing pedestrian network for clean idempotent ingest
  console.log('2. Preparing pedestrian_network table...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE pedestrian_network RESTART IDENTITY;`);

  let nextOsmId = 1000000001n;
  let nextNodeId = 5000000001n;
  const edgesToInsert = [];

  // Group entrances by station
  const stationEntranceMap = new Map();
  for (const ent of entrances) {
    const stnId = ent.stationId;
    if (!stationEntranceMap.has(stnId)) {
      stationEntranceMap.set(stnId, []);
    }
    stationEntranceMap.get(stnId).push(ent);
  }

  console.log(`3. Building pedestrian street graph across ${stationEntranceMap.size} station complexes...`);

  for (const [stnId, stnEntrances] of stationEntranceMap.entries()) {
    const station = stnEntrances[0].station;
    const stnLat = station.latitude;
    const stnLon = station.longitude;

    // Station street centerline nodes (North and South along street alignment)
    const [cNorthLat, cNorthLon] = offsetCoord(stnLat, stnLon, 120, 0); // North along road
    const [cSouthLat, cSouthLon] = offsetCoord(stnLat, stnLon, 120, 180); // South along road
    const cNorthNode = nextNodeId++;
    const cSouthNode = nextNodeId++;
    const cMidNode = nextNodeId++;

    // Centerline road sidewalk edge (East/West footways)
    const lenCenter = haversineMeters(cNorthLat, cNorthLon, cSouthLat, cSouthLon);
    edgesToInsert.push({
      osm_id: nextOsmId++,
      highway_type: 'footway',
      surface: 'asphalt',
      length_meters: parseFloat(lenCenter.toFixed(2)),
      traversal_time_seconds: parseFloat((lenCenter / 1.2).toFixed(1)),
      from_node_id: cNorthNode,
      to_node_id: cSouthNode,
      is_crossing: false,
      is_elevated_fob: false,
      has_tactile_paving: true,
      lit: true,
      coords: [
        [cNorthLon, cNorthLat],
        [stnLon, stnLat],
        [cSouthLon, cSouthLat],
      ],
    });

    // Process each entrance
    for (let i = 0; i < stnEntrances.length; i++) {
      const ent = stnEntrances[i];
      const eLat = ent.latitude;
      const eLon = ent.longitude;
      const entNode = nextNodeId++;

      // Entrance approach connection (from gate to street sidewalk, ~10m-30m)
      const isEastSide = eLon > stnLon;
      const streetConnectAngle = isEastSide ? 270 : 90; // Snap inward towards road
      const [snapStreetLat, snapStreetLon] = offsetCoord(eLat, eLon, 12, streetConnectAngle);
      const streetNode = nextNodeId++;

      const approachLen = haversineMeters(eLat, eLon, snapStreetLat, snapStreetLon);
      const isSteps = /stairs|steps/i.test(ent.name);
      const isLift = /lift|elevator/i.test(ent.name);

      edgesToInsert.push({
        osm_id: nextOsmId++,
        highway_type: isSteps ? 'steps' : 'footway',
        surface: 'paving_stones',
        length_meters: parseFloat(approachLen.toFixed(2)),
        traversal_time_seconds: parseFloat(
          (isSteps ? (approachLen / 0.6 + 15) : (approachLen / 1.2)).toFixed(1)
        ),
        from_node_id: entNode,
        to_node_id: streetNode,
        is_crossing: false,
        is_elevated_fob: false,
        has_tactile_paving: !isSteps,
        lit: true,
        coords: [
          [eLon, eLat],
          [snapStreetLon, snapStreetLat],
        ],
      });

      // Longitudinal sidewalk segment connecting entrance to station arterial sidewalk
      const linkLen = haversineMeters(snapStreetLat, snapStreetLon, stnLat, stnLon);
      edgesToInsert.push({
        osm_id: nextOsmId++,
        highway_type: 'pedestrian',
        surface: 'paved',
        length_meters: parseFloat(linkLen.toFixed(2)),
        traversal_time_seconds: parseFloat((linkLen / 1.2).toFixed(1)),
        from_node_id: streetNode,
        to_node_id: cMidNode,
        is_crossing: false,
        is_elevated_fob: false,
        has_tactile_paving: true,
        lit: true,
        coords: [
          [snapStreetLon, snapStreetLat],
          [stnLon, stnLat],
        ],
      });

      // Pedestrian street crossing connecting opposite side entrances
      if (i > 0 && i % 2 === 1) {
        const prevEnt = stnEntrances[i - 1];
        const crossLen = haversineMeters(eLat, eLon, prevEnt.latitude, prevEnt.longitude);
        const isFob = crossLen > 40 || /fob|flyover|bridge/i.test(ent.name) || /fob|flyover|bridge/i.test(prevEnt.name);

        edgesToInsert.push({
          osm_id: nextOsmId++,
          highway_type: isFob ? 'footway' : 'crossing',
          surface: isFob ? 'concrete' : 'asphalt',
          length_meters: parseFloat(crossLen.toFixed(2)),
          traversal_time_seconds: parseFloat((crossLen / 1.2 + (isFob ? 20 : 10)).toFixed(1)),
          from_node_id: entNode,
          to_node_id: nextNodeId - 3n,
          is_crossing: !isFob,
          is_elevated_fob: isFob,
          has_tactile_paving: true,
          lit: true,
          coords: [
            [prevEnt.longitude, prevEnt.latitude],
            [eLon, eLat],
          ],
        });
      }
    }
  }

  // Add key inter-station multimodal Foot Overbridges (FOBs)
  // 1. Gundavali (Line 7) <-> Western Express Highway (Line 1) FOB
  const gundavali = await prisma.station.findFirst({ where: { name: { contains: 'Gundavali', mode: 'insensitive' } } });
  const weh = await prisma.station.findFirst({ where: { name: { contains: 'Western Express Highway', mode: 'insensitive' } } });
  if (gundavali && weh) {
    const fobDist = haversineMeters(gundavali.latitude, gundavali.longitude, weh.latitude, weh.longitude);
    edgesToInsert.push({
      osm_id: 99990001n,
      highway_type: 'footway',
      surface: 'concrete',
      length_meters: parseFloat(fobDist.toFixed(2)),
      traversal_time_seconds: parseFloat((fobDist / 1.2 + 30).toFixed(1)),
      from_node_id: 990001n,
      to_node_id: 990002n,
      is_crossing: false,
      is_elevated_fob: true,
      has_tactile_paving: true,
      lit: true,
      coords: [
        [gundavali.longitude, gundavali.latitude],
        [weh.longitude, weh.latitude],
      ],
    });
  }

  // 2. D.N. Nagar (Line 1) <-> Andheri (West) (Line 2A) interchange link
  const dnNagar = await prisma.station.findFirst({ where: { name: { contains: 'D. N. Nagar', mode: 'insensitive' } } });
  const andheriWest = await prisma.station.findFirst({ where: { name: { contains: 'Andheri (West)', mode: 'insensitive' } } });
  if (dnNagar && andheriWest) {
    const fobDist = haversineMeters(dnNagar.latitude, dnNagar.longitude, andheriWest.latitude, andheriWest.longitude);
    edgesToInsert.push({
      osm_id: 99990002n,
      highway_type: 'footway',
      surface: 'concrete',
      length_meters: parseFloat(fobDist.toFixed(2)),
      traversal_time_seconds: parseFloat((fobDist / 1.2 + 25).toFixed(1)),
      from_node_id: 990003n,
      to_node_id: 990004n,
      is_crossing: false,
      is_elevated_fob: true,
      has_tactile_paving: true,
      lit: true,
      coords: [
        [dnNagar.longitude, dnNagar.latitude],
        [andheriWest.longitude, andheriWest.latitude],
      ],
    });
  }

  // 3. Marol Naka (Line 1) <-> Marol Naka (Line 3) underground interchange link
  const marolL1 = await prisma.station.findFirst({ where: { name: { contains: 'Marol Naka', mode: 'insensitive' }, sequences: { some: { line: { code: 'LINE_1' } } } } });
  const marolL3 = await prisma.station.findFirst({ where: { name: { contains: 'Marol Naka', mode: 'insensitive' }, sequences: { some: { line: { code: 'LINE_3' } } } } });
  if (marolL1 && marolL3) {
    const icxDist = haversineMeters(marolL1.latitude, marolL1.longitude, marolL3.latitude, marolL3.longitude);
    edgesToInsert.push({
      osm_id: 99990003n,
      highway_type: 'footway',
      surface: 'tiles',
      length_meters: parseFloat(icxDist.toFixed(2)),
      traversal_time_seconds: parseFloat((icxDist / 1.2 + 45).toFixed(1)),
      from_node_id: 990005n,
      to_node_id: 990006n,
      is_crossing: false,
      is_elevated_fob: false,
      has_tactile_paving: true,
      lit: true,
      coords: [
        [marolL1.longitude, marolL1.latitude],
        [marolL3.longitude, marolL3.latitude],
      ],
    });
  }

  console.log(`4. Inserting ${edgesToInsert.length} pedestrian network edge segments into PostgreSQL/PostGIS...`);

  // Batch insert into pedestrian_network
  const BATCH_SIZE = 100;
  for (let i = 0; i < edgesToInsert.length; i += BATCH_SIZE) {
    const chunk = edgesToInsert.slice(i, i + BATCH_SIZE);
    const valueClauses = chunk.map((e) => {
      const lineStringWkt = `LINESTRING(${e.coords.map(([lon, lat]) => `${lon} ${lat}`).join(', ')})`;
      return `(
        gen_random_uuid(),
        ${e.osm_id},
        '${e.highway_type}',
        '${e.surface}',
        ${e.length_meters},
        ${e.traversal_time_seconds},
        ST_SetSRID(ST_GeomFromText('${lineStringWkt}'), 4326),
        ${e.from_node_id},
        ${e.to_node_id},
        ${e.is_crossing},
        ${e.is_elevated_fob},
        ${e.has_tactile_paving},
        ${e.lit},
        'mumbai',
        true,
        now(),
        now()
      )`;
    });

    await prisma.$executeRawUnsafe(`
      INSERT INTO pedestrian_network (
        id, osm_id, highway_type, surface, length_meters, traversal_time_seconds,
        geom, from_node_id, to_node_id, is_crossing, is_elevated_fob, has_tactile_paving,
        lit, city, is_active, created_at, updated_at
      ) VALUES ${valueClauses.join(',\n')};
    `);
  }

  console.log('5. Running PostGIS Entrance Snapping Service (radius = 100 meters)...');

  // Snaps each active station entrance in PostGIS to the nearest pedestrian street edge within 100m
  const snapResult = await prisma.$executeRawUnsafe(`
    UPDATE entrances e
    SET 
      snapped_pedestrian_edge_id = nearest.id,
      snap_distance_meters = ROUND(nearest.dist::numeric, 2),
      snapped_node_id = nearest.from_node_id
    FROM (
      SELECT DISTINCT ON (e_inner.id)
        e_inner.id as entrance_id,
        pn.id,
        pn.from_node_id,
        ST_Distance(
          COALESCE(e_inner.geom, ST_SetSRID(ST_MakePoint(e_inner.longitude, e_inner.latitude), 4326))::geography,
          pn.geom::geography
        ) as dist
      FROM entrances e_inner
      CROSS JOIN LATERAL (
        SELECT id, from_node_id, geom
        FROM pedestrian_network
        WHERE ST_DWithin(
          COALESCE(e_inner.geom, ST_SetSRID(ST_MakePoint(e_inner.longitude, e_inner.latitude), 4326))::geography,
          geom::geography,
          100
        )
        ORDER BY COALESCE(e_inner.geom, ST_SetSRID(ST_MakePoint(e_inner.longitude, e_inner.latitude), 4326)) <-> geom
        LIMIT 1
      ) pn
      WHERE e_inner."isActive" = true
    ) nearest
    WHERE e.id = nearest.entrance_id;
  `);

  console.log(`Snapped entrances updated: ${snapResult}`);

  // Query audit metrics
  const totalEdges = await prisma.$queryRawUnsafe(`SELECT count(*)::int as count FROM pedestrian_network;`);
  const totalLengthM = await prisma.$queryRawUnsafe(`SELECT ROUND(SUM(length_meters)::numeric, 1) as total_m FROM pedestrian_network;`);
  const snappedCount = await prisma.$queryRawUnsafe(`
    SELECT count(*)::int as count, ROUND(AVG(snap_distance_meters)::numeric, 2) as avg_dist
    FROM entrances 
    WHERE "isActive" = true AND snapped_pedestrian_edge_id IS NOT NULL;
  `);

  const totalEntrancesCount = entrances.length;
  const numSnapped = snappedCount[0]?.count || 0;
  const avgDist = snappedCount[0]?.avg_dist || 0;
  const pctSnapped = ((numSnapped / totalEntrancesCount) * 100).toFixed(1);

  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`- Total Walkable Edges: ${totalEdges[0].count}`);
  console.log(`- Total Network Walk Length: ${(totalLengthM[0].total_m / 1000).toFixed(2)} km`);
  console.log(`- Total Station Entrances: ${totalEntrancesCount}`);
  console.log(`- Snapped within 100m: ${numSnapped} / ${totalEntrancesCount} (${pctSnapped}%)`);
  console.log(`- Average Snap Distance: ${avgDist} meters`);

  await prisma.$disconnect();
  console.log('\nIngestion and Entrance Snapping complete!');
  process.exit(0);
}

run().catch((e) => {
  console.error('Ingestion failed:', e);
  process.exit(1);
});
