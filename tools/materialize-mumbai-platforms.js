const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function materializeMumbaiPlatforms() {
  console.log('🚀 Materializing Mumbai Platforms & Levels (Sprint v0.6.5-L)...');

  const line1 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE1' } });
  const line3 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE3' } });

  if (!line1 || !line3) {
    throw new Error('MUMBAI_LINE1 or MUMBAI_LINE3 line not found in database.');
  }

  // Fetch all Mumbai stations
  const stations = await prisma.station.findMany({
    where: { system: { code: 'MM' } },
  });

  const stnMap = new Map(stations.map((s) => [s.code, s]));

  // Terminals
  const stnVersova = stnMap.get('STN_L1_001');
  const stnGhatkopar = stnMap.get('STN_L1_012');
  const stnAarey = stnMap.get('STN_L3_001');
  const stnCuffeParade = stnMap.get('STN_L3_027');

  if (!stnVersova || !stnGhatkopar || !stnCuffeParade || !stnAarey) {
    throw new Error('Could not find terminal stations for Line 1 or Line 3.');
  }

  // Clean existing platforms & levels for these stations
  const stnIds = stations.map((s) => s.id);
  await prisma.platform.deleteMany({
    where: { lineId: { in: [line1.id, line3.id] } },
  });
  await prisma.level.deleteMany({
    where: { stationId: { in: stnIds } },
  });

  console.log('  Cleaned existing platform and level records for Mumbai lines.');

  let platformCount = 0;
  let levelCount = 0;

  // 1. Materialize Line 1 Stations (12 stations)
  for (let i = 1; i <= 12; i++) {
    const code = `STN_L1_${String(i).padStart(3, '0')}`;
    const station = stnMap.get(code);
    if (!station) continue;

    // Create Platform Level
    const level = await prisma.level.create({
      data: {
        stationId: station.id,
        name: 'Platform Level (Elevated)',
        levelNumber: 1,
        type: 'PLATFORM',
        description: 'Elevated side-platform layout on viaduct',
        isActive: true,
      },
    });
    levelCount++;

    // Platform 1: Eastbound to Ghatkopar (for all except Ghatkopar terminal)
    if (i < 12) {
      await prisma.platform.create({
        data: {
          levelId: level.id,
          lineId: line1.id,
          platformNumber: '1',
          towardsStationId: stnGhatkopar.id,
          screenDoors: false,
          wheelchairBoarding: true,
          status: 'ACTIVE',
          isActive: true,
        },
      });
      platformCount++;
    }

    // Platform 2: Westbound to Versova (for all except Versova terminal)
    if (i > 1) {
      await prisma.platform.create({
        data: {
          levelId: level.id,
          lineId: line1.id,
          platformNumber: '2',
          towardsStationId: stnVersova.id,
          screenDoors: false,
          wheelchairBoarding: true,
          status: 'ACTIVE',
          isActive: true,
        },
      });
      platformCount++;
    }
  }

  // 2. Materialize Line 3 Stations (27 stations)
  for (let i = 1; i <= 27; i++) {
    const code = `STN_L3_${String(i).padStart(3, '0')}`;
    const station = stnMap.get(code);
    if (!station) continue;

    // Create Platform Level
    const level = await prisma.level.create({
      data: {
        stationId: station.id,
        name: 'Platform Level (Underground)',
        levelNumber: -2,
        type: 'PLATFORM',
        description: 'Underground center-island platform layout between twin tunnels',
        isActive: true,
      },
    });
    levelCount++;

    // Platform 1: Northbound to Aarey JVLR (for all stations except Aarey terminal i=1)
    if (i > 1) {
      await prisma.platform.create({
        data: {
          levelId: level.id,
          lineId: line3.id,
          platformNumber: '1',
          towardsStationId: stnAarey.id,
          screenDoors: true,
          wheelchairBoarding: true,
          status: 'ACTIVE',
          isActive: true,
        },
      });
      platformCount++;
    }

    // Platform 2: Southbound to Cuffe Parade (for all stations except Cuffe Parade terminal i=27)
    if (i < 27) {
      await prisma.platform.create({
        data: {
          levelId: level.id,
          lineId: line3.id,
          platformNumber: '2',
          towardsStationId: stnCuffeParade.id,
          screenDoors: true,
          wheelchairBoarding: true,
          status: 'ACTIVE',
          isActive: true,
        },
      });
      platformCount++;
    }
  }

  console.log(`✅ Materialized ${levelCount} levels and ${platformCount} platforms successfully.`);
}

materializeMumbaiPlatforms()
  .catch((err) => {
    console.error('❌ Error materializing platforms:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
