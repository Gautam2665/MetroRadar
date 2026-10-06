const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function materializeLine2aLine7Platforms() {
  console.log('🚀 Materializing Mumbai Line 2A & Line 7 Platforms & Levels (Sprint v0.6.5-P)...');

  const line2a = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE2A' } });
  const line7 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE7' } });

  if (!line2a || !line7) {
    throw new Error('MUMBAI_LINE2A or MUMBAI_LINE7 line not found in database.');
  }

  // Fetch all Mumbai stations
  const stations = await prisma.station.findMany({
    where: { system: { code: 'MM' } },
  });
  const stnMap = new Map(stations.map((s) => [s.code, s]));

  const l2aStationCodes = Array.from({ length: 17 }, (_, i) => `STN_L2A_${String(i + 1).padStart(3, '0')}`);
  const l7StationCodes = Array.from({ length: 14 }, (_, i) => `STN_L7_${String(i + 1).padStart(3, '0')}`);
  console.log('  Updating line-owned P1 records in place; unknown current platform details remain unset.');

  let platformCount = 0;
  let levelCount = 0;

  // 1. Materialize Line 2A Stations (17 stations)
  for (let i = 1; i <= 17; i++) {
    const code = `STN_L2A_${String(i).padStart(3, '0')}`;
    const station = stnMap.get(code);
    if (!station) continue;

    const atDahisarTerminal = i === 1;
    const atAndheriWest = i === 17;
    const levelEvidenceStatus = atDahisarTerminal
      ? 'UNVERIFIED'
      : atAndheriWest ? 'OPERATOR_CONFIRMED_AS_BUILT' : 'PROPOSED_DPR';
    const line2aLevelSource = atAndheriWest
      ? 'SRC-MMRDA-L2A-DN-NAGAR-LINK'
      : 'SRC-MMRDA-L2A-DPR';

    // Concourse inventory is the usual DPR proposal; Dahisar's actual layout
    // is explicitly excepted/conflicted and stays marked unresolved.
    await upsertLevel(station.id, line2a.id, 'Concourse Level', 1, 'CONCOURSE',
      'DPR-proposed lower concourse level; current as-built verification is separate.', levelEvidenceStatus, line2aLevelSource);
    levelCount++;

    const platformLevel = await upsertLevel(station.id, line2a.id, 'Platform Level', 2, 'PLATFORM',
      'DPR-proposed elevated platform level; current as-built verification is separate.', levelEvidenceStatus, line2aLevelSource);
    levelCount++;

    // Property Development Level for Andheri West
    if (i === 17) {
      await upsertLevel(station.id, line2a.id, 'Property Development Level', 0, 'OTHER',
        'Property development level at Andheri West; MMRDA confirms the three-level station connection.',
        'OPERATOR_CONFIRMED_AS_BUILT', 'SRC-MMRDA-L2A-DN-NAGAR-LINK');
      levelCount++;
    }

    platformCount += await syncProposedPlatforms(station.id, line2a.id, platformLevel, line2aLevelSource);
  }

  // 2. Materialize Line 7 Stations (14 stations)
  for (let i = 1; i <= 14; i++) {
    const code = `STN_L7_${String(i).padStart(3, '0')}`;
    const station = stnMap.get(code);
    if (!station) continue;

    const atDahisarTerminal = i === 1;
    const line7LevelSource = 'SRC-MMRDA-L7-DPR';
    const levelEvidenceStatus = atDahisarTerminal ? 'UNVERIFIED' : 'PROPOSED_DPR';

    // The DPR excludes the Dahisar terminal from the typical two-level
    // station layout; preserve the source uncertainty rather than labeling it
    // as an ordinary concourse/platform pair.
    await upsertLevel(station.id, line7.id, 'Concourse Level', 1, 'CONCOURSE',
      'DPR-proposed lower concourse level; current as-built verification is separate.', levelEvidenceStatus, line7LevelSource);
    levelCount++;

    const platformLevel = await upsertLevel(station.id, line7.id, 'Platform Level', 2, 'PLATFORM',
      'DPR-proposed elevated platform level; current as-built verification is separate.', levelEvidenceStatus, line7LevelSource);
    levelCount++;

    // The two platforms are proposed DPR infrastructure. Keep current
    // numbering, direction, gates, and accessibility unknown.
    platformCount += await syncProposedPlatforms(station.id, line7.id, platformLevel, line7LevelSource);
  }

  console.log(`✅ Materialized ${levelCount} levels and ${platformCount} platforms successfully for Lines 2A & 7.`);
}

async function upsertLevel(stationId, lineId, name, levelNumber, type, description, evidenceStatus, sourceId) {
  const current = await prisma.level.findFirst({ where: { stationId, lineId, name } });
  const data = { levelNumber, type, description, evidenceStatus, sourceId, isActive: true, deletedAt: null };
  if (current) return prisma.level.update({ where: { id: current.id }, data });
  return prisma.level.create({ data: { stationId, lineId, name, ...data } });
}

async function syncProposedPlatforms(stationId, lineId, level, sourceId) {
  const current = await prisma.platform.findMany({
    where: { lineId, level: { stationId } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const data = {
    levelId: level.id,
    platformNumber: 'UNKNOWN',
    towardsStationId: null,
    screenDoors: null,
    wheelchairBoarding: null,
    status: 'ACTIVE',
    isActive: true,
    deletedAt: null,
    evidenceStatus: 'PROPOSED_DPR',
    sourceId,
  };
  for (let index = 0; index < 2; index++) {
    if (current[index]) await prisma.platform.update({ where: { id: current[index].id }, data });
    else await prisma.platform.create({ data: { ...data, lineId } });
  }
  for (const extra of current.slice(2)) {
    await prisma.platform.update({ where: { id: extra.id }, data: { isActive: false, deletedAt: new Date() } });
  }
  return Math.min(current.length, 2) + Math.max(0, 2 - current.length);
}

materializeLine2aLine7Platforms()
  .catch((err) => {
    console.error('❌ Error materializing Line 2A & 7 platforms:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
