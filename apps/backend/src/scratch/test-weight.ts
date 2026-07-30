import { GraphBuilderService } from '../modules/journey/graph/graph-builder.service';
import { RoutingService } from '../modules/journey/routing/routing.service';
import { JourneyWeights } from '../modules/journey/graph/graph.types';
import { DatabaseService } from '../database/database.service';

const db = new DatabaseService();

async function testWeights(weightName: string, weights: JourneyWeights) {
  const builder = new GraphBuilderService(db);
  const router = new RoutingService();

  const system = await db.system.findFirst({
    where: { code: 'DMRC' },
  });
  if (!system) return;

  const graph = await builder.build(system.id);

  const sarai = await db.station.findFirst({
    where: { name: { contains: 'Sarai Kale Khan', mode: 'insensitive' } },
  });
  const igi = await db.station.findFirst({
    where: { name: { contains: 'IGI Airport', mode: 'insensitive' } },
  });

  if (!sarai || !igi) return;

  console.log(
    `\n=== Testing Weights [${weightName}] (walkingWeight: ${weights.walkingWeight}) ===`,
  );
  const path = router.solve(graph, sarai.id, igi.id, weights);

  if (!path) {
    console.log('No path found!');
    return;
  }

  console.log(`Path found with ${path.length} edges:`);
  for (const edge of path) {
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);
    console.log(
      `  [${edge.type}] ${fromNode?.name} -> ${toNode?.name} | duration: ${edge.duration}s | line: ${edge.lineId || 'WALK'}`,
    );
  }
}

async function main() {
  await db.$connect();

  await testWeights('Standard Default (walkingWeight: 1.5)', {
    travelTimeWeight: 1.0,
    transferPenalty: 180,
    walkingWeight: 1.5,
  });

  await testWeights('Equalized Walking (walkingWeight: 1.0)', {
    travelTimeWeight: 1.0,
    transferPenalty: 180,
    walkingWeight: 1.0,
  });

  await testWeights('Interchange Preferred Walking (walkingWeight: 0.8)', {
    travelTimeWeight: 1.0,
    transferPenalty: 180,
    walkingWeight: 0.8,
  });
}

main().finally(() => db.$disconnect());
