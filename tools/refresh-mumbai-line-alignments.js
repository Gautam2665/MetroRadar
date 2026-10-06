const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve('.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const alignments = [
  { file: 'ctm-line2a.json', shapeId: 'SHAPE_MUMBAI_L2A', line: 'Line 2A' },
  { file: 'ctm-line7.json', shapeId: 'SHAPE_MUMBAI_L7', line: 'Line 7' },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
  const databaseHost = new URL(databaseUrl).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
    throw new Error('Alignment refresh is limited to a local database connection.');
  }

  const system = await prisma.system.findFirst({ where: { code: 'MM' } });
  if (!system) throw new Error('Mumbai Metro (MM) system record not found.');

  const replacements = [];
  for (const alignment of alignments) {
    const ctmPath = path.resolve('datasets/mumbai/normalized', alignment.file);
    const ctm = JSON.parse(fs.readFileSync(ctmPath, 'utf8'));
    const coordinates = ctm.alignmentGeometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error(`${alignment.line} CTM is missing its GIS alignment coordinates.`);
    }

    const existingCount = await prisma.shape.count({
      where: { systemId: system.id, shapeId: alignment.shapeId },
    });
    if (existingCount === 0) {
      throw new Error(`${alignment.line} has no existing database shape ${alignment.shapeId}; refusing to create a disconnected shape.`);
    }

    replacements.push({
      ...alignment,
      existingCount,
      data: coordinates.map(([longitude, latitude], index) => ({
        systemId: system.id,
        shapeId: alignment.shapeId,
        latitude,
        longitude,
        sequence: index + 1,
        isActive: true,
      })),
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const replacement of replacements) {
      await tx.shape.deleteMany({
        where: { systemId: system.id, shapeId: replacement.shapeId },
      });
      await tx.shape.createMany({ data: replacement.data });
    }
  });

  for (const replacement of replacements) {
    console.log(
      `${replacement.line}: replaced ${replacement.existingCount} straight-line points with ${replacement.data.length} ArcGIS alignment vertices.`,
    );
  }
}

main()
  .catch((error) => {
    console.error('Mumbai alignment refresh failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
