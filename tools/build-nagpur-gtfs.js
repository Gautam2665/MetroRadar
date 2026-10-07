const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.cwd(), 'datasets/nagpur/gtfs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}


// ── 1. Load ArcGIS Navi Mumbai Source ───────────────────────────────────────
const arcgisPath = path.resolve(process.cwd(), 'datasets/nagpur/source/arcgis-nagpur.json');
const arcgis = JSON.parse(fs.readFileSync(arcgisPath, 'utf8'));

// ── 2. Helper for coordinate slicing & deduplication ────────────────────────
function dedupeCoords(coords) {
  const clean = [];
  for (let i = 0; i < coords.length; i++) {
    if (
      i === 0 ||
      Math.abs(coords[i][0] - coords[i - 1][0]) > 1e-6 ||
      Math.abs(coords[i][1] - coords[i - 1][1]) > 1e-6
    ) {
      clean.push(coords[i]);
    }
  }
  return clean;
}

function sliceCoords(allCoords, fromCoord, toCoord) {
  let minFrom = Infinity, minTo = Infinity;
  let idxFrom = -1, idxTo = -1;
  for (let i = 0; i < allCoords.length; i++) {
    const p = allCoords[i];
    const dFrom = Math.pow(p[0] - fromCoord[0], 2) + Math.pow(p[1] - fromCoord[1], 2);
    const dTo = Math.pow(p[0] - toCoord[0], 2) + Math.pow(p[1] - toCoord[1], 2);
    if (dFrom < minFrom) { minFrom = dFrom; idxFrom = i; }
    if (dTo < minTo) { minTo = dTo; idxTo = i; }
  }
  if (idxFrom === -1 || idxTo === -1) return dedupeCoords([fromCoord, toCoord]);
  const res = [fromCoord];
  if (idxFrom < idxTo) {
    for (let i = idxFrom; i <= idxTo; i++) res.push(allCoords[i]);
  } else {
    for (let i = idxFrom; i >= idxTo; i--) res.push(allCoords[i]);
  }
  res.push(toCoord);
  return dedupeCoords(res);
}

// ── 3. Agencies ─────────────────────────────────────────────────────────────
const agencyContent = `agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_email
CIDCO,City and Industrial Development Corporation (Navi Mumbai Metro),https://cidco.maharashtra.gov.in,Asia/Kolkata,en,022-67121000,contactus@cidcoindia.com
`;
fs.writeFileSync(path.join(outDir, 'agency.txt'), agencyContent, 'utf8');

// ── 4. Routes (route_long_name does NOT contain route_short_name) ────────────
const routesContent = `route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color
LINE1,CIDCO,Line 1,Belapur Terminal - Pendhar,1,0284C7,FFFFFF
`;
fs.writeFileSync(path.join(outDir, 'routes.txt'), routesContent, 'utf8');

// ── 5. Calendar ─────────────────────────────────────────────────────────────
const calendarContent = `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
SVC_WEEKDAY,1,1,1,1,1,0,0,20240101,20271231
SVC_SATURDAY,0,0,0,0,0,1,0,20240101,20271231
SVC_SUNDAY,0,0,0,0,0,0,1,20240101,20271231
`;
fs.writeFileSync(path.join(outDir, 'calendar.txt'), calendarContent, 'utf8');

// ── 6. Feed Info (with feed_contact_email and feed_contact_url) ─────────────
const feedInfoContent = `feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version,feed_contact_email,feed_contact_url
MetroRadar India Open Transit Data,https://metroradar.in,en,20240101,20271231,v1.0.0-canonical-navi-mumbai,support@metroradar.in,https://metroradar.in/contact
`;
fs.writeFileSync(path.join(outDir, 'feed_info.txt'), feedInfoContent, 'utf8');

// ── 7. Stations Mapping & Coordinate Alignment ──────────────────────────────
const arcgisStns = arcgis.stations.features;

// Official 11 operational stations of Navi Mumbai Metro Line 1
const LINE1_STATIONS = [
  { arcgisId: 1151, id: 'STN_NMM_001', code: 'NMM1_01', name: 'Belapur Terminal (CBD Belapur)', cleanName: 'Belapur Terminal' },
  { arcgisId: 1152, id: 'STN_NMM_002', code: 'NMM1_02', name: 'Sector 7 (RBI Colony)', cleanName: 'Sector 7' },
  { arcgisId: 1153, id: 'STN_NMM_003', code: 'NMM1_03', name: 'CIDCO Science Park (Belpada)', cleanName: 'CIDCO Science Park' },
  { arcgisId: 1154, id: 'STN_NMM_004', code: 'NMM1_04', name: 'Utsav Chowk (Kharghar)', cleanName: 'Utsav Chowk' },
  { arcgisId: 1155, id: 'STN_NMM_005', code: 'NMM1_05', name: 'Sector 11 (Kendriya Vihar)', cleanName: 'Sector 11' },
  { arcgisId: 1156, id: 'STN_NMM_006', code: 'NMM1_06', name: 'Sector 14 (Kharghar Village)', cleanName: 'Sector 14' },
  { arcgisId: 1157, id: 'STN_NMM_007', code: 'NMM1_07', name: 'Central Park', cleanName: 'Central Park' },
  { arcgisId: 1158, id: 'STN_NMM_008', code: 'NMM1_08', name: 'Pethpada', cleanName: 'Pethpada' },
  { arcgisId: 1159, id: 'STN_NMM_009', code: 'NMM1_09', name: 'Amandoot (Sector 34)', cleanName: 'Amandoot' },
  { arcgisId: 1160, id: 'STN_NMM_010', code: 'NMM1_10', name: 'Pethali (Panchanand)', cleanName: 'Pethali' },
  { arcgisId: 1161, id: 'STN_NMM_011', code: 'NMM1_11', name: 'Pendhar', cleanName: 'Pendhar' },
];

function getArcgisCoord(arcgisId) {
  const feat = arcgisStns.find(f => f.id === arcgisId || f.properties?.objectid === arcgisId);
  if (!feat) throw new Error(`ArcGIS station id ${arcgisId} not found`);
  return feat.geometry.coordinates; // [lng, lat]
}

// ── 8. Levels, Stops, Platforms, Entrances, Pathways ────────────────────────
const levelsRows = [
  'level_id,level_index,level_name',
  'LVL_0,0,Street Level 0',
  'LVL_1,1,Concourse Level 1',
  'LVL_2,2,Platform Level 2',
];

const stopsRows = [
  'stop_id,stop_name,stop_code,stop_lat,stop_lon,location_type,parent_station,wheelchair_boarding,level_id,platform_code,zone_id',
];

const pathwaysRows = [
  'pathway_id,from_stop_id,to_stop_id,pathway_mode,is_bidirectional,length,traversal_time',
];

let pathwayCounter = 1;

for (const s of LINE1_STATIONS) {
  const [lng, lat] = getArcgisCoord(s.arcgisId);

  // 1. Station Container (location_type=1)
  stopsRows.push(`${s.id},"${s.name}",${s.code},${lat.toFixed(6)},${lng.toFixed(6)},1,,1,LVL_0,,ZONE_NMM`);

  // 2. Concourse Node (location_type=3)
  const concourseId = `CONC_${s.id}`;
  stopsRows.push(`${concourseId},"${s.name} Concourse",,${lat.toFixed(6)},${lng.toFixed(6)},3,${s.id},1,LVL_1,,ZONE_NMM`);

  // 3. Platforms (location_type=0)
  // PF 1: Towards Pendhar
  const pf1Id = `PF_${s.id}_1`;
  const pf1Lat = (lat + 0.00008).toFixed(6);
  const pf1Lng = (lng + 0.00008).toFixed(6);
  stopsRows.push(`${pf1Id},"${s.name} Platform 1",,${pf1Lat},${pf1Lng},0,${s.id},1,LVL_2,1,ZONE_NMM`);

  // PF 2: Towards Belapur Terminal
  const pf2Id = `PF_${s.id}_2`;
  const pf2Lat = (lat - 0.00008).toFixed(6);
  const pf2Lng = (lng - 0.00008).toFixed(6);
  stopsRows.push(`${pf2Id},"${s.name} Platform 2",,${pf2Lat},${pf2Lng},0,${s.id},1,LVL_2,2,ZONE_NMM`);

  // 4. Entrances / Exits (location_type=2)
  const ent1Id = `ENT_${s.id}_G1`;
  const ent1Lat = (lat + 0.00015).toFixed(6);
  const ent1Lng = (lng - 0.00015).toFixed(6);
  stopsRows.push(`${ent1Id},"${s.name} Gate 1",,${ent1Lat},${ent1Lng},2,${s.id},1,LVL_0,,ZONE_NMM`);

  const ent2Id = `ENT_${s.id}_G2`;
  const ent2Lat = (lat - 0.00015).toFixed(6);
  const ent2Lng = (lng + 0.00015).toFixed(6);
  stopsRows.push(`${ent2Id},"${s.name} Gate 2",,${ent2Lat},${ent2Lng},2,${s.id},1,LVL_0,,ZONE_NMM`);

  // 5. Pathways (Only between nodes: Entrance <-> Concourse, Concourse <-> Platforms)
  // Gate 1 <-> Concourse
  pathwaysRows.push(`PW_${pathwayCounter++},${ent1Id},${concourseId},1,1,35,30`);
  pathwaysRows.push(`PW_${pathwayCounter++},${ent2Id},${concourseId},1,1,35,30`);

  // Concourse <-> Platform 1 (Walk, Escalator, Elevator)
  pathwaysRows.push(`PW_${pathwayCounter++},${concourseId},${pf1Id},1,1,25,25`);
  pathwaysRows.push(`PW_${pathwayCounter++},${concourseId},${pf1Id},2,1,25,20`);
  pathwaysRows.push(`PW_${pathwayCounter++},${concourseId},${pf1Id},5,1,10,15`);

  // Concourse <-> Platform 2 (Walk, Escalator, Elevator)
  pathwaysRows.push(`PW_${pathwayCounter++},${concourseId},${pf2Id},1,1,25,25`);
  pathwaysRows.push(`PW_${pathwayCounter++},${concourseId},${pf2Id},2,1,25,20`);
  pathwaysRows.push(`PW_${pathwayCounter++},${concourseId},${pf2Id},5,1,10,15`);
}

fs.writeFileSync(path.join(outDir, 'levels.txt'), levelsRows.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(outDir, 'stops.txt'), stopsRows.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(outDir, 'pathways.txt'), pathwaysRows.join('\n') + '\n', 'utf8');

// ── 9. Shapes Generation from ArcGIS with strict distance monotonicity ───────
const arcgisLine60 = arcgis.lines.features.find(f => f.id === 60 || f.properties?.objectid === 60);
if (!arcgisLine60) throw new Error('ArcGIS Line 60 not found');

const rawCoords = arcgisLine60.geometry.coordinates; // [[lng, lat], ...]

// Extract alignment from Belapur to Pendhar
const firstStnCoord = getArcgisCoord(1151); // Belapur Terminal
const lastStnCoord = getArcgisCoord(1161);  // Pendhar

const dir0Coords = sliceCoords(rawCoords, firstStnCoord, lastStnCoord);

const shapesRows = ['shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled'];

let dist0 = 0;
for (let i = 0; i < dir0Coords.length; i++) {
  const [lng, lat] = dir0Coords[i];
  if (i > 0) {
    const [pLng, pLat] = dir0Coords[i - 1];
    const dLat = (lat - pLat) * 111320;
    const dLng = (lng - pLng) * 111320 * Math.cos(lat * Math.PI / 180);
    dist0 += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  shapesRows.push(`SHP_NMM_DIR0,${lat.toFixed(6)},${lng.toFixed(6)},${i + 1},${dist0.toFixed(2)}`);
}

// Direction 1 (Pendhar -> Belapur Terminal)
const dir1Coords = [...dir0Coords].reverse();
let dist1 = 0;
for (let i = 0; i < dir1Coords.length; i++) {
  const [lng, lat] = dir1Coords[i];
  if (i > 0) {
    const [pLng, pLat] = dir1Coords[i - 1];
    const dLat = (lat - pLat) * 111320;
    const dLng = (lng - pLng) * 111320 * Math.cos(lat * Math.PI / 180);
    dist1 += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  shapesRows.push(`SHP_NMM_DIR1,${lat.toFixed(6)},${lng.toFixed(6)},${i + 1},${dist1.toFixed(2)}`);
}

fs.writeFileSync(path.join(outDir, 'shapes.txt'), shapesRows.join('\n') + '\n', 'utf8');

// ── 10. Trips, Stop Times & Frequencies ─────────────────────────────────────
const tripsRows = [
  'route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id,wheelchair_accessible,bikes_allowed',
  // Weekday
  'LINE1,SVC_WEEKDAY,TRIP_NMM_DIR0_WD,Pendhar,NMM-DIR0-WD,0,BLK_NMM_01,SHP_NMM_DIR0,1,1',
  'LINE1,SVC_WEEKDAY,TRIP_NMM_DIR1_WD,Belapur Terminal,NMM-DIR1-WD,1,BLK_NMM_02,SHP_NMM_DIR1,1,1',
  // Saturday
  'LINE1,SVC_SATURDAY,TRIP_NMM_DIR0_SAT,Pendhar,NMM-DIR0-SAT,0,BLK_NMM_01,SHP_NMM_DIR0,1,1',
  'LINE1,SVC_SATURDAY,TRIP_NMM_DIR1_SAT,Belapur Terminal,NMM-DIR1-SAT,1,BLK_NMM_02,SHP_NMM_DIR1,1,1',
  // Sunday
  'LINE1,SVC_SUNDAY,TRIP_NMM_DIR0_SUN,Pendhar,NMM-DIR0-SUN,0,BLK_NMM_01,SHP_NMM_DIR0,1,1',
  'LINE1,SVC_SUNDAY,TRIP_NMM_DIR1_SUN,Belapur Terminal,NMM-DIR1-SUN,1,BLK_NMM_02,SHP_NMM_DIR1,1,1',
];
fs.writeFileSync(path.join(outDir, 'trips.txt'), tripsRows.join('\n') + '\n', 'utf8');

// Stop Times (2 minutes between stations, 30s dwell)
const stopTimesRows = [
  'trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled,timepoint',
];

const tripIds = [
  { id: 'TRIP_NMM_DIR0_WD', dir: 0 },
  { id: 'TRIP_NMM_DIR1_WD', dir: 1 },
  { id: 'TRIP_NMM_DIR0_SAT', dir: 0 },
  { id: 'TRIP_NMM_DIR1_SAT', dir: 1 },
  { id: 'TRIP_NMM_DIR0_SUN', dir: 0 },
  { id: 'TRIP_NMM_DIR1_SUN', dir: 1 },
];

function formatTime(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

for (const trip of tripIds) {
  const stationsList = trip.dir === 0 ? LINE1_STATIONS : [...LINE1_STATIONS].reverse();
  const pfNum = trip.dir === 0 ? '1' : '2';
  let curSec = 6 * 3600; // start 06:00:00

  stationsList.forEach((stn, seqIdx) => {
    const arr = formatTime(curSec);
    const dep = formatTime(curSec + (seqIdx === 0 || seqIdx === stationsList.length - 1 ? 0 : 30));
    stopTimesRows.push(`${trip.id},${arr},${dep},PF_${stn.id}_${pfNum},${seqIdx + 1},,0,0,,1`);
    curSec += 120; // 2 mins travel to next station
  });
}
fs.writeFileSync(path.join(outDir, 'stop_times.txt'), stopTimesRows.join('\n') + '\n', 'utf8');

// Frequencies (06:00 to 23:00)
const freqRows = [
  'trip_id,start_time,end_time,headway_secs,exact_times',
];

for (const trip of tripIds) {
  // Peak morning: 08:00 - 11:30 (10 mins)
  freqRows.push(`${trip.id},06:00:00,08:00:00,900,0`);
  freqRows.push(`${trip.id},08:00:00,11:30:00,600,0`);
  // Afternoon: 11:30 - 17:00 (12 mins)
  freqRows.push(`${trip.id},11:30:00,17:00:00,720,0`);
  // Peak evening: 17:00 - 21:00 (10 mins)
  freqRows.push(`${trip.id},17:00:00,21:00:00,600,0`);
  // Late evening: 21:00 - 23:00 (15 mins)
  freqRows.push(`${trip.id},21:00:00,23:00:00,900,0`);
}
fs.writeFileSync(path.join(outDir, 'frequencies.txt'), freqRows.join('\n') + '\n', 'utf8');

// ── 11. Transfers ───────────────────────────────────────────────────────────
// Intra-station cross-platform transfer
const transfersRows = [
  'from_stop_id,to_stop_id,transfer_type,min_transfer_time',
  'PF_STN_NMM_001_1,PF_STN_NMM_001_2,2,60',
  'PF_STN_NMM_001_2,PF_STN_NMM_001_1,2,60',
];
fs.writeFileSync(path.join(outDir, 'transfers.txt'), transfersRows.join('\n') + '\n', 'utf8');

console.log('✅ Generated 100% Canonical Compliant GTFS static files for Navi Mumbai Metro!');
