/**
 * test-mumbai-matrix.js
 * Comprehensive automated verification test matrix for Sprint v0.6.5-M:
 * Deterministic Journey Semantics & Frontend Contract.
 *
 * Validates:
 * 1. Platform & Direction Resolution (positive directional platforms for Line 1 & Line 3)
 * 2. Interchange Complex ICX Verification (Marol Naka L1 <-> L3 pathway, duration, and reason codes)
 * 3. End-to-end Multi-leg Journey Planning Matrix (4 cross-city Mumbai routes)
 * 4. Negative / Unknown Data Verification (unverified platform & doorSide -> null / UNKNOWN)
 * 5. Terminology & Contract Invariants (Ride N stops, Transfer — 155 m · ~7–8 min, hopCount, etc.)
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKEND_URL = 'http://localhost:3001';

async function fetchJourney(fromId, toId) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/journeys?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`;
    http.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed parsing JSON: ${e.message} (status: ${res.statusCode}, body: ${raw})`));
        }
      });
    }).on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASSED: ${message}`);
}

async function run() {
  console.log('================================================================');
  console.log('🚆 TransitOS Sprint v0.6.5-M — Mumbai End-to-End Test Matrix');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function countTest(fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
    } catch (e) {
      // already logged
    }
  }

  // ── Lookup Test Stations ──────────────────────────────────────────────────
  console.log('🔍 Resolving station entities from database...');
  const [versova, azadNagar, marol1, marol3, csmiaT2, vidhanBhawan, mumbaiCentral, cuffeParade] = await Promise.all([
    prisma.station.findFirst({ where: { name: 'Versova' } }),
    prisma.station.findFirst({ where: { name: 'Azad Nagar' } }),
    prisma.station.findFirst({ where: { name: 'Marol Naka', code: 'STN_L1_008' } }),
    prisma.station.findFirst({ where: { name: 'Marol Naka', code: 'STN_L3_004' } }),
    prisma.station.findFirst({ where: { name: 'CSMIA Terminal 2' } }),
    prisma.station.findFirst({ where: { name: 'Vidhan Bhawan' } }),
    prisma.station.findFirst({ where: { name: 'Mumbai Central' } }),
    prisma.station.findFirst({ where: { name: 'Cuffe Parade' } }),
  ]);

  if (!versova || !azadNagar || !marol1 || !marol3 || !csmiaT2 || !vidhanBhawan || !mumbaiCentral || !cuffeParade) {
    throw new Error('Could not resolve all required Mumbai test stations from database.');
  }
  console.log('   All 8 test stations resolved.\n');

  // ── 1. Positive Platform & Direction Tests ─────────────────────────────────
  console.log('----------------------------------------------------------------');
  console.log('TEST SUITE 1: Platform & Direction Deterministic Grounding');
  console.log('----------------------------------------------------------------');

  // 1.1 Versova -> Marol Naka (Line 1 Eastbound)
  {
    console.log('\n[1.1] Versova -> Marol Naka (L1 Eastbound to Ghatkopar)');
    const res = await fetchJourney(versova.id, marol1.id);
    const leg = res.candidates?.[0]?.legs?.[0];
    countTest(() => assert(leg?.towards === 'Ghatkopar', `Towards terminal is 'Ghatkopar' (got: '${leg?.towards}')`));
    countTest(() => assert(leg?.direction === 'GHATKOPAR', `Direction headsign is 'GHATKOPAR' (got: '${leg?.direction}')`));
    countTest(() => assert(leg?.boardingPlatform === 'Platform 1', `Boarding platform is 'Platform 1' (got: '${leg?.boardingPlatform}')`));
    countTest(() => assert(leg?.platformStatus === 'KNOWN', `Platform status is 'KNOWN' (got: '${leg?.platformStatus}')`));
    countTest(() => assert(leg?.doorsOpen === 'Left', `Door side is 'Left' for elevated side platform (got: '${leg?.doorsOpen}')`));
    countTest(() => assert(leg?.doorSideStatus === 'KNOWN_FROM_ENGINEERING', `Door provenance is 'KNOWN_FROM_ENGINEERING' (got: '${leg?.doorSideStatus}')`));
    countTest(() => assert(leg?.stopsText === 'Ride 7 stops', `Passenger stop string is 'Ride 7 stops' (got: '${leg?.stopsText}')`));
  }

  // 1.2 Marol Naka -> Azad Nagar (Line 1 Westbound)
  {
    console.log('\n[1.2] Marol Naka -> Azad Nagar (L1 Westbound to Versova)');
    const res = await fetchJourney(marol1.id, azadNagar.id);
    const leg = res.candidates?.[0]?.legs?.[0];
    countTest(() => assert(leg?.towards === 'Versova', `Towards terminal is 'Versova' (got: '${leg?.towards}')`));
    countTest(() => assert(leg?.direction === 'VERSOVA', `Direction headsign is 'VERSOVA' (got: '${leg?.direction}')`));
    countTest(() => assert(leg?.boardingPlatform === 'Platform 2', `Boarding platform is 'Platform 2' (got: '${leg?.boardingPlatform}')`));
    countTest(() => assert(leg?.platformStatus === 'KNOWN', `Platform status is 'KNOWN'`));
    countTest(() => assert(leg?.doorsOpen === 'Left', `Door side is 'Left' for elevated side platform`));
  }

  // 1.3 Marol Naka -> CSMIA Terminal 2 (Line 3 Southbound)
  {
    console.log('\n[1.3] Marol Naka -> CSMIA T2 (L3 Southbound to Cuffe Parade)');
    const res = await fetchJourney(marol3.id, csmiaT2.id);
    const leg = res.candidates?.[0]?.legs?.[0];
    countTest(() => assert(leg?.towards === 'Cuffe Parade', `Towards terminal is 'Cuffe Parade' (got: '${leg?.towards}')`));
    countTest(() => assert(leg?.direction === 'CUFFE PARADE', `Direction headsign is 'CUFFE PARADE' (got: '${leg?.direction}')`));
    countTest(() => assert(leg?.boardingPlatform === 'Platform 2', `Boarding platform is 'Platform 2' (got: '${leg?.boardingPlatform}')`));
    countTest(() => assert(leg?.platformStatus === 'KNOWN', `Platform status is 'KNOWN'`));
    countTest(() => assert(leg?.doorsOpen === 'Right', `Door side is 'Right' for underground island platform (got: '${leg?.doorsOpen}')`));
    countTest(() => assert(leg?.doorSideStatus === 'KNOWN_FROM_ENGINEERING', `Door provenance is 'KNOWN_FROM_ENGINEERING'`));
    countTest(() => assert(leg?.stopsText === 'Ride 1 stop', `Passenger stop string is singular 'Ride 1 stop' (got: '${leg?.stopsText}')`));
  }

  // 1.4 Vidhan Bhawan -> Marol Naka (Line 3 Northbound)
  {
    console.log('\n[1.4] Vidhan Bhawan -> Marol Naka (L3 Northbound to Aarey JVLR)');
    const res = await fetchJourney(vidhanBhawan.id, marol3.id);
    const leg = res.candidates?.[0]?.legs?.[0];
    countTest(() => assert(leg?.towards === 'Aarey JVLR', `Towards terminal is 'Aarey JVLR' (got: '${leg?.towards}')`));
    countTest(() => assert(leg?.direction === 'AAREY JVLR', `Direction headsign is 'AAREY JVLR' (got: '${leg?.direction}')`));
    countTest(() => assert(leg?.boardingPlatform === 'Platform 1', `Boarding platform is 'Platform 1' (got: '${leg?.boardingPlatform}')`));
    countTest(() => assert(leg?.doorsOpen === 'Right', `Door side is 'Right' for underground island platform`));
  }

  // ── 2. Interchange Complex ICX Verification ─────────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('TEST SUITE 2: Interchange Complex (ICX) Data & Terminology');
  console.log('----------------------------------------------------------------');

  {
    console.log('\n[2.1] Marol Naka L1 <-> L3 Interchange Transfer Leg');
    const res = await fetchJourney(versova.id, csmiaT2.id);
    const candidate = res.candidates?.[0];
    const transferLeg = candidate?.legs?.find(l => l.mode === 'TRANSFER' || l.type === 'WALK');

    countTest(() => assert(transferLeg !== undefined, `Found explicit transfer leg in multi-line journey`));
    countTest(() => assert(transferLeg?.transferDetails !== null, `Transfer leg carries authoritative transferDetails`));
    countTest(() => assert(transferLeg?.transferDetails?.complexId === 'ICX-MAROL-NAKA', `Complex ID is 'ICX-MAROL-NAKA'`));
    countTest(() => assert(transferLeg?.transferDetails?.pathwayDistanceMeters === 155, `Physical pathway distance is exactly 155 m (got: ${transferLeg?.transferDetails?.pathwayDistanceMeters})`));
    countTest(() => assert(transferLeg?.transferDetails?.durationDisplay === '~7–8 min', `Duration display is '~7–8 min' (got: '${transferLeg?.transferDetails?.durationDisplay}')`));
    countTest(() => assert(transferLeg?.transferSummary === 'Transfer — 155 m · ~7–8 min', `Canonical transfer summary is 'Transfer — 155 m · ~7–8 min' (got: '${transferLeg?.transferSummary}')`));
    countTest(() => assert(transferLeg?.transferDetails?.reasonCodes?.length === 4, `4 physical reason codes attached (got: ${transferLeg?.transferDetails?.reasonCodes?.length})`));
    countTest(() => assert(candidate?.walkingDistanceMeters === 155, `Journey total walkingDistanceMeters matches physical 155 m (got: ${candidate?.walkingDistanceMeters})`));
  }

  // ── 3. End-to-End Multi-leg Journey Planning Matrix ────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('TEST SUITE 3: Full Network Journey Planning Matrix');
  console.log('----------------------------------------------------------------');

  const journeyMatrix = [
    { from: mumbaiCentral, to: versova, label: 'Mumbai Central -> Versova', expectedTransfers: 1 },
    { from: mumbaiCentral, to: csmiaT2, label: 'Mumbai Central -> CSMIA Terminal 2', expectedTransfers: 0 },
    { from: vidhanBhawan, to: azadNagar, label: 'Vidhan Bhawan -> Azad Nagar', expectedTransfers: 1 },
    { from: cuffeParade, to: versova, label: 'Cuffe Parade -> Versova', expectedTransfers: 1 },
  ];

  for (const jm of journeyMatrix) {
    console.log(`\n[3.${journeyMatrix.indexOf(jm) + 1}] ${jm.label}`);
    const res = await fetchJourney(jm.from.id, jm.to.id);
    const candidate = res.candidates?.[0];

    countTest(() => assert(candidate !== undefined, `Pathfinder returned valid candidate`));
    countTest(() => assert(candidate?.transfers === jm.expectedTransfers, `Transfers match expected ${jm.expectedTransfers} (got: ${candidate?.transfers})`));
    countTest(() => assert(candidate?.origin?.name === jm.from.name, `Candidate origin is '${jm.from.name}'`));
    countTest(() => assert(candidate?.destination?.name === jm.to.name, `Candidate destination is '${jm.to.name}'`));
    countTest(() => assert(typeof candidate?.duration === 'number' && candidate?.duration > 0, `Duration is positive number (${candidate?.duration} min)`));
    countTest(() => assert(candidate?.legs?.length >= 1, `Candidate has ${candidate?.legs?.length} legs`));
  }

  // ── 4. Negative / Unknown Data Grounding Tests ─────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('TEST SUITE 4: Negative / Unverified Data Grounding');
  console.log('----------------------------------------------------------------');

  {
    console.log('\n[4.1] Unverified Platform & Door Side (Delhi Station Pair)');
    const [delhiOrigin, delhiDest] = await Promise.all([
      prisma.station.findFirst({ where: { name: { contains: 'Kashmere Gate' } } }),
      prisma.station.findFirst({ where: { name: { contains: 'Rajiv Chowk' } } }),
    ]);

    if (delhiOrigin && delhiDest) {
      const res = await fetchJourney(delhiOrigin.id, delhiDest.id);
      const leg = res.candidates?.[0]?.legs?.[0];

      countTest(() => assert(leg?.boardingPlatform === null, `Unverified platform returns null (never guesses 'Platform 1')`));
      countTest(() => assert(leg?.platformStatus === 'UNKNOWN', `Platform status is explicitly 'UNKNOWN'`));
      countTest(() => assert(leg?.doorsOpen === null, `Unverified door side returns null (never guesses)`));
      countTest(() => assert(leg?.doorSideStatus === 'UNKNOWN_SOURCE_REQUIRED', `Door side status is 'UNKNOWN_SOURCE_REQUIRED'`));
    } else {
      console.log('   (Skipping Delhi check - Delhi stations not seeded in this DB instance)');
    }
  }

  // ── 5. Invariant Validation ───────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('TEST SUITE 5: Contract & Terminology Invariants');
  console.log('----------------------------------------------------------------');

  {
    console.log('\n[5.1] Terminology & Invariant Checks');
    const res = await fetchJourney(versova.id, csmiaT2.id);
    const candidate = res.candidates?.[0];

    for (const leg of candidate?.legs || []) {
      if (leg.mode === 'METRO') {
        countTest(() => assert(/^Ride \d+ stops?$/.test(leg.stopsText), `stopsText strictly matches 'Ride N stops' pattern: '${leg.stopsText}'`));
        countTest(() => assert(!leg.stopsText.includes('station'), `stopsText never contains the word 'station'`));
        countTest(() => assert(leg.visitedStationCount === leg.hopCount + 1, `visitedStationCount (${leg.visitedStationCount}) === hopCount (${leg.hopCount}) + 1`));
      } else if (leg.mode === 'TRANSFER') {
        countTest(() => assert(leg.transferSummary.startsWith('Transfer — '), `transferSummary starts with 'Transfer — ': '${leg.transferSummary}'`));
        countTest(() => assert(!leg.transferSummary.includes('170 m'), `transferSummary never contains fabricated '170 m'`));
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RUN COMPLETE: ${passedTests}/${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run()
  .catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
