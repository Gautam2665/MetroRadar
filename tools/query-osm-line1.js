const https = require('https');
const fs = require('fs');

const query = `[out:json][timeout:45];
relation(3808111);
(._;>>;);
out body;`;

const options = {
  hostname: 'overpass-api.de',
  path: '/api/interpreter?data=' + encodeURIComponent(query),
  headers: { 'User-Agent': 'MetroRadar/1.0 (research@metroradar.io)' }
};

console.log('Fetching OSM Relation 3808111 (Line 1 Versova -> Ghatkopar)...');
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Total elements in relation expansion:', json.elements.length);
      fs.writeFileSync('datasets/mumbai/sources/osm-line1-rel-3808111.json', JSON.stringify(json, null, 2));
      console.log('Saved to datasets/mumbai/sources/osm-line1-rel-3808111.json');

      const rel = json.elements.find(e => e.type === 'relation' && e.id === 3808111);
      console.log('Relation Tags:', rel.tags);
      console.log('Members count:', rel.members.length);

      // Find node elements that correspond to stops or stations
      const nodesMap = new Map();
      json.elements.filter(e => e.type === 'node').forEach(n => nodesMap.set(n.id, n));

      const stopMembers = rel.members.filter(m => m.role === 'stop' || m.role === 'station' || m.role === 'stop_entry_only' || m.role === 'stop_exit_only');
      console.log(`\nExplicit stop/station members (${stopMembers.length}):`);
      stopMembers.forEach((m, idx) => {
        const node = nodesMap.get(m.ref);
        const name = (node && node.tags && (node.tags.name || node.tags['name:en'])) || (m.tags && m.tags.name) || 'unnamed';
        const lat = node ? node.lat : 'unknown';
        const lon = node ? node.lon : 'unknown';
        console.log(`  ${idx + 1}. [${m.role}] ID: ${m.ref} - ${name} (${lat}, ${lon})`);
      });

      // Also list all nodes in the result that have tags.name or tags.railway
      const taggedNodes = json.elements.filter(e => e.type === 'node' && e.tags && (e.tags.railway || e.tags.name));
      console.log(`\nTagged nodes in result (${taggedNodes.length}):`);
      taggedNodes.forEach(n => {
        console.log(`  Node ${n.id}: ${n.tags.name} (lat: ${n.lat}, lon: ${n.lon}, tags: ${JSON.stringify(n.tags)})`);
      });

    } catch (e) {
      console.error('Failed to parse:', e.message, data.slice(0, 300));
    }
  });
}).on('error', err => console.error('Request error:', err.message));
