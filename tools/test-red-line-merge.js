const fs = require('fs');
const l9Ctm = JSON.parse(fs.readFileSync('datasets/mumbai/normalized/ctm-line9-phase1.json', 'utf8'));
const l7Ctm = JSON.parse(fs.readFileSync('datasets/mumbai/normalized/ctm-line7.json', 'utf8'));
const arcgis = JSON.parse(fs.readFileSync('datasets/mumbai/sources/gis/arcgis-mumbai.json', 'utf8'));

// Filter out duplicate Dahisar East from Line 9 so Dahisar East is the single shared interchange node
const l9Stations = l9Ctm.stations.filter(s => s.canonicalId !== 'STN_L9_001');
const allRedStations = [...l9Stations, ...l7Ctm.stations];
console.log('Total Red Line continuous stations:', allRedStations.length);
allRedStations.forEach((s, idx) => {
  console.log(`${idx + 1}. ${s.name} (${s.canonicalId}) -> (${s.latitude}, ${s.longitude})`);
});

const l9Coords = l9Ctm.alignmentGeometry.coordinates;
const l7Coords = arcgis.lines.features.find(f => f.id === 55).geometry.coordinates;
const mergedRedCoords = [...l9Coords, ...l7Coords];
console.log('\nMerged Red Line polyline points:', mergedRedCoords.length);
console.log('North terminus (Kashigaon):', mergedRedCoords[0]);
console.log('Dahisar East junction:', l9Coords[l9Coords.length - 1], l7Coords[0]);
console.log('South terminus (Gundavali):', mergedRedCoords[mergedRedCoords.length - 1]);
