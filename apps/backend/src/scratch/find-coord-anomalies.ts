import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function main() {
  const lines = await prisma.line.findMany({
    include: {
      trips: {
        where: { isActive: true },
        take: 1,
        include: {
          stopTimes: {
            orderBy: { stopSequence: "asc" },
            include: { station: true },
          },
        },
      },
    },
  });

  console.log(`Checking ${lines.length} lines for zig-zag spatial anomalies...\n`);

  for (const line of lines) {
    if (!line.trips[0]) continue;
    const stopTimes = line.trips[0].stopTimes;
    if (stopTimes.length < 3) continue;

    for (let i = 0; i < stopTimes.length - 2; i++) {
      const s1 = stopTimes[i].station;
      const s2 = stopTimes[i + 1].station;
      const s3 = stopTimes[i + 2].station;

      const d12 = getDistanceMeters(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
      const d23 = getDistanceMeters(s2.latitude, s2.longitude, s3.latitude, s3.longitude);
      const d13 = getDistanceMeters(s1.latitude, s1.longitude, s3.latitude, s3.longitude);

      // If going s1 -> s2 -> s3 travels significantly MORE distance than s1 -> s3 directly,
      // it indicates a zig-zag overshoot (s2 is misplaced relative to s1 and s3)
      if (d12 + d23 > 2.2 * d13 && (d12 > 1000 || d23 > 1000)) {
        console.log(`ANOMALY in Line ${line.name} (${line.code}):`);
        console.log(`  [1] ${s1.name} (${s1.latitude}, ${s1.longitude})`);
        console.log(`  [2] ${s2.name} (${s2.latitude}, ${s2.longitude}) <-- POSSIBLY MISPLACED (d12=${Math.round(d12)}m, d23=${Math.round(d23)}m vs d13=${Math.round(d13)}m)`);
        console.log(`  [3] ${s3.name} (${s3.latitude}, ${s3.longitude})\n`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
