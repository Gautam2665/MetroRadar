const path = require('path');
require('dotenv').config();
const { DatabaseService } = require(path.resolve('apps/backend/dist/database/database.service'));
const { PedestrianRoutingService } = require(path.resolve('apps/backend/dist/modules/analytics/services/pedestrian-routing.service'));

async function test() {
  const db = new DatabaseService();
  const router = new PedestrianRoutingService(db);
  const DN_NAGAR_GATE_1 = '356a0950-2469-488b-bf25-1af60ff7a854';
  const ANDHERI_WEST_GATE_1 = '90e8b743-611a-43bc-be89-9927a23ef2a8';
  const route = await router.route(DN_NAGAR_GATE_1, ANDHERI_WEST_GATE_1, { allowProvisional: true });
  console.log('Route keys:', Object.keys(route));
  console.log('Full Route:', JSON.stringify(route, null, 2));
  await db.$disconnect();
}
test().catch(console.error);
