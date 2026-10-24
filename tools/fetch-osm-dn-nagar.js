const fs = require('fs');
const path = require('path');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const OVERPASS_QUERY = `[out:json][timeout:60];
(
  way["highway"~"^(footway|pedestrian|steps|path|crossing)$"](19.125,72.827,19.132,72.835);
  way["highway"="corridor"](19.125,72.827,19.132,72.835);
  way["bridge"="yes"]["highway"](19.125,72.827,19.132,72.835);
);
out geom;`;

async function fetchFromEndpoint(url, query) {
  console.log(`Querying Overpass endpoint: ${url}...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'MetroRadar-TransitOS-Ingestion/1.0 (transit planning research)',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function run() {
  console.log('=== STEP 1: FETCHING REAL OSM PEDESTRIAN WAYS FOR D.N. NAGAR / ANDHERI WEST ===');
  console.log('Bounding Box: [19.125, 72.827, 19.132, 72.835]');
  
  let rawData = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      rawData = await fetchFromEndpoint(endpoint, OVERPASS_QUERY);
      if (rawData && rawData.elements) {
        console.log(`Successfully fetched from ${endpoint}!`);
        break;
      }
    } catch (e) {
      console.warn(`Failed from ${endpoint}: ${e.message}`);
    }
  }

  if (!rawData || !rawData.elements) {
    console.error('All Overpass endpoints failed or returned empty data.');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), 'datasets/mumbai/pedestrian');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'osm_dn_nagar_raw.json');
  fs.writeFileSync(outFile, JSON.stringify(rawData, null, 2), 'utf-8');
  console.log(`Saved raw Overpass output (${rawData.elements.length} elements) to: ${outFile}`);

  // Summary analysis of returned ways
  const ways = rawData.elements.filter((e) => e.type === 'way');
  console.log(`\n=== EXTRACTED WAYS SUMMARY (${ways.length} total) ===`);

  const tagCounts = {};
  const bridges = [];
  const steps = [];

  for (const w of ways) {
    const hw = w.tags?.highway || 'unknown';
    tagCounts[hw] = (tagCounts[hw] || 0) + 1;

    if (w.tags?.bridge === 'yes') {
      bridges.push(w);
    }
    if (w.tags?.highway === 'steps') {
      steps.push(w);
    }
  }

  console.log('Highway types breakdown:', tagCounts);
  console.log(`Bridge ways found: ${bridges.length}`);
  console.log(`Steps ways found: ${steps.length}`);

  if (bridges.length > 0) {
    console.log('\nBridge ways details:');
    bridges.forEach((b) => {
      console.log(`- Way ${b.id}: highway=${b.tags.highway}, name=${b.tags.name || 'unnamed'}, layer=${b.tags.layer}, points=${b.geometry?.length}`);
    });
  }

  // Sample geometries check
  const sample = ways.find((w) => w.geometry && w.geometry.length > 2);
  if (sample) {
    console.log(`\nSample multi-point way ${sample.id} (${sample.tags.highway}):`);
    console.log(`Points count: ${sample.geometry.length}`);
    console.log('First 3 coords:', sample.geometry.slice(0, 3));
  }
}

run().catch((e) => {
  console.error('Execution error:', e);
  process.exit(1);
});
