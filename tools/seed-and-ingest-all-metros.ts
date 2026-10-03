import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, SystemStatus, SourceType, TrustTier } from '@prisma/client';

const prisma = new PrismaClient();

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
    zipPath: path.join(process.cwd(), 'datasets', 'delhi', 'raw', 'gtfs-static.zip'),
    filename: 'delhi-gtfs-static.zip',
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
    zipPath: path.join(process.cwd(), 'datasets', 'kochi', 'raw', 'gtfs-static.zip'),
    filename: 'kochi-gtfs-static.zip',
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
    zipPath: path.join(process.cwd(), 'datasets', 'hyderabad', 'raw', 'gtfs-static.zip'),
    filename: 'hyderabad-gtfs-static.zip',
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
    zipPath: path.join(process.cwd(), 'datasets', 'bengaluru', 'raw', 'gtfs-static.zip'),
    filename: 'bengaluru-gtfs-static.zip',
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
    zipPath: path.join(process.cwd(), 'datasets', 'chennai', 'raw', 'gtfs-static.zip'),
    filename: 'chennai-gtfs-static.zip',
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
    zipPath: path.join(process.cwd(), 'datasets', 'ahmedabad', 'raw', 'gtfs-static.zip'),
    filename: 'ahmedabad-gtfs-static.zip',
  },
];

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 TransitOS Master Ingestion Pipeline`);
  console.log(`    Seeding & Ingesting All Certified Indian Metro Networks`);
  console.log(`======================================================\n`);

  for (const sys of ALL_SYSTEMS) {
    console.log(`------------------------------------------------------`);
    console.log(`📌 Upserting System: ${sys.code} (${sys.city})`);

    const system = await prisma.system.upsert({
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

    console.log(`   ✅ PostgreSQL System ID: ${system.id}`);

    if (fs.existsSync(sys.zipPath)) {
      console.log(`   📦 Ingesting GTFS ZIP: ${sys.zipPath}`);
      const fileBuffer = fs.readFileSync(sys.zipPath);
      const blob = new Blob([fileBuffer], { type: 'application/zip' });
      const formData = new FormData();
      formData.append('file', blob, sys.filename);

      try {
        const res = await fetch(`http://127.0.0.1:3001/ingestion/gtfs?systemId=${system.id}`, {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as { status: string; counts?: Record<string, { processed: number }> };
        console.log(`   ✅ Ingestion Status: ${data.status}`);
        if (data.counts) {
          console.log(`   Stations: ${data.counts.Station?.processed ?? 0}, Lines: ${data.counts.Line?.processed ?? 0}, Trips: ${data.counts.Trip?.processed ?? 0}`);
        }
      } catch (err) {
        console.error(`   ❌ Ingestion HTTP call failed for ${sys.code}:`, err);
      }
    } else {
      console.log(`   ⚠️ GTFS ZIP file not found at ${sys.zipPath}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(` ✅ Master Ingestion Complete!`);
  console.log(`======================================================\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Master ingestion script failed:', err);
  process.exit(1);
});
