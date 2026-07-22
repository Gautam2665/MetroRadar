import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const line = await prisma.line.findFirst({
    where: {
      name: { contains: "BLUE", mode: "insensitive" },
    },
    include: {
      trips: {
        where: { shapeId: "shp_1_14" },
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

  if (!line || !line.trips[0]) {
    console.log("No trip found.");
    return;
  }

  console.log("All stations on Blue Line trip:");
  const stopTimes = line.trips[0].stopTimes;
  for (const st of stopTimes) {
    console.log(
      `${st.stopSequence}: ${st.station.name} (${st.station.code}) - lat: ${st.station.latitude}, lon: ${st.station.longitude}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
