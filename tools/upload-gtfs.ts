import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_SYSTEMS = [
  { code: 'HMRL', cityFolder: 'hyderabad' },
  { code: 'BMRCL', cityFolder: 'bengaluru' },
  { code: 'CMRL', cityFolder: 'chennai' },
  { code: 'GMRC', cityFolder: 'ahmedabad' },
];

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 Uploading GTFS Datasets to Ingestion Controller`);
  console.log(`    Endpoint: http://localhost:3001/ingestion/gtfs`);
  console.log(`======================================================\n`);

  for (const sys of TARGET_SYSTEMS) {
    const system = await prisma.system.findUnique({
      where: { code: sys.code },
    });

    if (!system) {
      console.log(`⚠️ System ${sys.code} not found in database.`);
      continue;
    }

    const zipPath = path.join(process.cwd(), 'datasets', sys.cityFolder, 'raw', 'gtfs-static.zip');
    if (!fs.existsSync(zipPath)) {
      console.log(`⚠️ ZIP file not found at ${zipPath}`);
      continue;
    }

    console.log(`📌 Posting GTFS for ${sys.code} (${system.city}, ID: ${system.id})...`);
    const fileBuffer = fs.readFileSync(zipPath);

    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', blob, `${sys.cityFolder}-gtfs-static.zip`);

    try {
      const res = await fetch(`http://localhost:3001/ingestion/gtfs?systemId=${system.id}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log(`   ✅ Ingestion Result:`, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`   ❌ Upload failed for ${sys.code}:`, err);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
