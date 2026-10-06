const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const line1 = await prisma.line.findUnique({ where: { code: 'MUMBAI_LINE1' } });
  if (!line1) throw new Error('MUMBAI_LINE1 is missing; Line 1 levels cannot be assigned safely.');
  const stations = await prisma.station.findMany({
    where: { code: { startsWith: 'STN_L1_' }, system: { code: 'MM' } },
    select: { id: true, code: true, name: true },
  });
  const byCode = new Map(stations.map((station) => [station.code, station]));
  const line1Codes = Array.from({ length: 12 }, (_, index) => `STN_L1_${String(index + 1).padStart(3, '0')}`);
  for (const code of line1Codes) {
    if (!byCode.has(code)) throw new Error(`Required Line 1 station is missing: ${code}`);
  }

  await prisma.$transaction(async (tx) => {
    for (const code of line1Codes) {
      const station = byCode.get(code);
      // Category B Line 1 DPR evidence E-L1-B-0001 establishes the distinct
      // ground/street, concourse, and platform levels for this corridor.
      await upsertLevelWith(tx, station.id, line1.id, 'Street / Entry Level', 0, 'STREET',
        'Line 1 DPR-proposed ground/street access level; current as-built confirmation not encoded');
      await upsertLevelWith(tx, station.id, line1.id, 'Mezzanine / Concourse Level', 1, 'MEZZANINE',
        'Line 1 DPR-proposed concourse level; current as-built confirmation not encoded');
      const platformLevelId = await upsertLevelWith(tx, station.id, line1.id, 'Platform Level (Elevated)', 2, 'PLATFORM',
        'Line 1 DPR-proposed elevated platform level; platform numbers and arrangement remain line-specific');

      // Category B records two side platforms per elevated station as DPR
      // design evidence. Keep the physical count line-owned and proposed;
      // do not invent operational numbering, direction, gates, or access data.
      const currentPlatforms = await tx.platform.findMany({
        where: { lineId: line1.id, level: { stationId: station.id } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      for (let index = 0; index < 2; index++) {
        const data = {
          levelId: platformLevelId,
          lineId: line1.id,
          platformNumber: 'UNKNOWN',
          towardsStationId: null,
          screenDoors: null,
          wheelchairBoarding: null,
          status: 'ACTIVE',
          isActive: true,
          deletedAt: null,
          evidenceStatus: 'PROPOSED_DPR',
          sourceId: 'SRC-MMRDA-L1-DPR',
        };
        const existing = currentPlatforms[index];
        if (existing) await tx.platform.update({ where: { id: existing.id }, data });
        else await tx.platform.create({ data });
      }
      for (const extra of currentPlatforms.slice(2)) {
        await tx.platform.update({
          where: { id: extra.id },
          data: { isActive: false, deletedAt: new Date() },
        });
      }
    }
  });

  console.log(`Updated line-owned P1 design records for all ${line1Codes.length} Line 1 stations; values remain marked PROPOSED_DPR.`);
}

async function upsertLevelWith(tx, stationId, lineId, name, levelNumber, type, description) {
  const candidates = await tx.level.findMany({
    where: { stationId, name, OR: [{ lineId }, { lineId: null }] },
    select: { id: true, lineId: true },
  });
  const current = candidates.find((level) => level.lineId === null)
    ?? candidates.find((level) => level.lineId === lineId);

  // Merge the earlier unowned level row into the line-owned identity so a
  // rerun does not duplicate the same physical/design level in the inspector.
  for (const duplicate of candidates) {
    if (!current || duplicate.id === current.id) continue;
    await tx.platform.updateMany({ where: { levelId: duplicate.id }, data: { levelId: current.id } });
    await tx.amenity.updateMany({ where: { levelId: duplicate.id }, data: { levelId: current.id } });
    await tx.commercialSpace.updateMany({ where: { levelId: duplicate.id }, data: { levelId: current.id } });
    await tx.walkingEdge.updateMany({ where: { fromLevelId: duplicate.id }, data: { fromLevelId: current.id } });
    await tx.walkingEdge.updateMany({ where: { toLevelId: duplicate.id }, data: { toLevelId: current.id } });
    await tx.level.delete({ where: { id: duplicate.id } });
  }

  if (current) {
    await tx.level.update({
      where: { id: current.id },
      data: { levelNumber, type, description, isActive: true, deletedAt: null, evidenceStatus: 'PROPOSED_DPR', sourceId: 'SRC-MMRDA-L1-DPR' },
    });
    return current.id;
  } else {
    const created = await tx.level.create({
      data: { stationId, lineId, name, levelNumber, type, description, isActive: true, evidenceStatus: 'PROPOSED_DPR', sourceId: 'SRC-MMRDA-L1-DPR' },
    });
    return created.id;
  }
}

main().catch((error) => {
  console.error('Failed to materialize Line 1 interchange levels:', error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
