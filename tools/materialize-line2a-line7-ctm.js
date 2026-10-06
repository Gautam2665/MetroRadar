const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function formatSecondsToHms(totalSec) {
  const h = Math.floor(totalSec / 3600) + 6; // start at 06:00:00
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function materializeLine2aLine7() {
  console.log('🚀 Materializing Mumbai Line 2A & Line 7 into PostgreSQL...');

  // 1. Load canonical CTM datasets
  const ctm2aPath = path.resolve('datasets/mumbai/normalized/ctm-line2a.json');
  const ctm7Path = path.resolve('datasets/mumbai/normalized/ctm-line7.json');
  const ctm2a = JSON.parse(fs.readFileSync(ctm2aPath, 'utf8'));
  const ctm7 = JSON.parse(fs.readFileSync(ctm7Path, 'utf8'));

  console.log(`  Loaded CTM L2A (${ctm2a.stations.length} stations) & CTM L7 (${ctm7.stations.length} stations)`);

  // 2. Resolve System (MM)
  const system = await prisma.system.findFirst({ where: { code: 'MM' } });
  if (!system) throw new Error('Mumbai Metro (MM) system record not found.');

  // 3. Resolve Asset Owner
  let assetOwner = await prisma.assetOwner.findFirst({ where: { code: 'DEFAULT_OWNER' } });
  if (!assetOwner) {
    assetOwner = await prisma.assetOwner.create({
      data: { code: 'DEFAULT_OWNER', name: 'Default Owner', isActive: true }
    });
  }

  // 4. Resolve Agency MMMOCL
  let agencyMMMOCL = await prisma.agency.findFirst({ where: { code: 'AG_MMMOCL' } });
  if (!agencyMMMOCL) {
    agencyMMMOCL = await prisma.agency.create({
      data: {
        code: 'AG_MMMOCL',
        name: 'Maha Mumbai Metro Operation Corporation Ltd (MMMOCL)',
        website: 'https://mmmocl.co.in',
        isActive: true,
      },
    });
    console.log(`  Created Agency: ${agencyMMMOCL.name}`);
  }

  // 5. Create or Update Line 2A (Yellow) and Line 7 (Red)
  let line2a = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE2A' } });
  if (!line2a) {
    line2a = await prisma.line.create({
      data: {
        code: 'MUMBAI_LINE2A',
        name: 'Line 2A (Yellow Line)',
        color: '#F0C800',
        status: 'ACTIVE',
        traction: 'OVERHEAD_CATENARY',
        signalling: 'CBTC',
        gauge: '1435mm',
        length: 18.6,
        systemId: system.id,
        agencyId: agencyMMMOCL.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
    console.log(`  Created Line: ${line2a.name}`);
  } else {
    line2a = await prisma.line.update({
      where: { id: line2a.id },
      data: {
        name: 'Line 2A (Yellow Line)',
        color: '#F0C800',
        systemId: system.id,
        agencyId: agencyMMMOCL.id,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    console.log(`  Updated Line: ${line2a.name}`);
  }

  let line7 = await prisma.line.findFirst({ where: { code: 'MUMBAI_LINE7' } });
  if (!line7) {
    line7 = await prisma.line.create({
      data: {
        code: 'MUMBAI_LINE7',
        name: 'Line 7 (Red Line)',
        color: '#E31E24',
        status: 'ACTIVE',
        traction: 'OVERHEAD_CATENARY',
        signalling: 'CBTC',
        gauge: '1435mm',
        length: 16.5,
        systemId: system.id,
        agencyId: agencyMMMOCL.id,
        assetOwnerId: assetOwner.id,
        isActive: true,
      },
    });
    console.log(`  Created Line: ${line7.name}`);
  } else {
    line7 = await prisma.line.update({
      where: { id: line7.id },
      data: {
        name: 'Line 7 (Red Line)',
        color: '#E31E24',
        systemId: system.id,
        agencyId: agencyMMMOCL.id,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    console.log(`  Updated Line: ${line7.name}`);
  }

  // 6. Ingest Stations (17 for Line 2A, 14 for Line 7)
  const stationRecordMap = new Map();

  async function upsertStationList(stationList) {
    for (const st of stationList) {
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
  }

  console.log('  Upserting Line 2A Stations...');
  await upsertStationList(ctm2a.stations);
  console.log('  Upserting Line 7 Stations...');
  await upsertStationList(ctm7.stations);

  // Sync PostGIS point geometries
  await prisma.$executeRawUnsafe(`
    UPDATE stations 
    SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE "systemId" = $1::uuid;
  `, system.id);
  console.log('  ✅ PostGIS Point geometry synchronized.');

  // 7. Materialize StationSequences
  console.log('  Materializing StationSequences for Line 2A and Line 7...');
  await prisma.stationSequence.deleteMany({
    where: { lineId: { in: [line2a.id, line7.id] } },
  });

  // Line 2A sequences
  const edges2a = ctm2a.stationGraph.edges;
  for (const edge of edges2a) {
    const fromStation = stationRecordMap.get(edge.fromStationId);
    const toStation = stationRecordMap.get(edge.toStationId);
    if (fromStation && toStation) {
      await prisma.stationSequence.create({
        data: {
          lineId: line2a.id,
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
  const l2aLastStation = stationRecordMap.get('STN_L2A_017');
  if (l2aLastStation) {
    await prisma.stationSequence.create({
      data: {
        lineId: line2a.id,
        stationId: l2aLastStation.id,
        sequence: 17,
        distanceFromPrevious: 1050,
        travelTimeFromPrevious: 135,
        nextStationId: null,
        isActive: true,
      },
    });
  }

  // Line 7 sequences
  const edges7 = ctm7.stationGraph.edges;
  for (const edge of edges7) {
    const fromStation = stationRecordMap.get(edge.fromStationId);
    const toStation = stationRecordMap.get(edge.toStationId);
    if (fromStation && toStation) {
      await prisma.stationSequence.create({
        data: {
          lineId: line7.id,
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
  const l7LastStation = stationRecordMap.get('STN_L7_014');
  if (l7LastStation) {
    await prisma.stationSequence.create({
      data: {
        lineId: line7.id,
        stationId: l7LastStation.id,
        sequence: 14,
        distanceFromPrevious: 1100,
        travelTimeFromPrevious: 140,
        nextStationId: null,
        isActive: true,
      },
    });
  }
  console.log('  ✅ StationSequences created for Line 2A (17 stns) and Line 7 (14 stns).');

  // 8. Materialize Shapes for Line 2A and Line 7
  const SHAPE_L2A = 'SHAPE_MUMBAI_L2A';
  const SHAPE_L7 = 'SHAPE_MUMBAI_L7';

  await prisma.shape.deleteMany({
    where: { shapeId: { in: [SHAPE_L2A, SHAPE_L7] } },
  });

  const l2aCoordinates = ctm2a.alignmentGeometry?.coordinates;
  const l7Coordinates = ctm7.alignmentGeometry?.coordinates;
  if (!Array.isArray(l2aCoordinates) || l2aCoordinates.length < 2) {
    throw new Error('Line 2A CTM is missing its GIS alignment geometry. Rebuild the CTM first.');
  }
  if (!Array.isArray(l7Coordinates) || l7Coordinates.length < 2) {
    throw new Error('Line 7 CTM is missing its GIS alignment geometry. Rebuild the CTM first.');
  }

  const l2aShapeData = l2aCoordinates.map(([longitude, latitude], idx) => ({
    systemId: system.id,
    shapeId: SHAPE_L2A,
    latitude,
    longitude,
    sequence: idx + 1,
    isActive: true,
  }));
  await prisma.shape.createMany({ data: l2aShapeData });

  const l7ShapeData = l7Coordinates.map(([longitude, latitude], idx) => ({
    systemId: system.id,
    shapeId: SHAPE_L7,
    latitude,
    longitude,
    sequence: idx + 1,
    isActive: true,
  }));
  await prisma.shape.createMany({ data: l7ShapeData });
  console.log(`  ✅ GIS alignment shapes created (Line 2A: ${l2aShapeData.length} vertices, Line 7: ${l7ShapeData.length} vertices).`);

  // 9. Calendar, Trips, and StopTimes for Station-Line linkage
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

  await prisma.stopTime.deleteMany({
    where: { trip: { lineId: { in: [line2a.id, line7.id] } } },
  });
  await prisma.trip.deleteMany({
    where: { lineId: { in: [line2a.id, line7.id] } },
  });

  // Trip Line 2A
  const tripL2A = await prisma.trip.create({
    data: {
      lineId: line2a.id,
      serviceId: calendar.serviceId,
      tripId: 'TRIP_MM_L2A_REV',
      tripHeadsign: 'Andheri (West)',
      directionId: 0,
      shapeId: SHAPE_L2A,
      isActive: true,
    },
  });

  let cumSec2a = 0;
  for (let i = 0; i < ctm2a.stations.length; i++) {
    const st = ctm2a.stations[i];
    const rec = stationRecordMap.get(st.canonicalId);
    const timeStr = formatSecondsToHms(cumSec2a);
    await prisma.stopTime.create({
      data: {
        tripId: tripL2A.id,
        stationId: rec.id,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: i + 1,
        isActive: true,
      },
    });
    cumSec2a += 125;
  }

  // Trip Line 7
  const tripL7 = await prisma.trip.create({
    data: {
      lineId: line7.id,
      serviceId: calendar.serviceId,
      tripId: 'TRIP_MM_L7_REV',
      tripHeadsign: 'Gundavali',
      directionId: 0,
      shapeId: SHAPE_L7,
      isActive: true,
    },
  });

  let cumSec7 = 0;
  for (let i = 0; i < ctm7.stations.length; i++) {
    const st = ctm7.stations[i];
    const rec = stationRecordMap.get(st.canonicalId);
    const timeStr = formatSecondsToHms(cumSec7);
    await prisma.stopTime.create({
      data: {
        tripId: tripL7.id,
        stationId: rec.id,
        arrivalTime: timeStr,
        departureTime: timeStr,
        stopSequence: i + 1,
        isActive: true,
      },
    });
    cumSec7 += 135;
  }
  console.log('  ✅ Trips & StopTimes created for Line 2A & Line 7.');

  // 10. Materialize Levels & Platforms
  console.log('  Materializing Levels and Platforms for Line 2A and Line 7...');
  const stn2aIds = ctm2a.stations.map(s => stationRecordMap.get(s.canonicalId).id);
  const stn7Ids = ctm7.stations.map(s => stationRecordMap.get(s.canonicalId).id);
  const allNewStnIds = [...stn2aIds, ...stn7Ids];

  await prisma.platform.deleteMany({
    where: { lineId: { in: [line2a.id, line7.id] } },
  });
  await prisma.level.deleteMany({
    where: { stationId: { in: allNewStnIds } },
  });

  // The DPRs support station levels and two platforms, but do not
  // establish platform-number/direction assignments. Store the physical
  // platforms with UNKNOWN identifiers and a null direction so journey
  // responses stay UNKNOWN until operator wayfinding is acquired.
  for (const [ctm, line, prefix] of [[ctm2a, line2a, 'STN_L2A_'], [ctm7, line7, 'STN_L7_']]) {
    for (const st of ctm.stations) {
      const station = stationRecordMap.get(st.canonicalId);
      if (!station) continue;
      await prisma.level.create({
        data: { stationId: station.id, name: 'Concourse Level', levelNumber: 1, type: 'CONCOURSE', description: 'Lower station level per corridor DPR', isActive: true },
      });
      const platformLevel = await prisma.level.create({
        data: { stationId: station.id, name: 'Platform Level', levelNumber: 2, type: 'PLATFORM', description: 'Upper station level per corridor DPR', isActive: true },
      });
      if (prefix === 'STN_L2A_' && st.sequence === 17) {
        await prisma.level.create({
          data: { stationId: station.id, name: 'Property Development Level', levelNumber: 0, type: 'OTHER', description: 'Additional level documented by MMRDA for Andheri West station; relative ordering not established by source', isActive: true },
        });
      }
      for (let platformIndex = 0; platformIndex < 2; platformIndex++) {
        await prisma.platform.create({
          data: {
            lineId: line.id,
            levelId: platformLevel.id,
            platformNumber: 'UNKNOWN',
            towardsStationId: null,
            screenDoors: null,
            wheelchairBoarding: null,
            status: 'ACTIVE',
            isActive: true,
          },
        });
      }
    }
  }

  console.log('  ✅ Concourse/platform levels and 62 documented platforms materialized; arrangement, direction, and numbering remain unknown pending station-level sources.');
  console.log('🎉 Ingestion complete for Mumbai Metro Lines 2A & 7!');
}

materializeLine2aLine7()
  .catch((err) => {
    console.error('❌ Error materializing Line 2A and Line 7:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
