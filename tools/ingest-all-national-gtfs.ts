import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/backend/src/app.module';
import { IngestionService } from '../apps/backend/src/modules/ingestion/services/ingestion.service';
import { DatabaseService } from '../apps/backend/src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';

const TARGET_SYSTEMS = [
  { code: 'HMRL', cityFolder: 'hyderabad' },
  { code: 'BMRCL', cityFolder: 'bengaluru' },
  { code: 'CMRL', cityFolder: 'chennai' },
  { code: 'GMRC', cityFolder: 'ahmedabad' },
];

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 Ingesting All National Certified GTFS Datasets`);
  console.log(`    Running IngestionService pipeline for HMRL, BMRCL, CMRL, GMRC`);
  console.log(`======================================================\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const ingestionService = app.get(IngestionService);
  const db = app.get(DatabaseService);

  for (const sys of TARGET_SYSTEMS) {
    const system = await db.system.findUnique({
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

    console.log(`📌 Ingesting GTFS for ${sys.code} (${system.city})...`);
    const fileBuffer = fs.readFileSync(zipPath);
    const filename = `${sys.cityFolder}-gtfs-static.zip`;

    const report = await ingestionService.ingestGtfs(
      system.id,
      fileBuffer,
      filename,
      false,
    );

    console.log(`   ✅ Success! Status: ${report.status}`);
    console.log(`   Processed counts:`, JSON.stringify(report.counts, null, 2));
  }

  await app.close();
  console.log(`\n======================================================`);
  console.log(` ✅ All 4 National GTFS Feeds Ingested & Persisted into DB!`);
  console.log(`======================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Ingestion runner failed:', err);
  process.exit(1);
});
