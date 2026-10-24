require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DatabaseService } = require(path.resolve('apps/backend/dist/database/database.service'));
const { IsochroneService } = require(path.resolve('apps/backend/dist/modules/analytics/services/isochrone.service'));

async function testPolygonGeneration() {
  console.log('=== TESTING ISOCHRONE POLYGON GENERATION WITH PARTIAL EDGE SLICING ===');
  const db = new DatabaseService();
  const isoService = new IsochroneService(db);

  // Let's inspect D.N. Nagar edges within 300s
  const catchment = await isoService.getStationCatchment('D. N. Nagar', [5, 10]);
  const iso5 = catchment.isochrones.find(i => i.minutes === 5);
  const iso10 = catchment.isochrones.find(i => i.minutes === 10);

  console.log('Current (Full Edge Buffering at 45m):');
  console.log(`5-min:  Edges: ${iso5.reachedEdgesCount} | Length: ${iso5.walkableNetworkLengthKm} km | Area: ${iso5.networkAreaSqKm} km²`);
  console.log(`10-min: Edges: ${iso10.reachedEdgesCount} | Length: ${iso10.walkableNetworkLengthKm} km | Area: ${iso10.networkAreaSqKm} km²`);

  await db.$disconnect();
}

testPolygonGeneration().catch(console.error);
