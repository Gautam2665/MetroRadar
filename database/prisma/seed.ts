import { PrismaClient, SystemStatus, LineStatus, TractionType, SignallingType, LevelType, PlatformStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MetroRadar database...');

  // 1. Create System
  const system = await prisma.system.create({
    data: {
      code: 'MM',
      name: 'Mumbai Metro',
      city: 'Mumbai',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: SystemStatus.ACTIVE,
    },
  });

  // 2. Create Agency
  const agency = await prisma.agency.create({
    data: {
      code: 'MMMOCL',
      name: 'Maha Mumbai Metro Operation Corporation Limited',
      website: 'https://www.mmmocl.co.in',
    },
  });

  // 3. Create AssetOwner
  const assetOwner = await prisma.assetOwner.create({
    data: {
      code: 'MMRDA',
      name: 'Mumbai Metropolitan Region Development Authority',
      website: 'https://mmrda.maharashtra.gov.in',
    },
  });

  // 4. Create Line
  const line = await prisma.line.create({
    data: {
      systemId: system.id,
      agencyId: agency.id,
      assetOwnerId: assetOwner.id,
      code: 'LINE_2A',
      name: 'Line 2A (Yellow Line)',
      color: '#FFD700',
      status: LineStatus.ACTIVE,
      traction: TractionType.OVERHEAD_CATENARY,
      signalling: SignallingType.CBTC,
      gauge: '1435mm',
      length: 18.6,
    },
  });

  // 5. Create Stations
  // Dahisar East
  const dahisar = await prisma.station.create({
    data: {
      systemId: system.id,
      code: 'DAHISAR_EAST',
      name: 'Dahisar East',
      latitude: 19.2682,
      longitude: 72.8631,
      timezone: 'Asia/Kolkata',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      wheelchairAccessible: true,
    },
  });

  // Kandarpada
  const kandarpada = await prisma.station.create({
    data: {
      systemId: system.id,
      code: 'KANDARPADA',
      name: 'Kandarpada',
      latitude: 19.2558,
      longitude: 72.8532,
      timezone: 'Asia/Kolkata',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      wheelchairAccessible: true,
    },
  });

  // Borivali West
  const borivali = await prisma.station.create({
    data: {
      systemId: system.id,
      code: 'BORIVALI_WEST',
      name: 'Borivali West',
      latitude: 19.2312,
      longitude: 72.8465,
      timezone: 'Asia/Kolkata',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      wheelchairAccessible: true,
    },
  });

  // 6. StationSequence
  // Dahisar East -> Kandarpada -> Borivali West
  await prisma.stationSequence.create({
    data: {
      lineId: line.id,
      stationId: dahisar.id,
      sequence: 1,
      distanceFromPrevious: 0.0,
      travelTimeFromPrevious: 0,
      nextStationId: kandarpada.id,
    },
  });

  await prisma.stationSequence.create({
    data: {
      lineId: line.id,
      stationId: kandarpada.id,
      sequence: 2,
      distanceFromPrevious: 1600.0,
      travelTimeFromPrevious: 120,
      nextStationId: borivali.id,
    },
  });

  await prisma.stationSequence.create({
    data: {
      lineId: line.id,
      stationId: borivali.id,
      sequence: 3,
      distanceFromPrevious: 2700.0,
      travelTimeFromPrevious: 210,
    },
  });

  // 7. Station Container Elements (Levels, Platforms, Entrances)
  const stationContainers = [
    { station: dahisar, name: 'Dahisar East' },
    { station: kandarpada, name: 'Kandarpada' },
    { station: borivali, name: 'Borivali West' }
  ];

  for (const s of stationContainers) {
    // One Concourse level
    await prisma.level.create({
      data: {
        stationId: s.station.id,
        name: 'Concourse Level',
        levelNumber: 1,
        type: LevelType.CONCOURSE,
        description: `Main ticketing and fare control level for ${s.name}`,
      },
    });

    // One Platform level
    const platformLevel = await prisma.level.create({
      data: {
        stationId: s.station.id,
        name: 'Platform Level',
        levelNumber: 2,
        type: LevelType.PLATFORM,
        description: `Train boarding level for ${s.name}`,
      },
    });

    // Two Platforms on Platform Level
    // Platform 1: Towards Borivali West / Andheri West
    await prisma.platform.create({
      data: {
        levelId: platformLevel.id,
        lineId: line.id,
        platformNumber: 'Platform 1',
        towardsStationId: borivali.id,
        status: PlatformStatus.ACTIVE,
        screenDoors: true,
        wheelchairBoarding: true,
      },
    });

    // Platform 2: Towards Dahisar East
    await prisma.platform.create({
      data: {
        levelId: platformLevel.id,
        lineId: line.id,
        platformNumber: 'Platform 2',
        towardsStationId: dahisar.id,
        status: PlatformStatus.ACTIVE,
        screenDoors: true,
        wheelchairBoarding: true,
      },
    });

    // One Entrance on Street Level
    await prisma.entrance.create({
      data: {
        stationId: s.station.id,
        name: 'Entrance A',
        latitude: s.station.latitude + 0.0001,
        longitude: s.station.longitude + 0.0001,
        accessible: true,
        escalator: true,
        lift: true,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
