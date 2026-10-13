const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(cur); cur = ''; }
    else { cur += char; }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

async function main() {
  console.log('=== SYNCING CANONICAL GTFS ENTRANCES (LOCATION_TYPE=2) INTO DATABASE ===');

  const stopsPath = path.resolve('datasets/mumbai/gtfs/stops.txt');
  const lines = fs.readFileSync(stopsPath, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const headers = parseCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    if (obj.location_type === '2') rows.push(obj);
  }

  console.log(`Found ${rows.length} canonical entrance records in GTFS stops.txt`);

  // Load all stations
  const stations = await prisma.station.findMany({
    select: { id: true, code: true, name: true }
  });
  const stationMap = new Map();
  stations.forEach(s => stationMap.set(s.code, s));

  // Clean old entrances for Mumbai stations
  const mmStationIds = stations.map(s => s.id);
  await prisma.entrance.deleteMany({
    where: { stationId: { in: mmStationIds } }
  });

  let createdCount = 0;
  for (const row of rows) {
    const parentStation = stationMap.get(row.parent_station);
    if (!parentStation) continue;

    const isAcc = row.wheelchair_boarding === '1';
    await prisma.entrance.create({
      data: {
        stationId: parentStation.id,
        name: row.stop_name,
        latitude: parseFloat(row.stop_lat),
        longitude: parseFloat(row.stop_lon),
        accessible: isAcc,
        lift: isAcc || row.stop_name.toLowerCase().includes('lift') || row.stop_name.toLowerCase().includes('elevator'),
        escalator: true,
        parking: false,
        isActive: true
      }
    });
    createdCount++;
  }

  console.log(`✔ Synced ${createdCount} canonical entrances into database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
