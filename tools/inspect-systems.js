const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const systems = await prisma.system.findMany({
    select: { id: true, code: true, name: true, city: true, status: true }
  });
  console.log('Systems in DB:', systems);
}

main().catch(console.error).finally(() => prisma.$disconnect());
