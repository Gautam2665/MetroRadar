const fs = require('fs');
const path = require('path');

const query = `[out:json][timeout:90];
(
  way["highway"~"^(footway|pedestrian|steps|path|crossing|residential|tertiary|secondary|primary|living_street|service)$"]["foot"!="no"]["access"!="private"](19.120,72.822,19.138,72.840);
  way["bridge"="yes"]["highway"](19.120,72.822,19.138,72.840);
);
out geom;`;

async function testFetch() {
  const url = 'https://overpass-api.de/api/interpreter';
  console.log('Fetching walkable street network around D.N. Nagar / Andheri West from Overpass...');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MetroRadar-TransitOS-Ingestion/1.0 (transit planning research)',
    },
    body: 'data=' + encodeURIComponent(query)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const ways = data.elements.filter(e => e.type === 'way');
  console.log(`Received ${ways.length} total walkable ways!`);
  const hwCounts = {};
  for (const w of ways) {
    const hw = w.tags?.highway || 'unknown';
    hwCounts[hw] = (hwCounts[hw] || 0) + 1;
  }
  console.log('Highway types breakdown:', hwCounts);
  
  const outFile = path.resolve('datasets/mumbai/pedestrian/osm_dn_nagar_full_walkable.json');
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`Saved to ${outFile}`);
}

testFetch().catch(console.error);
