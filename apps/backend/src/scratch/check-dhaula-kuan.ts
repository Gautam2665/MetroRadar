import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
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
  console.log(
    'Checking Dhaula Kuan & Durgabai Deshmukh South Campus stations...',
  );

  const stations = await prisma.station.findMany({
    where: {
      OR: [
        { name: { contains: 'Dhaula', mode: 'insensitive' } },
        { name: { contains: 'Durgabai', mode: 'insensitive' } },
        { name: { contains: 'South Campus', mode: 'insensitive' } },
        { name: { contains: 'Sarai Kale Khan', mode: 'insensitive' } },
        { name: { contains: 'IGI Airport', mode: 'insensitive' } },
        { name: { contains: 'Airport', mode: 'insensitive' } },
      ],
    },
    include: {
      sequences: {
        include: { line: true },
      },
    },
  });

  for (const s of stations) {
    console.log(`Station: ${s.name} (${s.code}, id: ${s.id})`);
    console.log(`  Coords: (${s.latitude}, ${s.longitude})`);
    console.log(`  Lines: ${s.sequences.map((sq) => sq.line.name).join(', ')}`);
  }

  // Calculate distance between Dhaula Kuan and Durgabai Deshmukh South Campus
  const dhaula = stations.find((s) => s.name.toLowerCase().includes('dhaula'));
  const southCampus = stations.find(
    (s) =>
      s.name.toLowerCase().includes('durgabai') ||
      s.name.toLowerCase().includes('south campus'),
  );

  if (dhaula && southCampus) {
    const dist = getDistanceMeters(
      dhaula.latitude,
      dhaula.longitude,
      southCampus.latitude,
      southCampus.longitude,
    );
    console.log(
      `\nDistance between ${dhaula.name} and ${southCampus.name}: ${Math.round(dist)} meters.`,
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
