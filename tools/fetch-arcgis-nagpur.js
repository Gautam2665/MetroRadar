const fs = require('fs');
const path = require('path');

async function fetchArcGISNagpur() {
  const base = 'https://livingatlas.esri.in/server1/rest/services/MetroNetwork/India_Metro_Network/MapServer';
  
  console.log('Fetching Nagpur stations from ArcGIS...');
  const stnUrl = base + '/0/query?where=city%20LIKE%20%27%25Nagpur%25%27&outFields=*&f=geojson';
  const stnData = await fetch(stnUrl).then(r => r.json());

  console.log('Fetching Nagpur lines from ArcGIS...');
  const lineUrl = base + '/1/query?where=city%20LIKE%20%27%25Nagpur%25%27&outFields=*&f=geojson';
  const lineData = await fetch(lineUrl).then(r => r.json());

  const outData = {
    metadata: {
      source: "MoHUA / Esri India Living Atlas",
      endpoint: base,
      city: "Nagpur",
      fetchedAt: new Date().toISOString()
    },
    stations: stnData,
    lines: lineData
  };

  const outDir = path.resolve(process.cwd(), 'datasets/nagpur/source');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'arcgis-nagpur.json');
  fs.writeFileSync(outFile, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`Saved ArcGIS data to ${outFile} (${stnData.features.length} stations, ${lineData.features.length} lines)`);
}

fetchArcGISNagpur().catch(err => {
  console.error('Error fetching ArcGIS Nagpur:', err);
  process.exit(1);
});
