const fs = require('fs');
const ctm = JSON.parse(fs.readFileSync('datasets/mumbai/normalized/ctm.json', 'utf8'));
ctm.stations.forEach((s, i) => {
  console.log(`${i+1}. ${s.name} (${s.id || s.canonicalId}) -> lat: ${s.latitude}, lon: ${s.longitude}`);
});
