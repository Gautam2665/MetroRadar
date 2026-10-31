const { PrismaClient } = require('@prisma/client');
const { computeStationIsochrones } = require('../scratch/compute_station_isochrones');
const prisma = new PrismaClient();

async function run() {
  console.log("=================================================================");
  console.log("=== BATCH COMPUTING ISOCHRONES FOR LINE 2A & LINE 7 ===");
  console.log("=================================================================\n");

  const stations = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT s.id, s.code, s.name, l.code as line_code, ss.sequence, s.latitude, s.longitude,
           count(e.id)::int as entrance_count
    FROM public.stations s
    JOIN public.station_sequences ss ON ss."stationId" = s.id
    JOIN public.lines l ON l.id = ss."lineId"
    LEFT JOIN public.entrances e ON e."stationId" = s.id AND e."isActive" = true
    WHERE l.code IN ('LINE2A', 'LINE7')
    GROUP BY s.id, s.code, s.name, l.code, ss.sequence, s.latitude, s.longitude
    ORDER BY l.code, ss.sequence;
  `);

  console.log(`Processing ${stations.length} stations across Line 2A and Line 7...\n`);

  let successCount = 0;
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    console.log(`[${i + 1}/${stations.length}] Starting: [${s.line_code}] ${s.code} - ${s.name}`);
    try {
      const res = await computeStationIsochrones(s.id, s.code, s.name, s.longitude, s.latitude);
      if (res) successCount++;
    } catch (err) {
      console.error(`  [ERROR] Failed for ${s.code}:`, err.message);
    }
  }

  console.log("\n=================================================================");
  console.log(`=== COMPLETE: Successfully generated isochrones for ${successCount}/${stations.length} stations ===`);
  console.log("=================================================================");
}

run().catch(console.error).finally(() => prisma.$disconnect());
