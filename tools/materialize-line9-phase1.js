const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function materializeLine9() {
  console.log('🚀 Materializing Mumbai Line 9 Phase 1 into PostgreSQL...');

  const ctmPath = path.resolve('datasets/mumbai/normalized/ctm-line9-phase1.json');
  const ctm9 = JSON.parse(fs.readFileSync(ctmPath, 'utf8'));
  const p1Path = path.resolve('datasets/mumbai/evidence/P1-line9-operational-platform-evidence.json');
  const p1Evidence = JSON.parse(fs.readFileSync(p1Path, 'utf8'));
  const crosswalkPath = path.resolve('datasets/mumbai/evidence/dpr-operational-station-crosswalk-line9-phase1.json');
  const crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, 'utf8'));
  const bEvidencePath = path.resolve('datasets/mumbai/evidence/B-station-infrastructure-red-extension-records.json');
  const bEvidence = JSON.parse(fs.readFileSync(bEvidencePath, 'utf8'));

  console.log(`  Loaded CTM L9 (${ctm9.stations.length} stations)`);

  const system = await prisma.system.findFirst({ where: { code: 'MM' } });
  if (!system) throw new Error('Mumbai Metro (MM) system record not found.');

  const agency = await prisma.agency.findFirst({ where: { code: 'AG_MMMOCL' } });
  if (!agency) throw new Error('MMMOCL agency record not found.');

  let assetOwner = await prisma.assetOwner.findFirst({ where: { code: 'DEFAULT_OWNER' } });
  if (!assetOwner) {
    assetOwner = await prisma.assetOwner.create({
      data: { code: 'DEFAULT_OWNER', name: 'Default Owner', isActive: true },
    });
  }

  // Create or Update Line 9
  let line9 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE9' } });
  if (!line9) {
    line9 = await prisma.line.create({
      data: {
        code: 'MUMBAI_LINE9',
        name: 'Line 9 (Red Line Extension)',
        color: '#E31E24',
        status: 'ACTIVE',
        traction: 'THIRD_RAIL',
        signalling: 'CBTC',
        gauge: '1435mm',
        length: 4.7,
        systemId: system.id,
        agencyId: agency.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
    console.log(`  Created Line 9: ${line9.name}`);
  } else {
    line9 = await prisma.line.update({
      where: { id: line9.id },
      data: {
        name: 'Line 9 (Red Line Extension)',
        color: '#E31E24',
        status: 'ACTIVE',
        isActive: true,
      },
    });
    console.log(`  Updated Line 9: ${line9.name}`);
  }

  // Upsert Stations (Dahisar East is existing STN_L7_001)
  const stationRecordMap = new Map();
  for (const st of ctm9.stations) {
    let record = await prisma.station.findUnique({ where: { code: st.canonicalId } });
    if (record) {
      record = await prisma.station.update({
        where: { id: record.id },
        data: {
          name: st.name,
          latitude: st.latitude,
          longitude: st.longitude,
          systemId: system.id,
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
      });
    } else {
      record = await prisma.station.create({
        data: {
          code: st.canonicalId,
          name: st.name,
          latitude: st.latitude,
          longitude: st.longitude,
          systemId: system.id,
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
      });
      console.log(`  Created Station: ${st.name} (${st.canonicalId})`);
    }
    stationRecordMap.set(st.canonicalId, record);
  }

  // Sync PostGIS point geometries
  await prisma.$executeRawUnsafe(`
    UPDATE stations 
    SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE "systemId" = $1::uuid;
  `, system.id);
  console.log('  ✅ PostGIS Point geometry synchronized.');

  // StationSequences
  await prisma.stationSequence.deleteMany({
    where: { lineId: line9.id },
  });

  const edges = ctm9.stationGraph.edges;
  for (const edge of edges) {
    const fromStation = stationRecordMap.get(edge.fromStationId);
    const toStation = stationRecordMap.get(edge.toStationId);
    if (fromStation && toStation) {
      await prisma.stationSequence.create({
        data: {
          lineId: line9.id,
          stationId: fromStation.id,
          sequence: edge.sequenceFrom,
          distanceFromPrevious: edge.distanceMeters,
          travelTimeFromPrevious: 0, // Current runtime is source-required; 0 invokes the engine's generic estimate.
          nextStationId: toStation.id,
          isActive: true,
        },
      });
    }
  }

  const lastStation = stationRecordMap.get('STN_L9_003');
  if (lastStation) {
    await prisma.stationSequence.create({
      data: {
        lineId: line9.id,
        stationId: lastStation.id,
        sequence: 4,
        distanceFromPrevious: 915,
        travelTimeFromPrevious: 0,
        nextStationId: null,
        isActive: true,
      },
    });
  }
  console.log('  ✅ StationSequences created for Line 9 Phase 1.');

  // Alignment Shape
  const SHAPE_L9 = 'SHAPE_MUMBAI_L9';
  await prisma.shape.deleteMany({ where: { shapeId: SHAPE_L9 } });

  const l9Coords = ctm9.alignmentGeometry?.coordinates;
  if (Array.isArray(l9Coords) && l9Coords.length >= 2) {
    const l9ShapeData = l9Coords.map(([longitude, latitude], idx) => ({
      systemId: system.id,
      shapeId: SHAPE_L9,
      latitude,
      longitude,
      sequence: idx + 1,
      isActive: true,
    }));
    await prisma.shape.createMany({ data: l9ShapeData });
    console.log(`  ✅ Alignment shape created for Line 9 (${l9ShapeData.length} vertices).`);
  }

  // Do not create synthetic trips/StopTimes when no current timetable source
  // is available. Deactivate any earlier demo rows produced by this importer.
  await prisma.stopTime.updateMany({
    where: { trip: { lineId: line9.id }, isActive: true },
    data: { isActive: false },
  });
  await prisma.trip.updateMany({
    where: { lineId: line9.id, isActive: true },
    data: { isActive: false },
  });
  console.log('  ⏸️ No Line 9 trips or timetable rows materialized; schedule remains source-required.');

  // Materialize levels and platforms for Line 9 stations
  const l9StationCodes = ['STN_L9_001', 'STN_L9_002', 'STN_L9_003'];
  for (const code of l9StationCodes) {
    const stRec = stationRecordMap.get(code);
    if (!stRec) continue;
    const crosswalkRow = crosswalk.records.find((row) => row.operationalStationId === code);
    const inventoryRecord = bEvidence.find((record) =>
      record.entityKey === crosswalkRow?.dprEntityKey &&
      record.attribute === 'proposed_level_inventory',
    );
    const inventory = inventoryRecord?.value ?? [];
    if (!inventory.length) continue;

    for (let index = 0; index < inventory.length; index += 1) {
      const proposedType = inventory[index];
      const type = proposedType === 'PLATFORM' ? 'PLATFORM' : 'CONCOURSE';
      const name = proposedType === 'GROUND_CONCOURSE'
        ? 'Ground Concourse Level'
        : proposedType === 'CONCOURSE' ? 'Concourse Level' : 'Platform Level';
      const existing = await prisma.level.findFirst({
        where: { stationId: stRec.id, lineId: line9.id, type },
      });
      const data = {
        stationId: stRec.id,
        lineId: line9.id,
        evidenceStatus: 'PROPOSED_DPR',
        sourceId: inventoryRecord.source.sourceId,
        levelNumber: index + 1,
        name,
        type,
        isActive: true,
        deletedAt: null,
      };
      if (existing) await prisma.level.update({ where: { id: existing.id }, data });
      else await prisma.level.create({ data });
    }

    const platformLvl = await prisma.level.findFirst({
      where: { stationId: stRec.id, lineId: line9.id, type: 'PLATFORM' },
    });
    if (!platformLvl) continue;

    // Keep proposed platform counts line-owned. Numeric labels/directions are
    // only materialized when the station-specific P1 evidence file supplies
    // an attributed claim; DPR platform counts are not direction evidence.
    const existingPf = await prisma.platform.findMany({
      where: { lineId: line9.id, levelId: platformLvl.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const stationFacts = p1Evidence.filter((record) => record.entityKey === code);
    for (let index = 0; index < 2; index += 1) {
      const reported = stationFacts.find((record) => String(record.value?.platformNumber) === String(index + 1));
      const towardsStationId = reported?.value?.towardsStationId
        ? stationRecordMap.get(reported.value.towardsStationId)?.id ?? null
        : null;
      const data = {
        levelId: platformLvl.id,
        lineId: line9.id,
        platformNumber: reported ? String(reported.value.platformNumber) : 'UNKNOWN',
        towardsStationId: reported ? towardsStationId : null,
        screenDoors: null,
        wheelchairBoarding: null,
        status: 'ACTIVE',
        isActive: true,
        deletedAt: null,
        evidenceStatus: reported?.status ?? 'PROPOSED_DPR',
        sourceId: reported?.source?.sourceId ?? 'SRC-MMRDA-L7A-L9-DPR',
      };
      if (existingPf[index]) {
        await prisma.platform.update({ where: { id: existingPf[index].id }, data });
      } else {
        await prisma.platform.create({ data });
      }
    }
    for (const extra of existingPf.slice(2)) {
      await prisma.platform.update({
        where: { id: extra.id },
        data: { isActive: false, deletedAt: new Date() },
      });
    }
  }
  console.log('  ✅ Levels and platforms materialized for Line 9 stations.');

  console.log('✨ Line 9 Phase 1 materialization completed successfully.');
}

materializeLine9()
  .catch((err) => {
    console.error('Fatal error during Line 9 materialization:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
