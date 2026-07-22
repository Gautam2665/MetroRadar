import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing GTFS spatial coordinate anomalies...");

  // 1. Fix Rajendra Place (was 28.64241, 77.191833 -> misplaced east of Karol Bagh)
  const rajendra = await prisma.station.updateMany({
    where: {
      name: { contains: "Rajendra Place", mode: "insensitive" },
    },
    data: {
      latitude: 28.6425,
      longitude: 77.1781,
    },
  });
  console.log(`Updated Rajendra Place stations count: ${rajendra.count}`);

  // 2. Fix Adarsh Nagar (was 28.696377, 77.208809 -> misplaced east of Azadpur)
  const adarsh = await prisma.station.updateMany({
    where: {
      name: { contains: "Adarsh Nagar", mode: "insensitive" },
    },
    data: {
      latitude: 28.7161,
      longitude: 77.1704,
    },
  });
  console.log(`Updated Adarsh Nagar stations count: ${adarsh.count}`);

  console.log("Database spatial fixes applied successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
