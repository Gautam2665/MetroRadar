const https = require('https');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WALKABLE_HIGHWAYS = new Set([
  'footway', 'pedestrian', 'path', 'steps', 'living_street',
  'residential', 'tertiary', 'secondary', 'primary'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchOsmBbox(minLon, minLat, maxLon, maxLat) {
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${minLon},${minLat},${maxLon},${maxLat}`;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MetroRadar-Corridor-Builder/1.0' } }, (res) => {
      let xml = '';
      res.on('data', chunk => xml += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`OSM API error ${res.statusCode}: ${xml.slice(0, 150)}`));
        }
        resolve(xml);
      });
    }).on('error', reject);
  });
}

function parseOsmXml(xml) {
  const nodeMap = new Map();
  const nodeMatches = xml.matchAll(/<node id="(\d+)"[^>]*?lat="([^"]*)"[^>]*?lon="([^"]*)"/g);
  for (const m of nodeMatches) {
    nodeMap.set(m[1], [parseFloat(m[3]), parseFloat(m[2])]); // [lon, lat]
  }

  const ways = [];
  const wayMatches = xml.matchAll(/<way id="(\d+)"[\s\S]*?<\/way>/g);
  for (const wm of wayMatches) {
    const id = wm[1];
    const wayXml = wm[0];

    const tags = {};
    for (const tm of wayXml.matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)) {
      tags[tm[1]] = tm[2];
    }

    if (!tags.highway || !WALKABLE_HIGHWAYS.has(tags.highway)) continue;
    if (tags.foot === 'no') continue;

    const nds = [...wayXml.matchAll(/<nd ref="(\d+)"\/>/g)].map(m => m[1]);
    const coords = nds.map(ref => nodeMap.get(ref)).filter(Boolean);
    if (coords.length < 2) continue;

    ways.push({
      osm_id: id,
      tags,
      coords,
      from_node_id: nds[0],
      to_node_id: nds[nds.length - 1]
    });
  }

  return ways;
}

async function ingestStation(stnCode, stnName, lat, lon) {
  const delta = 0.005; // ~550m
  const minLon = (lon - delta).toFixed(6);
  const maxLon = (lon + delta).toFixed(6);
  const minLat = (lat - delta).toFixed(6);
  const maxLat = (lat + delta).toFixed(6);

  try {
    const xml = await fetchOsmBbox(minLon, minLat, maxLon, maxLat);
    const ways = parseOsmXml(xml);

    if (ways.length === 0) {
      console.log(`[${stnCode}] ${stnName}: 0 walkable ways.`);
      return 0;
    }

    // Ensure study area is clean before inserting
    await prisma.$queryRawUnsafe(`
      DELETE FROM public.pedestrian_network WHERE study_area = '${stnCode}';
    `);

    const CHUNK_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < ways.length; i += CHUNK_SIZE) {
      const chunk = ways.slice(i, i + CHUNK_SIZE);
      const valueRows = [];

      for (const w of chunk) {
        const lineWkt = `LINESTRING(${w.coords.map(c => `${c[0]} ${c[1]}`).join(',')})`;
        const isFob = (w.tags.bridge === 'yes' && ['footway', 'steps', 'pedestrian'].includes(w.tags.highway)) || w.tags.layer === '1';
        const isCrossing = w.tags.footway === 'crossing' || w.tags.highway === 'crossing';
        const isLit = w.tags.lit === 'yes';
        const level = w.tags.layer || (isFob ? '1' : '0');
        const safeSurface = w.tags.surface ? `'${w.tags.surface.replace(/'/g, "''")}'` : 'NULL';
        const safeAccess = (w.tags.access || 'public').replace(/'/g, "''");
        const safeTags = JSON.stringify(w.tags).replace(/'/g, "''");

        valueRows.push(`(
          gen_random_uuid(),
          ${w.osm_id},
          '${w.tags.highway}',
          ${safeSurface},
          0,
          0,
          ST_GeomFromText('${lineWkt}', 4326),
          ${w.from_node_id || 'NULL'},
          ${w.to_node_id || 'NULL'},
          ${isCrossing},
          ${isFob},
          false,
          ${isLit},
          'mumbai',
          true,
          NOW(),
          NOW(),
          '${safeAccess}',
          'OSM_OFFICIAL',
          '${stnCode}',
          '${safeTags}'::jsonb,
          false,
          '${level}'
        )`);
      }

      const query = `
        INSERT INTO public.pedestrian_network (
          id, osm_id, highway_type, surface, length_meters, traversal_time_seconds,
          geom, from_node_id, to_node_id, is_crossing, is_elevated_fob, has_tactile_paving,
          lit, city, is_active, created_at, updated_at, access, source_type, study_area, tags, is_indoor, level
        ) VALUES ${valueRows.join(',\n')};
      `;

      await prisma.$queryRawUnsafe(query);
      inserted += chunk.length;
    }

    console.log(`[${stnCode}] ${stnName}: ✓ ${inserted} clean edges.`);
    return inserted;
  } catch (err) {
    console.error(`[${stnCode}] ${stnName} failed:`, err.message);
    return 0;
  }
}

async function run() {
  const STATIONS = [
    // Line 2A
    { code: 'STN_L2A_002', name: 'Anand Nagar', lat: 19.257219, lon: 72.866134 },
    { code: 'STN_L2A_003', name: 'Kandarpada', lat: 19.256646, lon: 72.850678 },
    { code: 'STN_L2A_004', name: 'Mandapeshwar', lat: 19.249261, lon: 72.845677 },
    { code: 'STN_L2A_005', name: 'Eksar', lat: 19.240323, lon: 72.843438 },
    { code: 'STN_L2A_006', name: 'Borivali (West)', lat: 19.231194, lon: 72.840865 },
    { code: 'STN_L2A_007', name: 'Shimpoli', lat: 19.222769, lon: 72.840918 },
    { code: 'STN_L2A_008', name: 'Kandivali (West)', lat: 19.214005, lon: 72.837355 },
    { code: 'STN_L2A_009', name: 'Dahanukarwadi', lat: 19.205772, lon: 72.834717 },
    { code: 'STN_L2A_010', name: 'Valnai - Meeth Chowky', lat: 19.196621, lon: 72.833786 },
    { code: 'STN_L2A_011', name: 'Malad (West)', lat: 19.1852, lon: 72.83585 },
    { code: 'STN_L2A_012', name: 'Lower Malad', lat: 19.172953, lon: 72.836423 },
    { code: 'STN_L2A_013', name: 'Bangur Nagar', lat: 19.162259, lon: 72.834844 },
    { code: 'STN_L2A_014', name: 'Goregaon (West)', lat: 19.153138, lon: 72.835685 },
    { code: 'STN_L2A_015', name: 'Oshiwara', lat: 19.145979, lon: 72.833752 },
    { code: 'STN_L2A_016', name: 'Lower Oshiwara', lat: 19.140455, lon: 72.831717 },

    // Line 7
    { code: 'STN_L7_002', name: 'Ovaripada', lat: 19.243411, lon: 72.864248 },
    { code: 'STN_L7_003', name: 'Rashtriya Udyan', lat: 19.234671, lon: 72.863161 },
    { code: 'STN_L7_004', name: 'Devipada', lat: 19.224332, lon: 72.86422 },
    { code: 'STN_L7_005', name: 'Magathane', lat: 19.217203, lon: 72.866728 },
    { code: 'STN_L7_006', name: 'Poisar', lat: 19.203938, lon: 72.863499 },
    { code: 'STN_L7_007', name: 'Akurli', lat: 19.198115, lon: 72.860646 },
    { code: 'STN_L7_008', name: 'Kurar', lat: 19.187264, lon: 72.858512 },
    { code: 'STN_L7_009', name: 'Dindoshi', lat: 19.17972, lon: 72.8583 },
    { code: 'STN_L7_010', name: 'Aarey', lat: 19.169506, lon: 72.858801 },
    { code: 'STN_L7_011', name: 'Goregaon (East)', lat: 19.152442, lon: 72.856573 },
    { code: 'STN_L7_012', name: 'Jogeshwari (East)', lat: 19.142928, lon: 72.855166 },
    { code: 'STN_L7_013', name: 'Mogra', lat: 19.128677, lon: 72.855452 }
  ];

  console.log(`Starting ingestion of clean OSM pedestrian network for ${STATIONS.length} stations...`);
  let totalEdges = 0;

  for (let i = 0; i < STATIONS.length; i++) {
    const stn = STATIONS[i];
    const count = await ingestStation(stn.code, stn.name, stn.lat, stn.lon);
    totalEdges += count;
    await sleep(1500); // 1.5s delay to be polite to OSM API
  }

  console.log(`\n========================================================`);
  console.log(`✓ COMPLETE: Inserted ${totalEdges} clean walkable edges across ${STATIONS.length} stations.`);
  console.log(`========================================================`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
