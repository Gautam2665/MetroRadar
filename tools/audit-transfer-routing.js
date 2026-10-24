const path = require('path');
require('dotenv').config();
const { DatabaseService } = require(path.resolve('apps/backend/dist/database/database.service'));
const { PedestrianRoutingService } = require(path.resolve('apps/backend/dist/modules/analytics/services/pedestrian-routing.service'));

async function testTargetedRoute() {
  const db = new DatabaseService();
  const router = new PedestrianRoutingService(db);

  const DN_NAGAR_GATE_1 = '356a0950-2469-488b-bf25-1af60ff7a854';
  const ANDHERI_WEST_GATE_1 = '90e8b743-611a-43bc-be89-9927a23ef2a8';

  console.log('================================================================');
  console.log('TARGETED ROUTE AUDIT: D.N. Nagar Gate 1 -> Andheri West Gate 1');
  console.log('================================================================');

  const forwardRoute = await router.route(DN_NAGAR_GATE_1, ANDHERI_WEST_GATE_1, { allowProvisional: true });
  console.log('Status:', forwardRoute.status);
  console.log('Total Distance:', forwardRoute.distanceMeters, 'meters');
  console.log('Walk Duration:', forwardRoute.walkDurationSeconds, 'seconds');
  console.log('Total Duration:', forwardRoute.totalDurationSeconds, 'seconds');
  console.log('Number of Steps:', forwardRoute.steps.length);

  console.log('\n--- Step-by-Step Edge Sequence ---');
  forwardRoute.steps.forEach((s, idx) => {
    console.log(`Step ${s.stepIndex}: ${s.instruction}`);
    console.log(`  Distance: ${s.distanceMeters}m | Duration: ${s.durationSeconds}s`);
    console.log(`  Highway: ${s.highwayType} | Level: ${s.level} | FOB: ${s.isElevatedFob}`);
    console.log(`  Source: ${s.sourceType}`);
    console.log(`  From Coords: [${s.startCoordinate}] -> To Coords: [${s.endCoordinate}]`);
  });

  console.log('\n--- Complete Geometry Coordinate Array ---');
  console.log(JSON.stringify(forwardRoute.geometry.coordinates));

  console.log('\n--- Provenance Metadata ---');
  console.log('Source Types:', forwardRoute.provenance.sourceTypes);
  console.log('Confidence Score:', forwardRoute.provenance.confidenceScore);
  console.log('Contains Provisional Segments:', forwardRoute.provenance.containsProvisionalSegments);
  console.log('Has Official OSM Segments:', forwardRoute.provenance.hasOfficialOsmSegments);
  console.log('Notes:', forwardRoute.provenance.notes);

  console.log('\n================================================================');
  console.log('TARGETED ROUTE AUDIT: REVERSE DIRECTION (Andheri West -> DN Nagar)');
  console.log('================================================================');
  const reverseRoute = await router.route(ANDHERI_WEST_GATE_1, DN_NAGAR_GATE_1, { allowProvisional: true });
  console.log('Status:', reverseRoute.status);
  console.log('Total Distance:', reverseRoute.distanceMeters, 'meters');
  console.log('Walk Duration:', reverseRoute.walkDurationSeconds, 'seconds');
  console.log('Number of Steps:', reverseRoute.steps.length);
  reverseRoute.steps.forEach((s, idx) => {
    console.log(`Step ${s.stepIndex}: ${s.instruction} (${s.distanceMeters}m, ${s.sourceType})`);
  });

  console.log('\n================================================================');
  console.log('TARGETED ROUTE AUDIT: WITHOUT PROVISIONAL ALLOWANCE');
  console.log('================================================================');
  const strictRoute = await router.route(DN_NAGAR_GATE_1, ANDHERI_WEST_GATE_1, { allowProvisional: false });
  console.log('Status without provisional:', strictRoute.status);
  console.log('Notes:', strictRoute.provenance.notes);

  await db.$disconnect();
}

testTargetedRoute().catch(console.error);
