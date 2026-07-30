import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const line = await prisma.line.findFirst({
    where: { name: { contains: 'BLUE', mode: 'insensitive' } },
    include: {
      trips: {
        where: { shapeId: { not: null } },
        take: 1,
      },
    },
  });

  if (!line || !line.trips[0] || !line.trips[0].shapeId) {
    console.log('No line or shape found.');
    return;
  }

  const shapeId = line.trips[0].shapeId;
  console.log(`Checking shapeId ${shapeId} for Line ${line.name}...`);

  const shapes = await prisma.shape.findMany({
    where: { shapeId },
    orderBy: { sequence: 'asc' },
  });

  console.log(`Total shape points: ${shapes.length}`);

  // Find shape points near Rajendra Place / Karol Bagh (lat 28.64, lon 77.16 - 77.21)
  const nearby = shapes.filter(
    (s) =>
      s.latitude >= 28.63 &&
      s.latitude <= 28.66 &&
      s.longitude >= 77.16 &&
      s.longitude <= 77.21,
  );

  console.log(`Nearby shape points count: ${nearby.length}`);
  for (const s of nearby) {
    console.log(`Seq ${s.sequence}: (${s.latitude}, ${s.longitude})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
