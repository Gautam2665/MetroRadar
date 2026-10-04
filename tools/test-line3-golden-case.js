const fs = require('fs');
const path = require('path');

console.log('🏆 Running Sprint v0.6.5-H Golden Regression Test Suite for Mumbai Line 3...\n');

const ctmPath = path.resolve('datasets/mumbai/normalized/ctm.json');
const ctm = JSON.parse(fs.readFileSync(ctmPath, 'utf-8'));

let passedTests = 0;
let totalTests = 0;

function assert(description, condition) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ Test ${totalTests}: ${description}`);
    passedTests++;
  } else {
    console.error(`  ❌ Test ${totalTests} FAILED: ${description}`);
  }
}

// 1. Topology Regression Check
console.log('1. TOPOLOGY REGRESSION:');
assert('Revenue stations count is exactly 27', ctm.stations.length === 27);
assert('Station sequence graph has 27 nodes and 26 edges', ctm.stationGraph.nodes.length === 27 && ctm.stationGraph.edges.length === 26);
assert('Sequence positions are strictly contiguous from 1 to 27', ctm.stations.every((s, i) => s.sequence === i + 1));

// 2. Directionality Regression Check
console.log('\n2. DIRECTIONALITY REGRESSION:');
const firstEdge = ctm.stationGraph.edges[0];
const lastEdge = ctm.stationGraph.edges[ctm.stationGraph.edges.length - 1];
assert('First edge connects Aarey JVLR (1) to SEEPZ (2)', firstEdge.fromStationName === 'Aarey JVLR' && firstEdge.toStationName === 'SEEPZ');
assert('Last edge connects Vidhan Bhawan (26) to Cuffe Parade (27)', lastEdge.fromStationName === 'Vidhan Bhawan' && lastEdge.toStationName === 'Cuffe Parade');
assert('All graph edges are bi-directional for bidirectional service', ctm.stationGraph.edges.every(e => e.biDirectional === true));

// 3. Identity Regression Check
console.log('\n3. IDENTITY REGRESSION:');
assert('Line ID is canonically MUMBAI_LINE3', ctm.systemId === 'MUMBAI_LINE3');
assert('Route ID is canonically ROUTE_MUMBAI_L3', ctm.route.routeId === 'ROUTE_MUMBAI_L3');
assert('Station canonical IDs match STN_L3_001 through STN_L3_027', ctm.stations.every((s, i) => s.canonicalId === `STN_L3_${String(i+1).padStart(3, '0')}`));

// 4. Geometry Regression Check
console.log('\n4. GEOMETRY REGRESSION:');
assert('Canonical alignment vertex count is exactly 28,641', ctm.geometryPipeline.canonicalGeometry.vertexCount === 28641);
assert('Canonical alignment coordinate system is EPSG:4326', ctm.geometryPipeline.canonicalGeometry.crs === 'EPSG:4326');
assert('Geometry pipeline separates rawSource, validatedEvidence, canonicalGeometry, and renderGeometry', 
  !!ctm.geometryPipeline.rawSource && !!ctm.geometryPipeline.validatedEvidence && !!ctm.geometryPipeline.canonicalGeometry && !!ctm.geometryPipeline.renderGeometry);

// 5. Semantic Isolation Check
console.log('\n5. SEMANTIC ISOLATION REGRESSION:');
const revNames = new Set(ctm.stations.map(s => s.name));
assert('Aarey Car Shed depot is NOT in revenue stations list', !revNames.has('Aarey Car Shed / Depot') && !revNames.has('Aarey Depot'));
assert('Navy Nagar extension is NOT in revenue stations list', !revNames.has('Navy Nagar') && !revNames.has('Navy Nagar (Proposed Extension)'));
assert('Aarey Car Shed is isolated in nonRevenuePoints with type DEPOT', ctm.nonRevenuePoints.some(p => p.type === 'DEPOT' && p.name.includes('Aarey')));
assert('Navy Nagar is isolated in nonRevenuePoints with status PROPOSED', ctm.nonRevenuePoints.some(p => p.type === 'PROPOSED_EXTENSION' && p.status === 'PROPOSED'));

// 6. Interchange Isolation Check
console.log('\n6. INTERCHANGE ISOLATION REGRESSION:');
assert('CTM records 8 intermodal interchange connections', ctm.transfers.length === 8);
assert('All interchange transfers leave transferPenaltySeconds as null', ctm.transfers.every(t => t.transferPenaltySeconds === null));
assert('All interchange transfers declare requiresEmpiricalObservation = true', ctm.transfers.every(t => t.requiresEmpiricalObservation === true));

// 7. Schedule Isolation Check
console.log('\n7. SCHEDULE ISOLATION REGRESSION:');
assert('GTFS Boundary flags schedule generation as BLOCKED', ctm.gtfsBoundaryContract.gtfsStatus.includes('BLOCKED_FOR_FULL_TIMETABLE'));
assert('CTM does not contain synthesized trip_id or stop_times arrays', ctm.trips === undefined && ctm.stop_times === undefined);

console.log('\n────────────────────────────────────────────────────────────');
console.log(`GOLDEN REGRESSION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('────────────────────────────────────────────────────────────');

if (passedTests !== totalTests) {
  console.error('❌ One or more golden regression tests failed!');
  process.exit(1);
}

console.log('🎉 Golden Test Suite Passed — Line 3 CTM is verified as the gold reference corridor!\n');
