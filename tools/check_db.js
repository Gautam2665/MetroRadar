const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const st = await prisma.station.findMany({
    where: { name: { contains: 'Kashi', mode: 'insensitive' } },
    select: { id: true, code: true, name: true, systemId: true }
  });
  console.log('Kashigaon in DB:', st);
}

main().catch(console.error).finally(() => prisma.$disconnect());
