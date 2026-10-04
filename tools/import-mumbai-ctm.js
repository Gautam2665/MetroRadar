const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importMumbaiCTM() {
  console.log('🚀 Starting Mumbai CTM Materialization into PostgreSQL (Sprint v0.6.5-K)...');

  // 1. Load canonical datasets
  const ctmLine1Path = path.join(__dirname, '../datasets/mumbai/normalized/ctm-line1.json');
  const ctmLine3Path = path.join(__dirname, '../datasets/mumbai/normalized/ctm.json');
  const postgisL3Path = path.join(__dirname, '../datasets/mumbai/normalized/canonical-postgis.json');
  const icxPath = path.join(__dirname, '../datasets/mumbai/network/interchange-complexes.json');

  const ctmLine1 = JSON.parse(fs.readFileSync(ctmLine1Path, 'utf8'));
  const ctmLine3 = JSON.parse(fs.readFileSync(ctmLine3Path, 'utf8'));
  const postgisL3 = JSON.parse(fs.readFileSync(postgisL3Path, 'utf8'));
  const icxData = JSON.parse(fs.readFileSync(icxPath, 'utf8'));

  console.log(`  Loaded CTM L1 (${ctmLine1.stations.length} stations) & CTM L3 (${ctmLine3.stations.length} stations)`);

  // 2. Resolve System (MM)
  let system = await prisma.system.findFirst({
    where: { code: 'MM' },
  });

  if (!system) {
    system = await prisma.system.create({
      data: {
        code: 'MM',
        name: 'Mumbai Metro',
        city: 'Mumbai',
        country: 'India',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE',
        sourceType: 'SYNTHESIZED',
        trustTier: 'TIER_X',
        isActive: true,
      },
    });
    console.log(`  Created new System: ${system.name} (${system.id})`);
  } else {
    system = await prisma.system.update({
      where: { id: system.id },
      data: {
        name: 'Mumbai Metro',
        city: 'Mumbai',
        status: 'ACTIVE',
        isActive: true,
      },
    });
    console.log(`  Found existing System: ${system.name} (${system.id})`);
  }

  // 3. Resolve Asset Owner (DEFAULT_OWNER)
  let assetOwner = await prisma.assetOwner.findFirst({
    where: { code: 'DEFAULT_OWNER' },
  });
  if (!assetOwner) {
    assetOwner = await prisma.assetOwner.create({
      data: {
        code: 'DEFAULT_OWNER',
        name: 'Default Owner',
        isActive: true,
      },
    });
  }

  // 4. Resolve Agencies (MMOPL and MMRCL)
  let agencyMMOPL = await prisma.agency.findFirst({ where: { code: 'AG_MMOPL' } });
  if (!agencyMMOPL) {
    agencyMMOPL = await prisma.agency.create({
      data: {
        code: 'AG_MMOPL',
        name: 'Mumbai Metro One Private Limited (MMOPL)',
        website: 'https://www.reliancemumbaimetro.com',
        isActive: true,
      },
    });
    console.log(`  Created Agency: ${agencyMMOPL.name}`);
  }

  let agencyMMRCL = await prisma.agency.findFirst({ where: { code: 'AG_MMRCL' } });
  if (!agencyMMRCL) {
    agencyMMRCL = await prisma.agency.create({
      data: {
        code: 'AG_MMRCL',
        name: 'Mumbai Metro Rail Corporation Limited (MMRCL)',
        website: 'https://www.mmrcl.com',
        isActive: true,
      },
    });
    console.log(`  Created Agency: ${agencyMMRCL.name}`);
  }

  // 5. Create or Update Lines (Line 1 & Line 3)
  let line1 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE1' } });
  if (!line1) {
    line1 = await prisma.line.create({
      data: {
        code: 'MUMBAI_LINE1',
        name: 'Line 1 (Blue Line)',
        color: '#007DC5',
        status: 'ACTIVE',
        traction: 'OVERHEAD_CATENARY',
        signalling: 'CBTC',
        gauge: '1435mm',
        length: 11.4,
        systemId: system.id,
        agencyId: agencyMMOPL.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
    console.log(`  Created Line: ${line1.name} (${line1.id})`);
  } else {
    line1 = await prisma.line.update({
      where: { id: line1.id },
      data: {
        name: 'Line 1 (Blue Line)',
        color: '#007DC5',
        systemId: system.id,
        agencyId: agencyMMOPL.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
  }

  let line3 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE3' } });
  if (!line3) {
    line3 = await prisma.line.create({
      data: {
        code: 'MUMBAI_LINE3',
        name: 'Line 3 (Aqua Line)',
        color: '#00AEEF',
        status: 'ACTIVE',
        traction: 'OVERHEAD_CATENARY',
        signalling: 'CBTC',
        gauge: '1435mm',
        length: 33.5,
        systemId: system.id,
        agencyId: agencyMMRCL.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
    console.log(`  Created Line: ${line3.name} (${line3.id})`);
  } else {
    line3 = await prisma.line.update({
      where: { id: line3.id },
      data: {
        name: 'Line 3 (Aqua Line)',
        color: '#00AEEF',
        systemId: system.id,
        agencyId: agencyMMRCL.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
  }

  // 6. Ingest Stations (39 total: 12 L1 + 27 L3)
  console.log('  Upserting 39 Stations (12 Line 1 + 27 Line 3)...');
  const stationRecordMap = new Map(); // canonicalId -> DB station record

  // Line 1 stations
  for (const st of ctmLine1.stations) {
    const existing = await prisma.station.findUnique({ where: { code: st.canonicalId } });
    let record;
    if (existing) {
      record = await prisma.station.update({
        where: { id: existing.id },
        data: {
          name: st.name,
          latitude: st.latitude,
          longitude: st.longitude,
          systemId: system.id,
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          timezone: 'Asia/Kolkata',
          wheelchairAccessible: true,
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
          wheelchairAccessible: true,
          isActive: true,
        },
      });
    }
    stationRecordMap.set(st.canonicalId, record);
  }

  // Line 3 stations
  for (const st of ctmLine3.stations) {
    const existing = await prisma.station.findUnique({ where: { code: st.canonicalId } });
    let record;
    if (existing) {
      record = await prisma.station.update({
        where: { id: existing.id },
        data: {
          name: st.name,
          latitude: st.latitude,
          longitude: st.longitude,
          systemId: system.id,
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          timezone: 'Asia/Kolkata',
          wheelchairAccessible: true,
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
          wheelchairAccessible: true,
          isActive: true,
        },
      });
    }
    stationRecordMap.set(st.canonicalId, record);
  }

  console.log(`  ✅ 39 Stations materialized successfully.`);

  // Update PostGIS Point geometry
  await prisma.$executeRawUnsafe(`
    UPDATE stations 
    SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE "systemId" = $1::uuid;
  `, system.id);
  console.log('  ✅ PostGIS Point geometry synchronized.');

  // 7. Clean and recreate StationSequences for Line 1 & Line 3
  console.log('  Materializing StationSequences for transit routing...');
  await prisma.stationSequence.deleteMany({
    where: { lineId: { in: [line1.id, line3.id] } },
  });

  // Line 1 sequences (11 edges)
  const l1Edges = ctmLine1.stationGraph.edges;
  for (const edge of l1Edges) {
    const fromStation = stationRecordMap.get(edge.fromStationId);
    const toStation = stationRecordMap.get(edge.toStationId);

    if (fromStation && toStation) {
      await prisma.stationSequence.create({
        data: {
          lineId: line1.id,
          stationId: fromStation.id,
          sequence: edge.sequenceFrom,
          distanceFromPrevious: edge.distanceMeters,
          travelTimeFromPrevious: edge.nominalTravelTimeSeconds,
          nextStationId: toStation.id,
          isActive: true,
        },
      });
    }
  }

  // Final terminal station sequence for Line 1
  const l1LastStation = stationRecordMap.get('STN_L1_012');
  if (l1LastStation) {
    await prisma.stationSequence.create({
      data: {
        lineId: line1.id,
        stationId: l1LastStation.id,
        sequence: 12,
        distanceFromPrevious: 875,
        travelTimeFromPrevious: 105,
        nextStationId: null,
        isActive: true,
      },
    });
  }

  // Line 3 sequences (26 edges)
  const l3SeqList = postgisL3.stationSequences;
  for (const seq of l3SeqList) {
    const fromStation = stationRecordMap.get(seq.stationId);
    const toStation = seq.nextStationId ? stationRecordMap.get(seq.nextStationId) : null;

    if (fromStation) {
      // Calculate travel time ~ distance / speed, minimum 80s, avg 115s
      const dist = seq.distanceFromPreviousMeters || 1000;
      const travelTime = Math.max(70, Math.round(dist / 9.5));

      await prisma.stationSequence.create({
        data: {
          lineId: line3.id,
          stationId: fromStation.id,
          sequence: seq.sequence,
          distanceFromPrevious: dist,
          travelTimeFromPrevious: travelTime,
          nextStationId: toStation ? toStation.id : null,
          isActive: true,
        },
      });
    }
  }
  console.log('  ✅ StationSequences created for Line 1 and Line 3.');

  // 8. Materialize Shapes for Line 1 and Line 3
  console.log('  Materializing Shapes for GIS map rendering...');
  const SHAPE_L1 = 'SHAPE_MUMBAI_L1';
  const SHAPE_L3 = 'SHAPE_MUMBAI_L3';

  await prisma.shape.deleteMany({
    where: { systemId: system.id },
  });

  // Line 1 shape: construct from 12 stations
  let l1Seq = 1;
  for (const st of ctmLine1.stations) {
    await prisma.shape.create({
      data: {
        systemId: system.id,
        shapeId: SHAPE_L1,
        latitude: st.latitude,
        longitude: st.longitude,
        sequence: l1Seq++,
        isActive: true,
      },
    });
  }

  // Line 3 shape: construct from 27 stations
  let l3Seq = 1;
  for (const st of ctmLine3.stations) {
    await prisma.shape.create({
      data: {
        systemId: system.id,
        shapeId: SHAPE_L3,
        latitude: st.latitude,
        longitude: st.longitude,
        sequence: l3Seq++,
        isActive: true,
      },
    });
  }
  console.log('  ✅ Shapes created for Line 1 and Line 3.');

  // 9. Calendar, Trips, and StopTimes (for Line 1 and Line 3)
  console.log('  Materializing Commercial Trips & StopTimes for line/station linkage...');
  let calendar = await prisma.calendar.findFirst({ where: { serviceId: 'MM_ALL_DAYS' } });
  if (!calendar) {
    calendar = await prisma.calendar.create({
      data: {
        systemId: system.id,
        serviceId: 'MM_ALL_DAYS',
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2030-12-31'),
        isActive: true,
      },
    });
  }

  // Delete previous trips for Mumbai lines
  await prisma.stopTime.deleteMany({
    where: { trip: { lineId: { in: [line1.id, line3.id] } } },
  });
  await prisma.trip.deleteMany({
    where: { lineId: { in: [line1.id, line3.id] } },
  });

  // Trip for Line 1 (Forward)
  const tripL1 = await prisma.trip.create({
    data: {
      lineId: line1.id,
      serviceId: calendar.serviceId,
      tripId: 'TRIP_MM_L1_REV',
      tripHeadsign: 'Ghatkopar',
      directionId: 0,
      shapeId: SHAPE_L1,
      isActive: true,
    },
  });

  let cumSecL1 = 0;
  for (let i = 0; i < ctmLine1.stations.length; i++) {
    const st = ctmLine1.stations[i];
    const rec = stationRecordMap.get(st.canonicalId);
    const timeStr = formatSecondsToHms(cumSecL1);
    await prisma.stopTime.create({
      data: {
        tripId: tripL1.id,
        stationId: rec.id,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: i + 1,
        isActive: true,
      },
    });
    cumSecL1 += 110;
  }

  // Trip for Line 3 (Forward)
  const tripL3 = await prisma.trip.create({
    data: {
      lineId: line3.id,
      serviceId: calendar.serviceId,
      tripId: 'TRIP_MM_L3_REV',
      tripHeadsign: 'Cuffe Parade',
      directionId: 0,
      shapeId: SHAPE_L3,
      isActive: true,
    },
  });

  let cumSecL3 = 0;
  for (let i = 0; i < ctmLine3.stations.length; i++) {
    const st = ctmLine3.stations[i];
    const rec = stationRecordMap.get(st.canonicalId);
    const timeStr = formatSecondsToHms(cumSecL3);
    await prisma.stopTime.create({
      data: {
        tripId: tripL3.id,
        stationId: rec.id,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: i + 1,
        isActive: true,
      },
    });
    cumSecL3 += 115;
  }

  console.log('  ✅ Trips & StopTimes created. Station-Line linkages active in DB.');

  console.log('🎉 Mumbai CTM successfully materialized in PostgreSQL!');
}

function formatSecondsToHms(totalSec) {
  const h = Math.floor(totalSec / 3600) + 6; // start at 06:00:00
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

importMumbaiCTM()
  .catch((err) => {
    console.error('❌ Error importing Mumbai CTM:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
