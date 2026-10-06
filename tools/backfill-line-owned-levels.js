const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const levels = await prisma.level.findMany({
    where: { lineId: null, isActive: true },
    select: {
      id: true,
      platforms: {
        where: { isActive: true },
        select: { lineId: true },
      },
      station: {
        select: {
          sequences: {
            where: { isActive: true },
            select: { lineId: true },
          },
        },
      },
    },
  });

  let assigned = 0;
  for (const level of levels) {
    const platformOwners = [...new Set(level.platforms.map((item) => item.lineId))];
    const sequenceOwners = [...new Set(level.station.sequences.map((item) => item.lineId))];
    const owners = platformOwners.length > 0 ? platformOwners : sequenceOwners;
    if (owners.length !== 1) continue;

    await prisma.level.update({
      where: { id: level.id },
      data: { lineId: owners[0] },
    });
    assigned++;
  }

  console.log(`Assigned ${assigned} legacy levels to a line where platform or station-sequence evidence identified exactly one owner; ambiguous levels remain unassigned.`);
}

main()
  .catch((error) => {
    console.error('Failed to backfill line-owned levels:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
