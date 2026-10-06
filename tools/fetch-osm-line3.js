async function testOverpass() {
  const query = `[out:json][timeout:25];
  (
    node["railway"="station"](19.09,72.84,19.16,72.90);
    way["railway"="station"](19.09,72.84,19.16,72.90);
    relation["name"~"Line 3|Aqua",i];
  );
  out center;`;
  const res = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query), {
    headers: { 'User-Agent': 'MetroRadar-App/1.0 (contact@metroradar.in)' }
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log('Found elements:', data.elements.length);
    data.elements.forEach(e => {
      const lat = e.lat || e.center?.lat;
      const lon = e.lon || e.center?.lon;
      console.log(`[${e.type}] "${e.tags?.name}" | Lat: ${lat}, Lon: ${lon} | Tags:`, JSON.stringify(e.tags));
    });
  } catch (err) {
    console.log('Raw response:', text.slice(0, 500));
  }
}
testOverpass().catch(console.error);
