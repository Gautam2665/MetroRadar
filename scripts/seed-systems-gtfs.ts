import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Systems & Ingesting Static GTFS Feeds ---');

  // 1. Upsert Delhi Metro System
  const delhi = await prisma.system.upsert({
    where: { code: 'DMRC' },
    update: { status: 'ACTIVE' },
    create: {
      code: 'DMRC',
      name: 'Delhi Metro',
      city: 'Delhi',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
  });
  console.log(`[DMRC] System registered: ${delhi.id}`);

  // 2. Upsert Kochi Metro System
  const kochi = await prisma.system.upsert({
    where: { code: 'KMRL' },
    update: { status: 'ACTIVE' },
    create: {
      code: 'KMRL',
      name: 'Kochi Metro',
      city: 'Kochi',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
  });
  console.log(`[KMRL] System registered: ${kochi.id}`);

  // 3. Post Delhi GTFS Zip to Ingestion API
  const delhiZipPath = path.join(process.cwd(), 'datasets', 'delhi', 'raw', 'gtfs-static.zip');
  if (fs.existsSync(delhiZipPath)) {
    console.log(`[DMRC] Uploading ${delhiZipPath} to Ingestion API...`);
    const fileBuffer = fs.readFileSync(delhiZipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', blob, 'gtfs-static.zip');

    const res = await fetch(`http://127.0.0.1:3001/ingestion/gtfs?systemId=${delhi.id}`, {
      method: 'POST',
      body: formData,
    });
    const report = await res.json();
    console.log('[DMRC] Ingestion Report:', JSON.stringify(report, null, 2));
  } else {
    console.warn(`[DMRC] ZIP not found at ${delhiZipPath}`);
  }

  // 4. Post Kochi GTFS Zip to Ingestion API
  const kochiZipPath = path.join(process.cwd(), 'datasets', 'kochi', 'raw', 'gtfs-static.zip');
  if (fs.existsSync(kochiZipPath)) {
    console.log(`[KMRL] Uploading ${kochiZipPath} to Ingestion API...`);
    const fileBuffer = fs.readFileSync(kochiZipPath);
    const blob = new Blob([fileBuffer], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', blob, 'gtfs-static.zip');

    const res = await fetch(`http://127.0.0.1:3001/ingestion/gtfs?systemId=${kochi.id}`, {
      method: 'POST',
      body: formData,
    });
    const report = await res.json();
    console.log('[KMRL] Ingestion Report:', JSON.stringify(report, null, 2));
  } else {
    console.warn(`[KMRL] ZIP not found at ${kochiZipPath}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
