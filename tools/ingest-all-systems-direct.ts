import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/backend/src/app.module';
import { IngestionService } from '../apps/backend/src/modules/ingestion/services/ingestion.service';
import { DatabaseService } from '../apps/backend/src/database/database.service';
import { SystemStatus, SourceType, TrustTier } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const ALL_SYSTEMS = [
  {
    code: 'DMRC',
    name: 'Delhi Metro',
    city: 'Delhi',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://delhimetrorail.com',
    sourceType: SourceType.OFFICIAL,
    trustTier: TrustTier.TIER_A,
    qualityScore: 98.0,
    badgeTier: 'Gold',
    cityFolder: 'delhi',
  },
  {
    code: 'KMRL',
    name: 'Kochi Metro',
    city: 'Kochi',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://kochimetro.org',
    sourceType: SourceType.OFFICIAL,
    trustTier: TrustTier.TIER_A,
    qualityScore: 95.0,
    badgeTier: 'Gold',
    cityFolder: 'kochi',
  },
  {
    code: 'HMRL',
    name: 'Hyderabad Metro Rail',
    city: 'Hyderabad',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://hmrl.co.in',
    sourceType: SourceType.OFFICIAL,
    trustTier: TrustTier.TIER_A,
    qualityScore: 90.0,
    badgeTier: 'Gold',
    cityFolder: 'hyderabad',
  },
  {
    code: 'BMRCL',
    name: 'Namma Metro',
    city: 'Bengaluru',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://bmrcl.co.in',
    sourceType: SourceType.COMMUNITY,
    trustTier: TrustTier.TIER_B,
    qualityScore: 88.0,
    badgeTier: 'Silver',
    cityFolder: 'bengaluru',
  },
  {
    code: 'CMRL',
    name: 'Chennai Metro',
    city: 'Chennai',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://chennaimetrorail.org',
    sourceType: SourceType.COMMUNITY,
    trustTier: TrustTier.TIER_B,
    qualityScore: 86.0,
    badgeTier: 'Silver',
    cityFolder: 'chennai',
  },
  {
    code: 'GMRC',
    name: 'Gujarat Metro (MEGA)',
    city: 'Ahmedabad',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://gujaratmetrorail.com',
    sourceType: SourceType.COMMUNITY,
    trustTier: TrustTier.TIER_B,
    qualityScore: 84.0,
    badgeTier: 'Silver',
    cityFolder: 'ahmedabad',
  },
];

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 Ingesting All 6 Certified Metro Datasets (Direct Context)`);
  console.log(`======================================================\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const ingestionService = app.get(IngestionService);
  const db = app.get(DatabaseService);

  for (const sys of ALL_SYSTEMS) {
    console.log(`------------------------------------------------------`);
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
      console.log(`   ⚠️ ZIP file not found at ${zipPath}`);
      continue;
    }

    console.log(`   📦 Ingesting GTFS for ${sys.code}...`);
    const fileBuffer = fs.readFileSync(zipPath);
    const filename = `${sys.cityFolder}-gtfs-static.zip`;

    const report = await ingestionService.ingestGtfs(
      system.id,
      fileBuffer,
      filename,
      false,
    );

    console.log(`   ✅ Status: ${report.status}`);
    const stCount = report.counts?.Station?.processed ?? 0;
    const lineCount = report.counts?.Line?.processed ?? 0;
    const tripCount = report.counts?.Trip?.processed ?? 0;
    console.log(`   Processed: ${stCount} stations, ${lineCount} lines, ${tripCount} trips`);
  }

  await app.close();
  console.log(`\n======================================================`);
  console.log(` ✅ All Metro Networks Ingested into Database!`);
  console.log(`======================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Direct Ingestion failed:', err);
  process.exit(1);
});
