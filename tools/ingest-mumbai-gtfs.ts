import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/backend/src/app.module';
import { IngestionService } from '../apps/backend/src/modules/ingestion/services/ingestion.service';
import { DatabaseService } from '../apps/backend/src/database/database.service';
import { SystemStatus, SourceType, TrustTier } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 Ingesting Mumbai Operational GTFS into PostgreSQL`);
  console.log(`======================================================\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const ingestionService = app.get(IngestionService);
  const db = app.get(DatabaseService);

  const sys = {
    code: 'MM',
    name: 'Mumbai Metro',
    city: 'Mumbai',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://mmrda.maharashtra.gov.in',
    sourceType: SourceType.OFFICIAL,
    trustTier: TrustTier.TIER_A,
    qualityScore: 99.0,
    badgeTier: 'Gold',
    cityFolder: 'mumbai',
  };

  console.log(`📌 Upserting System: ${sys.code} (${sys.city})`);

  const system = await db.system.upsert({
    where: { code: sys.code },
    update: {
      name: sys.name,
      city: sys.city,
      country: sys.country,
      timezone: sys.timezone,
      website: sys.website,
      status: SystemStatus.ACTIVE,
      sourceType: sys.sourceType,
      trustTier: sys.trustTier,
      qualityScore: sys.qualityScore,
      badgeTier: sys.badgeTier,
    },
    create: {
      code: sys.code,
      name: sys.name,
      city: sys.city,
      country: sys.country,
      timezone: sys.timezone,
      website: sys.website,
      status: SystemStatus.ACTIVE,
      sourceType: sys.sourceType,
      trustTier: sys.trustTier,
      qualityScore: sys.qualityScore,
      badgeTier: sys.badgeTier,
    },
  });

  const zipPath = path.join(process.cwd(), 'datasets', sys.cityFolder, 'raw', 'gtfs-static.zip');
  if (!fs.existsSync(zipPath)) {
    console.log(`   ❌ ZIP file not found at ${zipPath}`);
    process.exit(1);
  }

  console.log(`   📦 Ingesting GTFS for ${sys.code} from ${zipPath}...`);
  const fileBuffer = fs.readFileSync(zipPath);
  const filename = `${sys.cityFolder}-gtfs-static.zip`;

  const report = await ingestionService.ingestGtfs(
    system.id,
    fileBuffer,
    filename,
    false,
  );

  console.log(`\n======================================================`);
  console.log(`   ✅ Ingestion Status: ${report.status}`);
  console.log(`======================================================`);
  console.log('Counts:', JSON.stringify(report.counts, null, 2));
  if (report.errors && report.errors.length > 0) {
    console.log(`Errors (${report.errors.length}):`, report.errors.slice(0, 10));
  }

  // Save report to datasets/mumbai/processed/validation-report.json
  const processedDir = path.join(process.cwd(), 'datasets', 'mumbai', 'processed');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(processedDir, 'validation-report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log(`📄 Saved validation report to datasets/mumbai/processed/validation-report.json`);

  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Mumbai Ingestion failed:', err);
  process.exit(1);
});
