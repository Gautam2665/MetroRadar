const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏆 Running Sprint v0.6.5-I Golden Regression Test Suite for Multi-Corridor Mumbai Network...');

// Verify Line 1 CTM
const l1Path = path.resolve('datasets/mumbai/normalized/ctm-line1.json');
assert(fs.existsSync(l1Path), 'ctm-line1.json must exist');
const ctmL1 = JSON.parse(fs.readFileSync(l1Path, 'utf8'));

// 1. Line 1 P0 Integrity
console.log('\n1. LINE 1 P0 INTEGRITY:');
assert.strictEqual(ctmL1.systemId, 'MUMBAI_LINE1', 'Line 1 systemId matches');
console.log('  ✅ Test 1: Line 1 systemId is MUMBAI_LINE1');

assert.strictEqual(ctmL1.stations.length, 12, 'Line 1 has exactly 12 stations');
console.log('  ✅ Test 2: Line 1 has exactly 12 revenue stations');

assert.strictEqual(ctmL1.stationGraph.edges.length, 11, 'Line 1 has exactly 11 edges');
console.log('  ✅ Test 3: Line 1 stationGraph has exactly 11 edges');

assert.strictEqual(ctmL1.gauge, 'STANDARD_1435mm', 'Gauge is standard');
assert.strictEqual(ctmL1.electrification, '25kV AC Overhead Catenary (OHE)', 'Electrification is 25kV OHE');
console.log('  ✅ Test 4: Technical specifications verified (1435mm SG, 25kV AC OHE)');

// 2. Marol Naka Interchange Contract
console.log('\n2. MAROL NAKA INTERCHANGE CONTRACT:');
const marolL1 = ctmL1.stations.find(s => s.canonicalId === 'STN_L1_008');
assert(marolL1 && marolL1.name.includes('Marol'), 'Marol Naka is STN_L1_008');

const xfer = ctmL1.transfers.find(t => t.transferId === 'XFER_MAROL_NAKA_L3');
assert(xfer, 'XFER_MAROL_NAKA_L3 transfer declared');
assert.strictEqual(xfer.targetStationId, 'STN_L3_004', 'Targets STN_L3_004');
assert.strictEqual(xfer.walkingDistanceMeters, 170, 'Walking distance is 170m');
assert.strictEqual(xfer.transferPenaltySeconds, null, 'transferPenaltySeconds is null');
assert.strictEqual(xfer.requiresEmpiricalObservation, true, 'requiresEmpiricalObservation is true');
console.log('  ✅ Test 5: Marol Naka interchange link is calibrated to STN_L3_004 (170m)');
console.log('  ✅ Test 6: Transfer penalty remains null pending empirical observation');

// 3. Multi-Corridor Graph Composition
console.log('\n3. MULTI-CORRIDOR GRAPH COMPOSITION:');
const l3Path = path.resolve('datasets/mumbai/normalized/ctm.json');
const ctmL3 = JSON.parse(fs.readFileSync(l3Path, 'utf8'));

const totalStations = ctmL3.stations.length + ctmL1.stations.length;
assert.strictEqual(totalStations, 39, 'Network total is 39 stations across 2 corridors');
console.log('  ✅ Test 7: Multi-corridor graph integrates 39 stations across 2 corridors');

// 4. GTFS Schedule Isolation Contract
console.log('\n4. SCHEDULE & CONTRACT ISOLATION:');
assert.strictEqual(ctmL1.gtfsBoundaryContract.scheduleStatus, 'BLOCKED', 'Line 1 GTFS schedule is BLOCKED');
console.log('  ✅ Test 8: Schedule generation is BLOCKED without synthetic commercial trips');

console.log('\n────────────────────────────────────────────────────────────');
console.log('GOLDEN MULTI-CORRIDOR REGRESSION: ALL 8/8 TESTS PASSED');
console.log('────────────────────────────────────────────────────────────\n');
