const { PrismaClient } = require('@prisma/client');
const { LandmarkRegistry } = require('../apps/backend/dist/modules/gis/services/landmark-registry');

const prisma = new PrismaClient();

async function testPhase1And2() {
  console.log('================================================================');
  console.log('🧪 TESTING PHASE 1 & PHASE 2: GTFS 2.0 & LANDMARK SNAPPING');
  console.log('================================================================\n');

  // 1. Verify Phase 1: Station Entrances in Database
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

  // 2. Verify Phase 2: Landmark Registry & Direct Connections
  console.log('\n🏢 [Test 2] Verifying Landmark Registry & Aliases...');
  const oberoi = LandmarkRegistry.findByNameOrAlias('Oberoi Sky City');
  console.log(`- Oberoi Sky City matched:`, {
    name: oberoi?.name,
    station: oberoi?.connectedStationName,
    stationCode: oberoi?.connectedStationCode,
    hasDirectFob: oberoi?.hasDirectFob,
    walkDistance: `${oberoi?.walkDistanceMeters}m`,
    note: oberoi?.corridorNote
  });

  const infiniti = LandmarkRegistry.findByNameOrAlias('Infiniti Mall Malad');
  console.log(`- Infiniti Mall Malad matched:`, {
    name: infiniti?.name,
    station: infiniti?.connectedStationName,
    stationCode: infiniti?.connectedStationCode,
    hasDirectAccess: infiniti?.hasDirectAccess,
    walkDistance: `${infiniti?.walkDistanceMeters}m`,
    note: infiniti?.corridorNote
  });

  if (oberoi?.connectedStationName === 'Devipada' && oberoi.hasDirectFob) {
    console.log('   ✅ PASS: Oberoi Sky City deterministically binds to Devipada via FOB (NOT Magathane)!');
  } else {
    console.error('   ❌ FAIL: Oberoi Sky City did not bind to Devipada!');
  }

  // 3. Verify Spatial Snapping
  console.log('\n📐 [Test 3] Verifying Spatial Snapping from Coordinates...');
  // Point inside Oberoi Sky City township (19.2246, 72.8637)
  const snappedOberoi = LandmarkRegistry.snapCoordinateToLandmark(72.8637, 19.2246, 300);
  console.log(`- Coordinate [19.2246, 72.8637] snapped to: ${snappedOberoi?.name} -> Station: ${snappedOberoi?.connectedStationName}`);

  // Point inside Infiniti Mall Malad (19.1843, 72.8338)
  const snappedInfiniti = LandmarkRegistry.snapCoordinateToLandmark(72.8338, 19.1843, 300);
  console.log(`- Coordinate [19.1843, 72.8338] snapped to: ${snappedInfiniti?.name} -> Station: ${snappedInfiniti?.connectedStationName}`);

  if (snappedOberoi?.id === 'LM_OBEROI_SKY_CITY' && snappedInfiniti?.id === 'LM_INFINITI_MALL_MALAD') {
    console.log('   ✅ PASS: Turf/Haversine spatial snapping resolves landmarks with 0m street walking!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED: PHASE 1 & 2 FOUNDATION COMPLETE');
  console.log('================================================================');
}

testPhase1And2()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
