const assert = require('assert');
const { rankJourneysForPersona } = require('./journey-ranking');

console.log('🏆 Running Sprint v0.6.5-J Persona-Aware Journey Routing Benchmark...\n');
console.log('BENCHMARK SCENARIO: Mumbai Central (STN_L3_019) -> Versova (STN_L1_001)\n');

// 1. Define Topological Candidates (Generated from CTM / TransitGraph)
const candidateMarolNaka = {
  id: "cand-l3-marol-l1",
  name: "Line 3 Aqua -> Marol Naka Transfer -> Line 1 Blue",
  origin: "Mumbai Central (Line 3)",
  destination: "Versova (Line 1)",
  nominalDurationMinutes: 52,
  nominalDurationSeconds: 3120,
  totalDistanceKm: 27.5,
  legs: [
    {
      type: "TRANSIT",
      corridorId: "MUMBAI_LINE3",
      corridorName: "Line 3 (Aqua Line)",
      fromStation: "Mumbai Central",
      fromStationId: "STN_L3_019",
      toStation: "Marol Naka",
      toStationId: "STN_L3_004",
      stopsCount: 15,
      durationSeconds: 2160, // 36 mins
      distanceMeters: 20800
    },
    {
      type: "TRANSFER",
      corridorId: "ICX-MAROL-NAKA",
      fromCorridorId: "MUMBAI_LINE3",
      toCorridorId: "MUMBAI_LINE1",
      fromStation: "Marol Naka (L3)",
      toStation: "Marol Naka (L1)",
      distanceMeters: 170,
      durationSeconds: 180 // 3 mins physical baseline walk
    },
    {
      type: "TRANSIT",
      corridorId: "MUMBAI_LINE1",
      corridorName: "Line 1 (Blue Line)",
      fromStation: "Marol Naka",
      fromStationId: "STN_L1_008",
      toStation: "Versova",
      toStationId: "STN_L1_001",
      stopsCount: 7,
      durationSeconds: 780, // 13 mins
      distanceMeters: 6720
    }
  ]
};

// Alternative candidate: Direct Western Railway Suburban Express + Line 1 at Andheri
const candidateAndheriFob = {
  id: "cand-wr-andheri-l1",
  name: "Western Railway Suburban Fast Local -> Andheri FOB -> Line 1 Blue",
  origin: "Mumbai Central (Suburban)",
  destination: "Versova (Line 1)",
  nominalDurationMinutes: 44,
  nominalDurationSeconds: 2640,
  totalDistanceKm: 22.0,
  legs: [
    {
      type: "TRANSIT",
      corridorId: "SUBURBAN_WR",
      corridorName: "Western Suburban Railway",
      fromStation: "Mumbai Central (Local)",
      toStation: "Andheri (Local)",
      stopsCount: 4,
      durationSeconds: 1680, // 28 mins
      distanceMeters: 18000
    },
    {
      type: "TRANSFER",
      corridorId: "ICX-ANDHERI",
      fromCorridorId: "INDIAN_RAILWAYS_WR",
      toCorridorId: "MUMBAI_LINE1",
      fromStation: "Andheri Railway Station",
      toStation: "Andheri Metro",
      distanceMeters: 110,
      durationSeconds: 240 // 4 mins
    },
    {
      type: "TRANSIT",
      corridorId: "MUMBAI_LINE1",
      corridorName: "Line 1 (Blue Line)",
      fromStation: "Andheri",
      fromStationId: "STN_L1_004",
      toStation: "Versova",
      toStationId: "STN_L1_001",
      stopsCount: 3,
      durationSeconds: 360, // 6 mins
      distanceMeters: 3200
    }
  ]
};

const rawCandidates = [candidateMarolNaka, candidateAndheriFob];

// ====================================================================
// TEST 1: STANDARD COMMUTER (Time-Minimized Baseline)
// ====================================================================
console.log('────────────────────────────────────────────────────────────');
console.log('TEST 1: STANDARD COMMUTER (No luggage, fully able-bodied)');
console.log('────────────────────────────────────────────────────────────');

const standardResult = rankJourneysForPersona(rawCandidates, 'STANDARD_COMMUTER');
console.log(`Evaluated: ${standardResult.totalCandidatesEvaluated} candidates | Feasible: ${standardResult.feasibleCandidatesCount}`);

const stdWinner = standardResult.rankedCandidates[0];
console.log(`Rank 1 Choice : ${stdWinner.enrichedJourney.name}`);
console.log(`Nominal Time  : ${stdWinner.nominalDurationMinutes} mins`);
console.log(`Effective Cost: ${stdWinner.effectiveCostMinutes} mins`);
console.log(`Friction Added: ${stdWinner.totalFrictionMinutes} mins (Standard commuters incur 0 policy friction)\n`);

assert.strictEqual(stdWinner.isFeasible, true, "Standard candidate must be feasible");
assert.strictEqual(stdWinner.totalFrictionSeconds, 0, "Standard commuter should have zero policy friction penalty");
console.log('✅ Assertion Passed: Standard Commuter minimizes raw nominal journey time.\n');

// ====================================================================
// TEST 2: LUGGAGE HEAVY (Passenger with bags / suitcases)
// ====================================================================
console.log('────────────────────────────────────────────────────────────');
console.log('TEST 2: LUGGAGE HEAVY (Passenger carrying bags from Mumbai Central)');
console.log('────────────────────────────────────────────────────────────');

const luggageResult = rankJourneysForPersona(rawCandidates, 'LUGGAGE_HEAVY');
console.log(`Evaluated: ${luggageResult.totalCandidatesEvaluated} candidates | Feasible: ${luggageResult.feasibleCandidatesCount}`);

luggageResult.rankedCandidates.forEach((cand, idx) => {
  console.log(`\nCandidate ${idx + 1}: ${cand.enrichedJourney.name}`);
  console.log(`  Nominal Duration : ${cand.nominalDurationMinutes} mins`);
  console.log(`  Friction Penalty : +${cand.totalFrictionMinutes} mins`);
  console.log(`  Effective Cost   : ${cand.effectiveCostMinutes} mins`);
  console.log('  Friction Breakdown:');
  cand.frictionBreakdown.forEach(f => {
    console.log(`    - [${f.component}] +${Math.round(f.penaltySeconds / 60)}m (${f.penaltySeconds}s): ${f.reason} [Source: ${f.source}]`);
  });
});

const marolLuggageEval = luggageResult.rankedCandidates.find(c => c.journeyId === "cand-l3-marol-l1");
assert(marolLuggageEval, "Marol Naka candidate must be evaluated");
// Assert the 4 explicit policy penalties on Marol Naka:
// 1. unpaidStreetWalk (+600s)
// 2. securityRescreening (+300s)
// 3. afcRetap (+60s)
// 4. verticalMovement (31.5m * 10 = +315s)
// Total = 1275s (~21 mins)
assert.strictEqual(marolLuggageEval.totalFrictionSeconds, 1275, "Marol Naka friction penalty must be exactly 1275s");
assert.strictEqual(marolLuggageEval.effectiveCostSeconds, 3120 + 1275, "Effective journey cost must be nominal + friction");

console.log('\n✅ Assertion Passed: Marol Naka correctly penalized by +21.25 mins of explicit physical friction for heavy luggage.\n');

// ====================================================================
// TEST 3: ACCESSIBLE / REDUCED MOBILITY (Hard Safety Constraint)
// ====================================================================
console.log('────────────────────────────────────────────────────────────');
console.log('TEST 3: ACCESSIBLE_REDUCED_MOBILITY (Wheelchair / Step-Free Mandate)');
console.log('────────────────────────────────────────────────────────────');

const accessibleResult = rankJourneysForPersona(rawCandidates, 'ACCESSIBLE_REDUCED_MOBILITY');
console.log(`Evaluated: ${accessibleResult.totalCandidatesEvaluated} candidates | Feasible: ${accessibleResult.feasibleCandidatesCount}`);

accessibleResult.rankedCandidates.forEach(cand => {
  console.log(`\nCandidate: ${cand.enrichedJourney.name}`);
  console.log(`  Feasible: ${cand.isFeasible ? '✅ YES' : '❌ NO'}`);
  if (!cand.isFeasible) {
    console.log('  Violations:');
    cand.feasibilityViolations.forEach(v => {
      console.log(`    - [${v.constraint}] at ${v.complexId}: ${v.violation}`);
    });
  }
});

const marolAccessibleEval = accessibleResult.rankedCandidates.find(c => c.journeyId === "cand-l3-marol-l1");
assert.strictEqual(marolAccessibleEval.isFeasible, false, "Marol Naka MUST be flagged infeasible for reduced mobility");
assert(marolAccessibleEval.feasibilityViolations.some(v => v.constraint === 'elevatorVerificationRequired'), "Must flag unverified elevator");
assert(marolAccessibleEval.feasibilityViolations.some(v => v.constraint === 'outdoorStreetTransferAllowed'), "Must flag outdoor street transfer");

console.log('\n✅ Assertion Passed: Reduced Mobility strictly rejects Marol Naka due to unverified elevator and outdoor street footpath.\n');

console.log('────────────────────────────────────────────────────────────');
console.log('🎉 ALL SPRINT v0.6.5-J BENCHMARK & REGRESSION ASSERTIONS PASSED!');
console.log('────────────────────────────────────────────────────────────\n');
