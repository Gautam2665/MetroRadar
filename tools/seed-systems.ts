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
  },
  {
    code: 'MM',
    name: 'Mumbai Metro',
    city: 'Mumbai',
    country: 'India',
    timezone: 'Asia/Kolkata',
    website: 'https://www.mmmocl.co.in',
    sourceType: SourceType.SYNTHESIZED,
    trustTier: TrustTier.TIER_X,
    qualityScore: 80.0,
    badgeTier: 'Silver',
  },
];

async function main() {
  console.log(`\n======================================================`);
  console.log(` 🚇 Seeding System Records in PostgreSQL`);
  console.log(`======================================================\n`);

  for (const sys of ALL_SYSTEMS) {
    const s = await prisma.system.upsert({
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
    console.log(`✅ System: ${s.code} (${s.city}) ➔ ID: ${s.id}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
