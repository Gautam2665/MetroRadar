const fs = require('fs');
const arcgis = JSON.parse(fs.readFileSync('datasets/mumbai/sources/gis/arcgis-mumbai.json', 'utf8'));
const ctm = JSON.parse(fs.readFileSync('datasets/mumbai/normalized/ctm.json', 'utf8'));
const f57 = arcgis.lines.features.find(f => f.id === 57);
const coords = [...f57.geometry.coordinates].reverse(); // Aarey (North) -> Cuffe Parade (South)

function dist(p1, p2) {
  const dlat = (p1[1] - p2[1]) * 111000;
  const dlon = (p1[0] - p2[0]) * 111000 * Math.cos(p1[1] * Math.PI / 180);
  return Math.sqrt(dlat * dlat + dlon * dlon);
}

ctm.stations.forEach((stn, idx) => {
  let minD = Infinity;
  let minIdx = -1;
  let nearestCoord = null;
  coords.forEach((c, cIdx) => {
    const d = dist([stn.longitude, stn.latitude], c);
    if (d < minD) {
      minD = d;
      minIdx = cIdx;
      nearestCoord = c;
    }
  });
  console.log(`${idx + 1}. ${stn.name}: MinDist=${minD.toFixed(1)}m at polyline index ${minIdx} | Stn: (${stn.latitude.toFixed(6)}, ${stn.longitude.toFixed(6)}) | Nearest Track: (${nearestCoord[1].toFixed(6)}, ${nearestCoord[0].toFixed(6)})`);
});
