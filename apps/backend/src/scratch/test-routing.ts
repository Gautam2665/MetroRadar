import { GraphBuilderService } from '../modules/journey/graph/graph-builder.service';
import { RoutingService } from '../modules/journey/routing/routing.service';
import { DEFAULT_WEIGHTS } from '../modules/journey/graph/graph.types';
import { DatabaseService } from '../database/database.service';

const db = new DatabaseService();

async function main() {
  await db.$connect();
  const builder = new GraphBuilderService(db);
  const router = new RoutingService();

  const system = await db.system.findFirst({
    where: { code: 'DMRC' },
  });

  if (!system) {
    console.log('Delhi system not found');
    return;
  }

  console.log(`Building graph for ${system.name} (${system.id})...`);
  const graph = await builder.build(system.id);

  // Find Sarai Kale Khan & IGI Airport
  const sarai = await db.station.findFirst({
    where: { name: { contains: 'Sarai Kale Khan', mode: 'insensitive' } },
  });
  const igi = await db.station.findFirst({
    where: { name: { contains: 'IGI Airport', mode: 'insensitive' } },
  });

  if (!sarai || !igi) {
    console.log('Stations not found');
    return;
  }

  console.log(
    `\nRouting from ${sarai.name} (${sarai.id}) to ${igi.name} (${igi.id})...`,
  );
  const path = router.solve(graph, sarai.id, igi.id, DEFAULT_WEIGHTS);

  if (!path) {
    console.log('No path found!');
    return;
  }

  console.log(`\nPath found with ${path.length} edges:`);
  for (const edge of path) {
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);
    console.log(
      `  [${edge.type}] ${fromNode?.name} (${edge.from}) -> ${toNode?.name} (${edge.to}) | duration: ${edge.duration}s | line: ${edge.lineId || 'WALK'}`,
    );
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
