const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const freqs = await prisma.frequency.findMany();
  console.log('Frequency count:', freqs.length);
  if (freqs.length > 0) {
    console.log('Frequency sample:', freqs.slice(0, 5));
  }

  // Check all trips for Line 2A around 13:00 to 13:30
  const stopTimesNow = await prisma.stopTime.findMany({
    where: {
      trip: { line: { code: 'LINE2A' } },
      departureTime: { gte: '13:00:00', lte: '13:30:00' },
      station: { name: { contains: 'Dahisar', mode: 'insensitive' } }
    },
    select: {
      departureTime: true,
      trip: { select: { tripId: true, serviceId: true, directionId: true } }
    },
    orderBy: { departureTime: 'asc' }
  });
  console.log('StopTimes between 13:00 and 13:30 at Dahisar for LINE2A:', stopTimesNow);
}

main().finally(() => prisma.$disconnect());
