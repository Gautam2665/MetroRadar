const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCSV(content) {
  const lines = content.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

async function main() {
  console.log('===============================================================');
  console.log('  🚀 Ingesting Pune Metro Operational GTFS into PostgreSQL Database');
  console.log('===============================================================\n');

  const gtfsDir = path.resolve('datasets/pune/gtfs');
  if (!fs.existsSync(gtfsDir)) {
    throw new Error(`GTFS directory not found at ${gtfsDir}`);
  }

  // 1. Read files
  console.log('1. Reading GTFS files...');
  const agencies = parseCSV(fs.readFileSync(path.join(gtfsDir, 'agency.txt'), 'utf8'));
  const routes = parseCSV(fs.readFileSync(path.join(gtfsDir, 'routes.txt'), 'utf8'));
  const stops = parseCSV(fs.readFileSync(path.join(gtfsDir, 'stops.txt'), 'utf8'));
  const levels = parseCSV(fs.readFileSync(path.join(gtfsDir, 'levels.txt'), 'utf8'));
  const calendars = parseCSV(fs.readFileSync(path.join(gtfsDir, 'calendar.txt'), 'utf8'));
  const shapes = parseCSV(fs.readFileSync(path.join(gtfsDir, 'shapes.txt'), 'utf8'));
  const trips = parseCSV(fs.readFileSync(path.join(gtfsDir, 'trips.txt'), 'utf8'));
  const stopTimes = parseCSV(fs.readFileSync(path.join(gtfsDir, 'stop_times.txt'), 'utf8'));
  const frequencies = parseCSV(fs.readFileSync(path.join(gtfsDir, 'frequencies.txt'), 'utf8'));
  const transfers = parseCSV(fs.readFileSync(path.join(gtfsDir, 'transfers.txt'), 'utf8'));
  const pathways = parseCSV(fs.readFileSync(path.join(gtfsDir, 'pathways.txt'), 'utf8'));

  console.log(`   - Agencies: ${agencies.length}`);
  console.log(`   - Routes: ${routes.length}`);
  console.log(`   - Stops/Nodes: ${stops.length}`);
  console.log(`   - Levels: ${levels.length}`);
  console.log(`   - Calendars: ${calendars.length}`);
  console.log(`   - Shape points: ${shapes.length}`);
  console.log(`   - Trips: ${trips.length}`);
  console.log(`   - Stop Times: ${stopTimes.length}`);
  console.log(`   - Frequencies: ${frequencies.length}`);
  console.log(`   - Transfers: ${transfers.length}`);
  console.log(`   - Pathways: ${pathways.length}\n`);

  // 2. System: PUNE
  console.log('2. Upserting System: PUNE (Pune Metro)...');
  const system = await prisma.system.upsert({
    where: { code: 'PUNE' },
    update: {
      name: 'Pune Metro',
      city: 'Pune',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      sourceType: 'OFFICIAL',
      trustTier: 'TIER_A',
      qualityScore: 99.0,
      badgeTier: 'Gold',
      isActive: true,
    },
    create: {
      code: 'PUNE',
      name: 'Pune Metro',
      city: 'Pune',
      country: 'India',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      sourceType: 'OFFICIAL',
      trustTier: 'TIER_A',
      qualityScore: 99.0,
      badgeTier: 'Gold',
      isActive: true,
    },
  });

  // 3. Asset Owner (MahaMetro)
  console.log('3. Upserting Asset Owners...');
  const assetOwner = await prisma.assetOwner.upsert({
    where: { code: 'MAHAMETRO_PUNE' },
    update: {
      name: 'Maharashtra Metro Rail Corporation Limited (Pune Metro Rail Project)',
      website: 'https://www.punemetrorail.org',
    },
    create: {
      code: 'MAHAMETRO_PUNE',
      name: 'Maharashtra Metro Rail Corporation Limited (Pune Metro Rail Project)',
      website: 'https://www.punemetrorail.org',
    },
  });

  // 4. Agencies
  console.log('4. Upserting Agencies...');
  const agencyMap = new Map();
  for (const a of agencies) {
    const record = await prisma.agency.upsert({
      where: { code: a.agency_id },
      update: {
        name: a.agency_name,
        website: a.agency_url || null,
        phone: a.agency_phone || null,
      },
      create: {
        code: a.agency_id,
        name: a.agency_name,
        website: a.agency_url || null,
        phone: a.agency_phone || null,
      },
    });
    agencyMap.set(a.agency_id, record.id);
  }

  // 5. Lines (Routes)
  console.log('5. Upserting Lines (Routes)...');
  const lineMap = new Map();
  for (const r of routes) {
    const agencyId = agencyMap.get(r.agency_id) || Array.from(agencyMap.values())[0];
    const colorHex = r.route_color ? `#${r.route_color.replace('#', '')}` : '#00e5ff';
    const line = await prisma.line.upsert({
      where: { code: `PUNE_${r.route_id}` },
      update: {
        systemId: system.id,
        agencyId,
        assetOwnerId: assetOwner.id,
        name: r.route_long_name || r.route_short_name,
        color: colorHex,
        status: 'ACTIVE',
        traction: 'OVERHEAD_CATENARY',
        signalling: 'CBTC',
        isActive: true,
      },
      create: {
        code: `PUNE_${r.route_id}`,
        systemId: system.id,
        agencyId,
        assetOwnerId: assetOwner.id,
        name: r.route_long_name || r.route_short_name,
        color: colorHex,
        status: 'ACTIVE',
        traction: 'OVERHEAD_CATENARY',
        signalling: 'CBTC',
        isActive: true,
      },
    });
    lineMap.set(r.route_id, line.id);
  }

  // 6. Stations (location_type = 1 or standalone platform)
  console.log('6. Upserting Stations...');
  const stationMap = new Map();
  const parentStations = stops.filter(s => s.location_type === '1');
  const standalonePlatforms = stops.filter(s => (s.location_type === '0' || !s.location_type) && !s.parent_station);
  const allStationStops = [...parentStations, ...standalonePlatforms];

  for (const s of allStationStops) {
    const lat = parseFloat(s.stop_lat);
    const lon = parseFloat(s.stop_lon);
    const code = s.stop_id;
    const name = s.stop_name;

    const record = await prisma.station.upsert({
      where: { code },
      update: {
        systemId: system.id,
        name,
        latitude: lat,
        longitude: lon,
        timezone: 'Asia/Kolkata',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        wheelchairAccessible: s.wheelchair_boarding === '1',
        isActive: true,
      },
      create: {
        code,
        systemId: system.id,
        name,
        latitude: lat,
        longitude: lon,
        timezone: 'Asia/Kolkata',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        wheelchairAccessible: s.wheelchair_boarding === '1',
        isActive: true,
      },
    });
    stationMap.set(s.stop_id, record.id);
  }

  // Map child stops to parent station UUID
  stops.forEach(s => {
    if (s.parent_station && stationMap.has(s.parent_station)) {
      stationMap.set(s.stop_id, stationMap.get(s.parent_station));
    }
  });

  console.log(`   Upserted ${allStationStops.length} Station containers.`);

  // 7. Levels
  console.log('7. Upserting Levels...');
  const levelMap = new Map();
  for (const lvl of levels) {
    let stationId = null;
    for (const [stnCode, dbId] of stationMap.entries()) {
      if (lvl.level_id.includes(stnCode)) {
        stationId = dbId;
        break;
      }
    }

    if (!stationId) {
      const stopWithLvl = stops.find(s => s.level_id === lvl.level_id);
      if (stopWithLvl && stopWithLvl.parent_station) {
        stationId = stationMap.get(stopWithLvl.parent_station);
      }
    }

    if (!stationId) continue;

    const lvlNum = parseFloat(lvl.level_index) || 0;
    let lvlType = 'OTHER';
    if (lvl.level_name.toLowerCase().includes('street') || lvl.level_name.toLowerCase().includes('ground')) {
      lvlType = 'STREET';
    } else if (lvl.level_name.toLowerCase().includes('concourse')) {
      lvlType = 'CONCOURSE';
    } else if (lvl.level_name.toLowerCase().includes('platform')) {
      lvlType = 'PLATFORM';
    } else if (lvl.level_name.toLowerCase().includes('mezzanine')) {
      lvlType = 'MEZZANINE';
    }

    let dbLevel = await prisma.level.findFirst({
      where: { stationId, name: lvl.level_name },
    });

    if (!dbLevel) {
      dbLevel = await prisma.level.create({
        data: {
          stationId,
          name: lvl.level_name,
          levelNumber: Math.round(lvlNum),
          type: lvlType,
          description: `Elevation: ${lvl.level_index}`,
          isActive: true,
        },
      });
    }
    levelMap.set(lvl.level_id, dbLevel.id);
  }
  console.log(`   Upserted ${levels.length} Levels.`);

  // 8. Entrances
  console.log('8. Upserting Entrances...');
  const entranceStops = stops.filter(s => s.location_type === '2');
  let entranceCount = 0;
  for (const ent of entranceStops) {
    const parentId = stationMap.get(ent.parent_station);
    if (!parentId) continue;

    const levelId = ent.level_id ? levelMap.get(ent.level_id) : null;
    const existingEnt = await prisma.entrance.findFirst({
      where: { stationId: parentId, name: ent.stop_name },
    });

    if (!existingEnt) {
      await prisma.entrance.create({
        data: {
          stationId: parentId,
          name: ent.stop_name,
          latitude: parseFloat(ent.stop_lat),
          longitude: parseFloat(ent.stop_lon),
          accessible: ent.wheelchair_boarding === '1',
          isActive: true,
        },
      });
    }
    entranceCount++;
  }
  console.log(`   Upserted ${entranceCount} Entrances.`);

  // 9. Platforms
  console.log('9. Upserting Platforms...');
  const platformStops = stops.filter(s => s.location_type === '0' && s.parent_station);
  let platformCount = 0;
  for (const pf of platformStops) {
    const parentId = stationMap.get(pf.parent_station);
    if (!parentId) continue;

    const stopTimeRecord = stopTimes.find(st => st.stop_id === pf.stop_id);
    let lineId = Array.from(lineMap.values())[0];
    if (stopTimeRecord) {
      const tripRecord = trips.find(t => t.trip_id === stopTimeRecord.trip_id);
      if (tripRecord && lineMap.has(tripRecord.route_id)) {
        lineId = lineMap.get(tripRecord.route_id);
      }
    }

    let levelId = pf.level_id ? levelMap.get(pf.level_id) : null;
    if (!levelId) {
      let fallbackLvl = await prisma.level.findFirst({
        where: { stationId: parentId, type: 'PLATFORM' },
      });
      if (!fallbackLvl) {
        fallbackLvl = await prisma.level.create({
          data: {
            stationId: parentId,
            name: 'Platform Level',
            levelNumber: 2,
            type: 'PLATFORM',
            isActive: true,
          },
        });
      }
      levelId = fallbackLvl.id;
    }

    const pfNum = pf.platform_code || '1';
    const existingPf = await prisma.platform.findFirst({
      where: { levelId, platformNumber: pfNum },
    });

    if (!existingPf) {
      await prisma.platform.create({
        data: {
          levelId,
          lineId,
          platformNumber: pfNum,
          wheelchairBoarding: pf.wheelchair_boarding === '1',
          evidenceStatus: 'VERIFIED_OPERATIONAL',
          status: 'ACTIVE',
          isActive: true,
        },
      });
    }
    platformCount++;
  }
  console.log(`   Upserted ${platformCount} Platforms.`);

  // 10. Calendars
  console.log('10. Upserting Calendars...');
  const calendarMap = new Map();
  for (const c of calendars) {
    const sDate = `${c.start_date.slice(0, 4)}-${c.start_date.slice(4, 6)}-${c.start_date.slice(6, 8)}`;
    const eDate = `${c.end_date.slice(0, 4)}-${c.end_date.slice(4, 6)}-${c.end_date.slice(6, 8)}`;

    const cal = await prisma.calendar.upsert({
      where: { serviceId: `PUNE_${c.service_id}` },
      update: {
        systemId: system.id,
        monday: c.monday === '1',
        tuesday: c.tuesday === '1',
        wednesday: c.wednesday === '1',
        thursday: c.thursday === '1',
        friday: c.friday === '1',
        saturday: c.saturday === '1',
        sunday: c.sunday === '1',
        startDate: new Date(sDate),
        endDate: new Date(eDate),
        isActive: true,
      },
      create: {
        systemId: system.id,
        serviceId: `PUNE_${c.service_id}`,
        monday: c.monday === '1',
        tuesday: c.tuesday === '1',
        wednesday: c.wednesday === '1',
        thursday: c.thursday === '1',
        friday: c.friday === '1',
        saturday: c.saturday === '1',
        sunday: c.sunday === '1',
        startDate: new Date(sDate),
        endDate: new Date(eDate),
        isActive: true,
      },
    });
    calendarMap.set(c.service_id, cal.id);
  }

  // 11. Shapes
  console.log(`11. Ingesting Shapes (${shapes.length} points)...`);
  const shapeIds = [...new Set(shapes.map(s => s.shape_id))];
  await prisma.shape.deleteMany({ where: { shapeId: { in: shapeIds } } });

  const shapeData = shapes.map(s => ({
    systemId: system.id,
    shapeId: s.shape_id,
    latitude: parseFloat(s.shape_pt_lat),
    longitude: parseFloat(s.shape_pt_lon),
    sequence: parseInt(s.shape_pt_sequence, 10),
    distTraveled: null,
    isActive: true,
  }));

  const BATCH_SIZE = 1000;
  for (let i = 0; i < shapeData.length; i += BATCH_SIZE) {
    await prisma.shape.createMany({
      data: shapeData.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
  }
  console.log(`   Ingested ${shapeData.length} shape points.`);

  // 12. Trips & StopTimes
  console.log('12. Ingesting Trips and StopTimes...');
  const existingTrips = await prisma.trip.findMany({
    where: { line: { systemId: system.id } },
    select: { id: true },
  });
  if (existingTrips.length > 0) {
    const tripIds = existingTrips.map(t => t.id);
    await prisma.stopTime.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.frequency.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: tripIds } } });
  }

  const tripIdMap = new Map();
  for (const t of trips) {
    const lineId = lineMap.get(t.route_id);
    if (!lineId) continue;

    const dbTrip = await prisma.trip.create({
      data: {
        lineId,
        serviceId: t.service_id,
        tripId: t.trip_id,
        tripHeadsign: t.trip_headsign || null,
        directionId: t.direction_id !== undefined ? parseInt(t.direction_id, 10) : 0,
        shapeId: t.shape_id || null,
        isActive: true,
      },
    });
    tripIdMap.set(t.trip_id, dbTrip.id);
  }

  // Batch StopTimes
  const stopTimeInserts = [];
  for (const st of stopTimes) {
    const tripDbId = tripIdMap.get(st.trip_id);
    const stationDbId = stationMap.get(st.stop_id);
    if (!tripDbId || !stationDbId) continue;

    stopTimeInserts.push({
      tripId: tripDbId,
      stationId: stationDbId,
      arrivalTime: st.arrival_time,
      departureTime: st.departure_time,
      stopSequence: parseInt(st.stop_sequence, 10),
      pickupType: st.pickup_type ? parseInt(st.pickup_type, 10) : 0,
      dropOffType: st.drop_off_type ? parseInt(st.drop_off_type, 10) : 0,
      isActive: true,
    });
  }

  for (let i = 0; i < stopTimeInserts.length; i += 500) {
    await prisma.stopTime.createMany({
      data: stopTimeInserts.slice(i, i + 500),
      skipDuplicates: true,
    });
  }

  // Frequencies
  const freqInserts = [];
  for (const f of frequencies) {
    const tripDbId = tripIdMap.get(f.trip_id);
    if (!tripDbId) continue;

    freqInserts.push({
      tripId: tripDbId,
      startTime: f.start_time,
      endTime: f.end_time,
      headwaySecs: parseInt(f.headway_secs, 10),
      exactTimes: f.exact_times ? parseInt(f.exact_times, 10) : 0,
      isActive: true,
    });
  }

  if (freqInserts.length > 0) {
    await prisma.frequency.createMany({
      data: freqInserts,
      skipDuplicates: true,
    });
  }

  console.log(`   Ingested ${trips.length} Trips, ${stopTimeInserts.length} StopTimes, and ${freqInserts.length} Frequencies.`);

  // 13. Materialize Station Sequences per Line
  console.log('13. Materializing Station Sequences per Line...');
  for (const r of routes) {
    const lineId = lineMap.get(r.route_id);
    await prisma.stationSequence.deleteMany({ where: { lineId } });

    const dir0Trip = trips.find(t => t.route_id === r.route_id && t.direction_id === '0');
    if (dir0Trip) {
      const tripStopTimes = stopTimes
        .filter(st => st.trip_id === dir0Trip.trip_id)
        .sort((a, b) => parseInt(a.stop_sequence, 10) - parseInt(b.stop_sequence, 10));

      const seqData = tripStopTimes.map((st, idx) => {
        const nextSt = tripStopTimes[idx + 1];
        return {
          lineId,
          stationId: stationMap.get(st.stop_id),
          sequence: parseInt(st.stop_sequence, 10),
          distanceFromPrevious: idx === 0 ? 0.0 : 1.2,
          travelTimeFromPrevious: idx === 0 ? 0 : 120,
          nextStationId: nextSt ? (stationMap.get(nextSt.stop_id) || null) : null,
          isActive: true,
        };
      }).filter(s => Boolean(s.stationId));

      await prisma.stationSequence.createMany({
        data: seqData,
        skipDuplicates: true,
      });
    }
  }

  console.log('\n===============================================================');
  console.log('  ✅ Pune Metro Operational GTFS Successfully Ingested into Database!');
  console.log('===============================================================\n');
}

main()
  .catch(err => {
    console.error('❌ Error during Pune ingestion:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
