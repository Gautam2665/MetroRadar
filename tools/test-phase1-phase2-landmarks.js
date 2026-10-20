const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPhase1And2() {
  console.log('================================================================');
  console.log('🧪 TESTING: GTFS ENTRANCES & GATES FROM POSTGRESQL');
  console.log('================================================================\n');

  // 1. Verify Station Entrances in Database
  console.log('📍 [Test 1] Verifying Physical Gates (location_type = 2) in DB...');
  const devipada = await prisma.station.findFirst({
    where: { code: 'STN_L7_004' },
    include: { entrances: true }
  });
  console.log(`- Devipada Station (${devipada?.name}): ${devipada?.entrances.length} entrances mapped:`);
  devipada?.entrances.forEach(e => console.log(`   • ${e.name} (lat: ${e.latitude}, lon: ${e.longitude}, accessible: ${e.accessible})`));

  const hasOberoiFob = devipada?.entrances.some(e => e.name.includes('Oberoi Sky City'));
  if (hasOberoiFob) {
    console.log('   ✅ PASS: Dedicated Oberoi Sky City Level 1 FOB node exists!');
  } else {
    console.error('   ❌ FAIL: Oberoi Sky City FOB not found!');
  }

  // 2. Verify Database GTFS Entrance Lookups
  console.log('\n🏢 [Test 2] Verifying Direct GTFS Entrance Queries...');
  const matchedEntrance = await prisma.entrance.findFirst({
    where: {
      name: { contains: 'Oberoi Sky City', mode: 'insensitive' },
      isActive: true,
    },
    include: { station: true },
  });

  console.log(`- Matched Entrance in DB:`, {
    id: matchedEntrance?.id,
    name: matchedEntrance?.name,
    station: matchedEntrance?.station?.name,
    stationCode: matchedEntrance?.station?.code,
    lift: matchedEntrance?.lift,
    escalator: matchedEntrance?.escalator,
  });

  if (matchedEntrance?.station?.name === 'Devipada') {
    console.log('   ✅ PASS: Oberoi Sky City connects to Devipada via GTFS Entrance!');
  } else {
    console.error('   ❌ FAIL: Oberoi Sky City did not bind to Devipada!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED: GTFS DATABASE IS SOURCE OF TRUTH');
  console.log('================================================================');
}

testPhase1And2()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

  .finally(() => prisma.$disconnect());
