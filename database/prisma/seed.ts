import { PrismaClient, SystemStatus, LineStatus, TractionType, SignallingType, LevelType, PlatformStatus, SourceType, TrustTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MetroRadar database (Idempotent CTM v1.0 Seed)...');

  // 1. Upsert System
  const system = await prisma.system.upsert({
    where: { code: 'MM' },
    update: {
      name: 'Mumbai Metro',
      city: 'Mumbai',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: SystemStatus.ACTIVE,
      sourceType: SourceType.SYNTHESIZED,
      trustTier: TrustTier.TIER_X,
      qualityScore: 80.0,
      badgeTier: 'Silver',
    },
    create: {
      code: 'MM',
      name: 'Mumbai Metro',
      city: 'Mumbai',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: SystemStatus.ACTIVE,
      sourceType: SourceType.SYNTHESIZED,
      trustTier: TrustTier.TIER_X,
      qualityScore: 80.0,
      badgeTier: 'Silver',
    },
  });

  // 2. Upsert Agency
  const agency = await prisma.agency.upsert({
    where: { code: 'MMMOCL' },
    update: {
      name: 'Maha Mumbai Metro Operation Corporation Limited',
      website: 'https://www.mmmocl.co.in',
    },
    create: {
      code: 'MMMOCL',
      name: 'Maha Mumbai Metro Operation Corporation Limited',
      website: 'https://www.mmmocl.co.in',
    },
  });

  // 3. Upsert AssetOwner
  const assetOwner = await prisma.assetOwner.upsert({
    where: { code: 'MMRDA' },
    update: {
      name: 'Mumbai Metropolitan Region Development Authority',
      website: 'https://mmrda.maharashtra.gov.in',
    },
    create: {
      code: 'MMRDA',
      name: 'Mumbai Metropolitan Region Development Authority',
      website: 'https://mmrda.maharashtra.gov.in',
    },
  });

  // 4. Upsert Line
  const line = await prisma.line.upsert({
    where: { code: 'LINE_2A' },
    update: {
      systemId: system.id,
      agencyId: agency.id,
      assetOwnerId: assetOwner.id,
      name: 'Line 2A (Yellow Line)',
      color: '#FFD700',
      status: LineStatus.ACTIVE,
      traction: TractionType.OVERHEAD_CATENARY,
      signalling: SignallingType.CBTC,
      gauge: '1435mm',
      length: 18.6,
    },
    create: {
      systemId: system.id,
      agencyId: agency.id,
      assetOwnerId: assetOwner.id,
      code: 'LINE_2A',
      name: 'Line 2A (Yellow Line)',
      color: '#FFD700',
      status: LineStatus.ACTIVE,
      traction: TractionType.OVERHEAD_CATENARY,
      signalling: SignallingType.CBTC,
      gauge: '1435mm',
      length: 18.6,
    },
  });

  // 5. Upsert Stations
  const stationDefs = [
    { code: 'DAHISAR_EAST', name: 'Dahisar East', lat: 19.2682, lon: 72.8631 },
    { code: 'KANDARPADA', name: 'Kandarpada', lat: 19.2558, lon: 72.8532 },
    { code: 'BORIVALI_WEST', name: 'Borivali West', lat: 19.2312, lon: 72.8465 },
  ];

  for (const s of stationDefs) {
    await prisma.station.upsert({
      where: { code: s.code },
      update: {
        systemId: system.id,
        name: s.name,
        latitude: s.lat,
        longitude: s.lon,
        timezone: 'Asia/Kolkata',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        wheelchairAccessible: true,
      },
      create: {
        systemId: system.id,
        code: s.code,
        name: s.name,
        latitude: s.lat,
        longitude: s.lon,
        timezone: 'Asia/Kolkata',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        wheelchairAccessible: true,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
