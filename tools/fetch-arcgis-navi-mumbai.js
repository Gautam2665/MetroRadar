const fs = require('fs');
const path = require('path');

async function fetchArcGISNaviMumbai() {
  const base = 'https://livingatlas.esri.in/server1/rest/services/MetroNetwork/India_Metro_Network/MapServer';
  
  console.log('Fetching Navi Mumbai stations from ArcGIS...');
  const stnUrl = base + '/0/query?where=city%20LIKE%20%27%25Navi%20Mumbai%25%27&outFields=*&f=geojson';
  const stnData = await fetch(stnUrl).then(r => r.json());

  console.log('Fetching Navi Mumbai lines from ArcGIS...');
  const lineUrl = base + '/1/query?where=city%20LIKE%20%27%25Navi%20Mumbai%25%27&outFields=*&f=geojson';
  const lineData = await fetch(lineUrl).then(r => r.json());

  const outData = {
    metadata: {
      source: "MoHUA / Esri India Living Atlas",
      endpoint: base,
      city: "Navi Mumbai",
      fetchedAt: new Date().toISOString()
    },
    stations: stnData,
    lines: lineData
  };

  const outDir = path.resolve(process.cwd(), 'datasets/navi_mumbai/source');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'arcgis-navi-mumbai.json');
  fs.writeFileSync(outFile, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`Saved ArcGIS data to ${outFile} (${stnData.features.length} stations, ${lineData.features.length} lines)`);
}

fetchArcGISNaviMumbai().catch(err => {
  console.error('Error fetching ArcGIS Navi Mumbai:', err);
  process.exit(1);
});
