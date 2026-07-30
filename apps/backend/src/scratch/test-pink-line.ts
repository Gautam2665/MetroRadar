import { GraphBuilderService } from '../modules/journey/graph/graph-builder.service';
import { DatabaseService } from '../database/database.service';

const db = new DatabaseService();

async function main() {
  await db.$connect();
  const builder = new GraphBuilderService(db);

  const system = await db.system.findFirst({
    where: { code: 'DMRC' },
  });
  if (!system) return;

  const graph = await builder.build(system.id);

  const sarai = 'd479e4ca-0a8e-4eb0-8324-46b24ae5279f'; // Sarai Kale Khan
  const southCampus = 'dffbe5ee-6503-4c85-a645-0043514a962e'; // South Campus
  const dhaula = 'd279864f-755c-43c8-8fbf-53e90f257a50'; // Dhaula Kuan

  console.log('\nOutgoing edges from Sarai Kale Khan - Nizamuddin:');
  for (const edge of graph.edges.get(sarai) || []) {
    const toNode = graph.nodes.get(edge.to);
    console.log(
      `  -> ${toNode?.name} (${edge.to}) | type: ${edge.type} | duration: ${edge.duration}s`,
    );
  }

  console.log('\nOutgoing edges from Durgabai Deshmukh South Campus:');
  for (const edge of graph.edges.get(southCampus) || []) {
    const toNode = graph.nodes.get(edge.to);
    console.log(
      `  -> ${toNode?.name} (${edge.to}) | type: ${edge.type} | duration: ${edge.duration}s`,
    );
  }

  console.log('\nOutgoing edges from Dhaula Kuan:');
  for (const edge of graph.edges.get(dhaula) || []) {
    const toNode = graph.nodes.get(edge.to);
    console.log(
      `  -> ${toNode?.name} (${edge.to}) | type: ${edge.type} | duration: ${edge.duration}s`,
    );
  }
}

main().finally(() => db.$disconnect());
