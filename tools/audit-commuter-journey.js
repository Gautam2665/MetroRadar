const path = require('path');
require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require(path.resolve('apps/backend/dist/app.module'));
const { JourneyService } = require(path.resolve('apps/backend/dist/modules/journey/routing/journey.service'));
const { DatabaseService } = require(path.resolve('apps/backend/dist/database/database.service'));

async function testCommuterJourney() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const journeyService = app.get(JourneyService);
  const db = app.get(DatabaseService);

  const versova = await db.station.findFirst({ where: { name: { contains: 'Versova', mode: 'insensitive' } } });
  const oshiwara = await db.station.findFirst({ where: { name: { contains: 'Lower Oshiwara', mode: 'insensitive' } } });

  const query = {
    from: versova.id,
    to: oshiwara.id,
    departureTime: new Date().toISOString(),
  };

  const response = await journeyService.planJourney(query);
  const candidate = response.candidates?.[0];
  console.log('--- CANDIDATE DETAILS ---');
  console.log('Summary:', candidate.humanSummary);
  console.log('Total Duration:', candidate.duration);
  console.log('Transfers count:', candidate.transfers);

  console.log('\n--- ALL LEGS ---');
  candidate.legs.forEach((leg, idx) => {
    console.log(`\nLeg ${idx + 1}: [${leg.type}] ${leg.fromStationName} -> ${leg.toStationName}`);
    console.log(`  Duration: ${leg.duration}s (${Math.round(leg.duration / 60)} mins) | Distance: ${leg.distanceMeters}m`);
    console.log(`  Line: ${leg.lineName || leg.lineId || 'WALK'}`);
    console.log(`  Is Transfer Leg: ${leg.isTransfer || false}`);
    console.log(`  Pedestrian Enriched: ${leg.pedestrianEnriched}`);
    console.log(`  Pedestrian Provenance:`, leg.pedestrianProvenance);
    console.log(`  Pedestrian Steps:`, leg.pedestrianSteps);
    console.log(`  Geometry:`, leg.geometry);
  });

  await app.close();
}

testCommuterJourney().catch(console.error);
