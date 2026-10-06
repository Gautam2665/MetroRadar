const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const lines = [
  ['MUMBAI_LINE1', 'SRC-MMRDA-L1-DPR'],
  ['MUMBAI_LINE2A', 'SRC-MMRDA-L2A-DPR'],
  ['MUMBAI_LINE7', 'SRC-MMRDA-L7-DPR'],
  ['MUMBAI_LINE9', 'SRC-MMRDA-L7A-L9-DPR'],
];

async function main() {
  const p1EvidencePath = path.resolve('datasets/mumbai/evidence/P1-line9-operational-platform-evidence.json');
  const p1Evidence = fs.existsSync(p1EvidencePath)
    ? JSON.parse(fs.readFileSync(p1EvidencePath, 'utf8'))
    : [];
  const stations = await prisma.station.findMany({
    where: { system: { code: 'MM' }, isActive: true },
    select: { id: true, code: true },
  });
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const stationByCode = new Map(stations.map((station) => [station.code, station]));
  let updated = 0;

  for (const [lineCode, dprSourceId] of lines) {
    const line = await prisma.line.findUnique({ where: { code: lineCode } });
    if (!line) continue;
    const platforms = await prisma.platform.findMany({
      where: { lineId: line.id, isActive: true },
      include: { level: { select: { stationId: true } } },
    });

    for (const platform of platforms) {
      const station = stationById.get(platform.level.stationId);
      const claim = p1Evidence.find((record) =>
        record.entityKey === station?.code &&
        String(record.value?.platformNumber) === String(platform.platformNumber),
      );
      const destination = claim?.value?.towardsStationId
        ? stationByCode.get(claim.value.towardsStationId)
        : null;

      await prisma.platform.update({
        where: { id: platform.id },
        data: {
          platformNumber: claim ? String(claim.value.platformNumber) : 'UNKNOWN',
          towardsStationId: claim ? destination?.id ?? null : null,
          screenDoors: null,
          wheelchairBoarding: null,
          evidenceStatus: claim?.status ?? 'PROPOSED_DPR',
          sourceId: claim?.source?.sourceId ?? dprSourceId,
        },
      });
      updated += 1;
    }
  }

  console.log(`Updated ${updated} line-owned platform records. DPR-only platform counts remain proposed; only attributed station-specific P1 claims receive a number or direction.`);
}

main()
  .catch((error) => {
    console.error('Failed to materialize line-owned P1 evidence:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
