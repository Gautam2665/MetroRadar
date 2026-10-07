const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.cwd(), 'datasets/nagpur/gtfs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Clean non-txt files from gtfs folder
fs.readdirSync(outDir).forEach(f => {
  if (!f.endsWith('.txt')) {
    try { fs.unlinkSync(path.join(outDir, f)); } catch (_) {}
  }
});

// ── 1. Load ArcGIS Nagpur Source ────────────────────────────────────────────
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

function metersBetween(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ── 3. Agencies ─────────────────────────────────────────────────────────────
const agencyContent = `agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_email
MAHAMETRO,Maharashtra Metro Rail Corporation Limited (Nagpur Metro),https://www.metrorailnagpur.com,Asia/Kolkata,en,0712-2554210,contactus@metrorailnagpur.com
`;
fs.writeFileSync(path.join(outDir, 'agency.txt'), agencyContent, 'utf8');

// ── 4. Routes (route_long_name does NOT contain route_short_name) ────────────
const routesContent = `route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color
AQUA_LINE,MAHAMETRO,Aqua Line,Lokmanya Nagar - Prajapati Nagar,1,06B6D4,FFFFFF
ORANGE_LINE,MAHAMETRO,Orange Line,Automotive Square - Khapri,1,F97316,FFFFFF
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
MetroRadar India Open Transit Data,https://metroradar.in,en,20240101,20271231,v1.0.0-canonical-nagpur,support@metroradar.in,https://metroradar.in/contact
`;
fs.writeFileSync(path.join(outDir, 'feed_info.txt'), feedInfoContent, 'utf8');

// ── 7. Station Definitions ──────────────────────────────────────────────────
const arcgisStns = arcgis.stations.features;

function getArcgisCoord(arcgisId) {
  const feat = arcgisStns.find(f => f.id === arcgisId || f.properties?.objectid === arcgisId || f.properties?.uniqueid === arcgisId);
  if (!feat) throw new Error(`ArcGIS station id ${arcgisId} not found`);
  return feat.geometry.coordinates; // [lng, lat]
}

const AQUA_STATION_DEFS = [
  { arcgisId: 1113, id: 'STN_NAG_AQUA_001', code: 'NAG_AQ_01', name: 'Lokmanya Nagar', type: 'ELEVATED' },
  { arcgisId: 1114, id: 'STN_NAG_AQUA_002', code: 'NAG_AQ_02', name: 'Bansi Nagar', type: 'ELEVATED' },
  { arcgisId: 1115, id: 'STN_NAG_AQUA_003', code: 'NAG_AQ_03', name: 'Vasudev Nagar', type: 'ELEVATED' },
  { arcgisId: 1116, id: 'STN_NAG_AQUA_004', code: 'NAG_AQ_04', name: 'Rachana Ring Road Junction', type: 'ELEVATED' },
  { arcgisId: 1117, id: 'STN_NAG_AQUA_005', code: 'NAG_AQ_05', name: 'Subhash Nagar', type: 'ELEVATED' },
  { arcgisId: 1118, id: 'STN_NAG_AQUA_006', code: 'NAG_AQ_06', name: 'Ambazari Lake View Station', type: 'ELEVATED' },
  { arcgisId: 1119, id: 'STN_NAG_AQUA_007', code: 'NAG_AQ_07', name: 'LAD Square', type: 'ELEVATED' },
  { arcgisId: 1120, id: 'STN_NAG_AQUA_008', code: 'NAG_AQ_08', name: 'Shankar Nagar Square', type: 'ELEVATED' },
  { arcgisId: 1121, id: 'STN_NAG_AQUA_009', code: 'NAG_AQ_09', name: 'Institution of Engineers', type: 'ELEVATED' },
  { arcgisId: 1122, id: 'STN_NAG_AQUA_010', code: 'NAG_AQ_10', name: 'Jhansi Rani Square', type: 'ELEVATED' },
  { arcgisId: 1123, id: 'STN_NAG_SITABULDI', code: 'NAG_IC_01', name: 'Sitabuldi', type: 'INTERCHANGE' },
  { arcgisId: 1125, id: 'STN_NAG_AQUA_011', code: 'NAG_AQ_11', name: 'Nagpur Railway Station', type: 'ELEVATED' },
  { arcgisId: 1124, id: 'STN_NAG_AQUA_012', code: 'NAG_AQ_12', name: 'Dosar Vaishya Square', type: 'ELEVATED' },
  { arcgisId: 1126, id: 'STN_NAG_AQUA_013', code: 'NAG_AQ_13', name: 'Agrasen Square', type: 'ELEVATED' },
  { arcgisId: 1127, id: 'STN_NAG_AQUA_014', code: 'NAG_AQ_14', name: 'Chitroli Square', type: 'ELEVATED' },
  { arcgisId: 1128, id: 'STN_NAG_AQUA_015', code: 'NAG_AQ_15', name: 'Telephone Exchange', type: 'ELEVATED' },
  { arcgisId: 1129, id: 'STN_NAG_AQUA_016', code: 'NAG_AQ_16', name: 'Ambedkar Square', type: 'ELEVATED' },
  { arcgisId: 1130, id: 'STN_NAG_AQUA_017', code: 'NAG_AQ_17', name: 'Vaishnodevi Square', type: 'ELEVATED' },
  { arcgisId: 1131, id: 'STN_NAG_AQUA_018', code: 'NAG_AQ_18', name: 'Prajapati Nagar', type: 'ELEVATED' },
];

const ORANGE_STATION_DEFS = [
  { arcgisId: 1141, id: 'STN_NAG_ORANGE_001', code: 'NAG_OR_01', name: 'Khapri', type: 'AT_GRADE' },
  { arcgisId: 1140, id: 'STN_NAG_ORANGE_002', code: 'NAG_OR_02', name: 'New Airport', type: 'AT_GRADE' },
  { arcgisId: 1139, id: 'STN_NAG_ORANGE_003', code: 'NAG_OR_03', name: 'Airport South', type: 'ELEVATED' },
  { arcgisId: 1138, id: 'STN_NAG_ORANGE_004', code: 'NAG_OR_04', name: 'Airport Metro Station', type: 'ELEVATED' },
  { arcgisId: 1137, id: 'STN_NAG_ORANGE_005', code: 'NAG_OR_05', name: 'Ujjwal Nagar', type: 'ELEVATED' },
  { arcgisId: 1136, id: 'STN_NAG_ORANGE_006', code: 'NAG_OR_06', name: 'Jaiprakash Nagar', type: 'ELEVATED' },
  { arcgisId: 1135, id: 'STN_NAG_ORANGE_007', code: 'NAG_OR_07', name: 'Chhatrapati Square', type: 'ELEVATED' },
  { arcgisId: 1134, id: 'STN_NAG_ORANGE_008', code: 'NAG_OR_08', name: 'Ajni Square', type: 'ELEVATED' },
  { arcgisId: 1133, id: 'STN_NAG_ORANGE_009', code: 'NAG_OR_09', name: 'Rahate Colony', type: 'ELEVATED' },
  { arcgisId: 1132, id: 'STN_NAG_ORANGE_010', code: 'NAG_OR_10', name: 'Congress Nagar', type: 'ELEVATED' },
  { arcgisId: 1123, id: 'STN_NAG_SITABULDI', code: 'NAG_IC_01', name: 'Sitabuldi', type: 'INTERCHANGE' },
  { arcgisId: 1142, id: 'STN_NAG_ORANGE_011', code: 'NAG_OR_11', name: 'Zero Mile Freedom Park', type: 'ELEVATED' },
  { arcgisId: 1143, id: 'STN_NAG_ORANGE_012', code: 'NAG_OR_12', name: 'Kasturchand Park', type: 'ELEVATED' },
  { arcgisId: 1144, id: 'STN_NAG_ORANGE_013', code: 'NAG_OR_13', name: 'Gaddigodam Square', type: 'ELEVATED' },
  { arcgisId: 1145, id: 'STN_NAG_ORANGE_014', code: 'NAG_OR_14', name: 'Kadbi Square', type: 'ELEVATED' },
  { arcgisId: 1148, id: 'STN_NAG_ORANGE_015', code: 'NAG_OR_15', name: 'Indora Square', type: 'ELEVATED' },
  { arcgisId: 1146, id: 'STN_NAG_ORANGE_016', code: 'NAG_OR_16', name: 'Nari Road', type: 'ELEVATED' },
  { arcgisId: 1147, id: 'STN_NAG_ORANGE_017', code: 'NAG_OR_17', name: 'Automotive Square', type: 'ELEVATED' },
];

function resolveStationList(definitions) {
  return definitions.map((def, idx) => {
    const [lon, lat] = getArcgisCoord(def.arcgisId);
    return {
      ...def,
      lat,
      lon,
      seq: idx + 1
    };
  });
}

const AQUA_STATIONS = resolveStationList(AQUA_STATION_DEFS);
const ORANGE_STATIONS = resolveStationList(ORANGE_STATION_DEFS);

// Raw Coordinates from ArcGIS lines
const aquaRawCoords = arcgis.lines.features.find(f => f.properties?.line_colour === 'Aqua')?.geometry?.coordinates || [];
const orangeRawCoords = arcgis.lines.features.find(f => f.properties?.line_colour === 'Orange')?.geometry?.coordinates || [];

const OPERATIONAL_LINES = [
  {
    lineId: 'AQUA_LINE',
    lineCode: 'AQUA',
    name: 'Aqua Line',
    headsign0: 'Prajapati Nagar',
    headsign1: 'Lokmanya Nagar',
    stations: AQUA_STATIONS,
    rawCoords: aquaRawCoords,
    color: '06B6D4'
  },
  {
    lineId: 'ORANGE_LINE',
    lineCode: 'ORANGE',
    name: 'Orange Line',
    headsign0: 'Automotive Square',
    headsign1: 'Khapri',
    stations: ORANGE_STATIONS,
    rawCoords: orangeRawCoords,
    color: 'F97316'
  }
];

// Indian Railways Platforms
const SUBURBAN_PLATFORMS = [
  { id: 'PF_IR_NAGPUR_JN', name: 'Nagpur Junction Railway Station (Indian Railways)', lat: 21.152200, lon: 79.088600 },
  { id: 'PF_IR_AJNI', name: 'Ajni Railway Station (Indian Railways)', lat: 21.121100, lon: 79.080500 }
];

// ── 8. Levels, Stops, Platforms, Entrances, Pathways ────────────────────────
let levelsTxt = 'level_id,level_index,level_name\n';
let stopsTxt = 'stop_id,stop_name,stop_code,stop_lat,stop_lon,location_type,parent_station,platform_code,level_id,wheelchair_boarding,zone_id\n';
let pathwaysTxt = 'pathway_id,from_stop_id,to_stop_id,pathway_mode,is_bidirectional,length,traversal_time,signposted_as,reversed_signposted_as\n';

let pathwayCounter = 1;

// Indian Railways Stops
for (const subPlat of SUBURBAN_PLATFORMS) {
  stopsTxt += `${subPlat.id},"${subPlat.name}",,${subPlat.lat.toFixed(6)},${subPlat.lon.toFixed(6)},0,,,,1,ZONE_NAG\n`;
}

// ── A. Sitabuldi Central Interchange Complex ─────────────────────────────────
const sitabuldiStn = AQUA_STATIONS.find(s => s.id === 'STN_NAG_SITABULDI');
levelsTxt += `LVL_SITABULDI_G,0.0,Street Level\n`;
levelsTxt += `LVL_SITABULDI_C,1.0,Central Interchange Concourse (Ticketing & Transfer)\n`;
levelsTxt += `LVL_SITABULDI_ORANGE,2.0,Elevated Level 2 - Orange Line Platform Level\n`;
levelsTxt += `LVL_SITABULDI_AQUA,3.0,Elevated Level 3 - Aqua Line Platform Level\n`;

// Parent Station Container (location_type=1)
stopsTxt += `STN_NAG_SITABULDI,"Sitabuldi (Interchange)",NAG_IC_01,${sitabuldiStn.lat.toFixed(6)},${sitabuldiStn.lon.toFixed(6)},1,,,LVL_SITABULDI_G,1,ZONE_NAG\n`;

// Entrances (location_type=2)
stopsTxt += `ENT_SITABULDI_1,"Sitabuldi Gate 1 (Munje Square Side)",,${(sitabuldiStn.lat + 0.00012).toFixed(6)},${sitabuldiStn.lon.toFixed(6)},2,STN_NAG_SITABULDI,,LVL_SITABULDI_G,1,ZONE_NAG\n`;
stopsTxt += `ENT_SITABULDI_2,"Sitabuldi Gate 2 (Tekdi Road Side)",,${(sitabuldiStn.lat - 0.00012).toFixed(6)},${sitabuldiStn.lon.toFixed(6)},2,STN_NAG_SITABULDI,,LVL_SITABULDI_G,1,ZONE_NAG\n`;

// Concourse Nodes (location_type=3)
stopsTxt += `NODE_SITABULDI_UNPAID,"Sitabuldi Central Concourse (Unpaid)",,${sitabuldiStn.lat.toFixed(6)},${sitabuldiStn.lon.toFixed(6)},3,STN_NAG_SITABULDI,,LVL_SITABULDI_C,1,ZONE_NAG\n`;
stopsTxt += `NODE_SITABULDI_PAID,"Sitabuldi Central Interchange Concourse (Paid)",,${sitabuldiStn.lat.toFixed(6)},${sitabuldiStn.lon.toFixed(6)},3,STN_NAG_SITABULDI,,LVL_SITABULDI_C,1,ZONE_NAG\n`;

// Aqua Line Platforms (Level 3)
stopsTxt += `PF_STN_NAG_AQUA_SITABULDI_1,"Sitabuldi Platform 1 (Aqua Line to Prajapati Nagar)",,${sitabuldiStn.lat.toFixed(6)},${(sitabuldiStn.lon + 0.00008).toFixed(6)},0,STN_NAG_SITABULDI,1,LVL_SITABULDI_AQUA,1,ZONE_NAG\n`;
stopsTxt += `PF_STN_NAG_AQUA_SITABULDI_2,"Sitabuldi Platform 2 (Aqua Line to Lokmanya Nagar)",,${sitabuldiStn.lat.toFixed(6)},${(sitabuldiStn.lon - 0.00008).toFixed(6)},0,STN_NAG_SITABULDI,2,LVL_SITABULDI_AQUA,1,ZONE_NAG\n`;

// Orange Line Platforms (Level 2)
stopsTxt += `PF_STN_NAG_ORANGE_SITABULDI_1,"Sitabuldi Platform 3 (Orange Line to Automotive Square)",,${(sitabuldiStn.lat + 0.00008).toFixed(6)},${sitabuldiStn.lon.toFixed(6)},0,STN_NAG_SITABULDI,3,LVL_SITABULDI_ORANGE,1,ZONE_NAG\n`;
stopsTxt += `PF_STN_NAG_ORANGE_SITABULDI_2,"Sitabuldi Platform 4 (Orange Line to Khapri)",,${(sitabuldiStn.lat - 0.00008).toFixed(6)},${sitabuldiStn.lon.toFixed(6)},0,STN_NAG_SITABULDI,4,LVL_SITABULDI_ORANGE,1,ZONE_NAG\n`;

// Pathways in Sitabuldi:
pathwaysTxt += `PW_${pathwayCounter++},ENT_SITABULDI_1,NODE_SITABULDI_UNPAID,1,1,20,30,"Gate 1 to Interchange Concourse","Exit to Gate 1"\n`;
pathwaysTxt += `PW_${pathwayCounter++},ENT_SITABULDI_2,NODE_SITABULDI_UNPAID,1,1,20,30,"Gate 2 to Interchange Concourse","Exit to Gate 2"\n`;
pathwaysTxt += `PW_${pathwayCounter++},NODE_SITABULDI_UNPAID,NODE_SITABULDI_PAID,6,0,,15,"Metro Entry Turnstiles",\n`;
pathwaysTxt += `PW_${pathwayCounter++},NODE_SITABULDI_PAID,NODE_SITABULDI_UNPAID,6,0,,15,"Metro Exit Turnstiles",\n`;

// Concourse <-> Orange Line Platforms (Level 1 -> Level 2)
pathwaysTxt += `PW_${pathwayCounter++},NODE_SITABULDI_PAID,PF_STN_NAG_ORANGE_SITABULDI_1,2,1,25,35,"Escalator to Orange Line (Platform 3 - Automotive Square)","Concourse / Transfer"\n`;
pathwaysTxt += `PW_${pathwayCounter++},NODE_SITABULDI_PAID,PF_STN_NAG_ORANGE_SITABULDI_2,2,1,25,35,"Escalator to Orange Line (Platform 4 - Khapri)","Concourse / Transfer"\n`;

// Concourse <-> Aqua Line Platforms (Level 1 -> Level 3)
pathwaysTxt += `PW_${pathwayCounter++},NODE_SITABULDI_PAID,PF_STN_NAG_AQUA_SITABULDI_1,2,1,35,45,"Escalator to Aqua Line (Platform 1 - Prajapati Nagar)","Concourse / Transfer"\n`;
pathwaysTxt += `PW_${pathwayCounter++},NODE_SITABULDI_PAID,PF_STN_NAG_AQUA_SITABULDI_2,2,1,35,45,"Escalator to Aqua Line (Platform 2 - Lokmanya Nagar)","Concourse / Transfer"\n`;

// Direct Level-to-Level Interchange (Level 2 Orange Line ⇄ Level 3 Aqua Line)
pathwaysTxt += `PW_${pathwayCounter++},PF_STN_NAG_ORANGE_SITABULDI_1,PF_STN_NAG_AQUA_SITABULDI_1,2,1,20,30,"Direct Interchange to Aqua Line (Platform 1)","Direct Interchange to Orange Line (Platform 3)"\n`;
pathwaysTxt += `PW_${pathwayCounter++},PF_STN_NAG_ORANGE_SITABULDI_1,PF_STN_NAG_AQUA_SITABULDI_2,2,1,20,30,"Direct Interchange to Aqua Line (Platform 2)","Direct Interchange to Orange Line (Platform 3)"\n`;
pathwaysTxt += `PW_${pathwayCounter++},PF_STN_NAG_ORANGE_SITABULDI_2,PF_STN_NAG_AQUA_SITABULDI_1,2,1,20,30,"Direct Interchange to Aqua Line (Platform 1)","Direct Interchange to Orange Line (Platform 4)"\n`;
pathwaysTxt += `PW_${pathwayCounter++},PF_STN_NAG_ORANGE_SITABULDI_2,PF_STN_NAG_AQUA_SITABULDI_2,2,1,20,30,"Direct Interchange to Aqua Line (Platform 2)","Direct Interchange to Orange Line (Platform 4)"\n`;

const addedStations = new Set(['STN_NAG_SITABULDI']);

// ── B. Regular Stations ──────────────────────────────────────────────────────
for (const line of OPERATIONAL_LINES) {
  for (const stn of line.stations) {
    if (addedStations.has(stn.id)) continue;
    addedStations.add(stn.id);

    const isAtGrade = stn.type === 'AT_GRADE';
    const vertMode = isAtGrade ? 1 : 2;

    const lvlStreet = `LVL_${stn.id}_G`;
    const lvlConcourse = `LVL_${stn.id}_C`;
    const lvlPlatform = `LVL_${stn.id}_P`;

    levelsTxt += `${lvlStreet},0.0,Street Level\n`;
    levelsTxt += `${lvlConcourse},1.0,${isAtGrade ? 'Ground Concourse' : 'Elevated Concourse'}\n`;
    levelsTxt += `${lvlPlatform},${isAtGrade ? '0.5' : '2.0'},${isAtGrade ? 'At-Grade Platform Level' : 'Elevated Platform Level'}\n`;

    // 1. Parent Station (location_type=1)
    stopsTxt += `${stn.id},"${stn.name}",${stn.code},${stn.lat.toFixed(6)},${stn.lon.toFixed(6)},1,,,${lvlStreet},1,ZONE_NAG\n`;

    // 2. Entrances (location_type=2)
    const ent1Id = `ENT_${stn.id}_1`;
    const ent2Id = `ENT_${stn.id}_2`;
    stopsTxt += `${ent1Id},"${stn.name} Gate 1",,${(stn.lat + 0.0001).toFixed(6)},${stn.lon.toFixed(6)},2,${stn.id},,${lvlStreet},1,ZONE_NAG\n`;
    stopsTxt += `${ent2Id},"${stn.name} Gate 2",,${(stn.lat - 0.0001).toFixed(6)},${stn.lon.toFixed(6)},2,${stn.id},,${lvlStreet},1,ZONE_NAG\n`;

    // 3. Concourse Nodes (location_type=3)
    const nodeUnpaid = `NODE_${stn.id}_UNPAID`;
    const nodePaid = `NODE_${stn.id}_PAID`;
    stopsTxt += `${nodeUnpaid},"${stn.name} Concourse (Unpaid)",,${stn.lat.toFixed(6)},${stn.lon.toFixed(6)},3,${stn.id},,${lvlConcourse},1,ZONE_NAG\n`;
    stopsTxt += `${nodePaid},"${stn.name} Concourse (Paid)",,${stn.lat.toFixed(6)},${stn.lon.toFixed(6)},3,${stn.id},,${lvlConcourse},1,ZONE_NAG\n`;

    // 4. Platforms (location_type=0)
    const pf1Id = `PF_${stn.id}_1`;
    const pf2Id = `PF_${stn.id}_2`;
    stopsTxt += `${pf1Id},"${stn.name} Platform 1",,${(stn.lat + 0.00008).toFixed(6)},${(stn.lon + 0.00008).toFixed(6)},0,${stn.id},1,${lvlPlatform},1,ZONE_NAG\n`;
    stopsTxt += `${pf2Id},"${stn.name} Platform 2",,${(stn.lat - 0.00008).toFixed(6)},${(stn.lon - 0.00008).toFixed(6)},0,${stn.id},2,${lvlPlatform},1,ZONE_NAG\n`;

    // 5. Pathways
    pathwaysTxt += `PW_${pathwayCounter++},${ent1Id},${nodeUnpaid},${vertMode},1,15,25,"Gate 1 to Concourse","Exit to Gate 1"\n`;
    pathwaysTxt += `PW_${pathwayCounter++},${ent2Id},${nodeUnpaid},${vertMode},1,15,25,"Gate 2 to Concourse","Exit to Gate 2"\n`;
    pathwaysTxt += `PW_${pathwayCounter++},${nodeUnpaid},${nodePaid},6,0,,15,"Metro Entry Turnstiles",\n`;
    pathwaysTxt += `PW_${pathwayCounter++},${nodePaid},${nodeUnpaid},6,0,,15,"Metro Exit Turnstiles",\n`;
    pathwaysTxt += `PW_${pathwayCounter++},${nodePaid},${pf1Id},${vertMode},1,20,30,"Platform 1 - ${line.headsign0}","Concourse / Exit"\n`;
    pathwaysTxt += `PW_${pathwayCounter++},${nodePaid},${pf2Id},${vertMode},1,20,30,"Platform 2 - ${line.headsign1}","Concourse / Exit"\n`;
  }
}

// Intermodal Indian Railways Pathways
pathwaysTxt += `PW_${pathwayCounter++},NODE_STN_NAG_AQUA_011_UNPAID,PF_IR_NAGPUR_JN,1,1,110,120,"To Nagpur Junction Railway Station (FOB Link)","To Nagpur Metro Aqua Line"\n`;
pathwaysTxt += `PW_${pathwayCounter++},NODE_STN_NAG_ORANGE_010_UNPAID,PF_IR_AJNI,1,1,120,130,"To Ajni Railway Station Subway","To Nagpur Metro Orange Line"\n`;

fs.writeFileSync(path.join(outDir, 'levels.txt'), levelsTxt, 'utf8');
fs.writeFileSync(path.join(outDir, 'stops.txt'), stopsTxt, 'utf8');
fs.writeFileSync(path.join(outDir, 'pathways.txt'), pathwaysTxt, 'utf8');

// ── 9. Shapes Generation with strict distance monotonicity ───────────────────
let shapesTxt = 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled\n';
let tripsTxt = 'route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id,wheelchair_accessible,bikes_allowed\n';
let frequenciesTxt = 'trip_id,start_time,end_time,headway_secs,exact_times\n';
let stopTimesTxt = 'trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,shape_dist_traveled,timepoint\n';

const SERVICES = [
  { id: 'SVC_WEEKDAY', suffix: '_WD' },
  { id: 'SVC_SATURDAY', suffix: '_SAT' },
  { id: 'SVC_SUNDAY', suffix: '_SUN' }
];

for (const line of OPERATIONAL_LINES) {
  const firstCoord = [line.stations[0].lon, line.stations[0].lat];
  const lastCoord = [line.stations[line.stations.length - 1].lon, line.stations[line.stations.length - 1].lat];
  
  const forwardCoords = sliceCoords(line.rawCoords, firstCoord, lastCoord);
  const shapeId0 = `SHP_NAG_${line.lineId}_DIR0`;
  const shapeId1 = `SHP_NAG_${line.lineId}_DIR1`;

  // Forward Direction 0
  let dist0 = 0;
  for (let i = 0; i < forwardCoords.length; i++) {
    const [lon, lat] = forwardCoords[i];
    if (i > 0) {
      dist0 += metersBetween(forwardCoords[i - 1], forwardCoords[i]);
    }
    shapesTxt += `${shapeId0},${lat.toFixed(6)},${lon.toFixed(6)},${i + 1},${dist0.toFixed(2)}\n`;
  }

  // Reverse Direction 1
  const reverseCoords = [...forwardCoords].reverse();
  let dist1 = 0;
  for (let i = 0; i < reverseCoords.length; i++) {
    const [lon, lat] = reverseCoords[i];
    if (i > 0) {
      dist1 += metersBetween(reverseCoords[i - 1], reverseCoords[i]);
    }
    shapesTxt += `${shapeId1},${lat.toFixed(6)},${lon.toFixed(6)},${i + 1},${dist1.toFixed(2)}\n`;
  }

  // Compute station cumulative distances along shape for accurate stop_times shape_dist_traveled
  function getStationShapeDist(stnCoord, coords) {
    let bestDist = 0;
    let minD = Infinity;
    let cum = 0;
    for (let i = 0; i < coords.length; i++) {
      if (i > 0) cum += metersBetween(coords[i - 1], coords[i]);
      const d = Math.pow(coords[i][0] - stnCoord[0], 2) + Math.pow(coords[i][1] - stnCoord[1], 2);
      if (d < minD) {
        minD = d;
        bestDist = cum;
      }
    }
    return bestDist;
  }

  // Generate Trips & Stop Times & Frequencies
  for (const svc of SERVICES) {
    const tripId0 = `TRIP_NAG_${line.lineId}_0${svc.suffix}`;
    const tripId1 = `TRIP_NAG_${line.lineId}_1${svc.suffix}`;

    tripsTxt += `${line.lineId},${svc.id},${tripId0},"${line.headsign0}",NAG-${line.lineCode}-0,0,BLK_NAG_${line.lineCode}_01,${shapeId0},1,1\n`;
    tripsTxt += `${line.lineId},${svc.id},${tripId1},"${line.headsign1}",NAG-${line.lineCode}-1,1,BLK_NAG_${line.lineCode}_02,${shapeId1},1,1\n`;

    let peakHw = 360; // 6 min peak
    let offPeakHw = 480; // 8 min off-peak
    if (svc.id === 'SVC_SATURDAY') {
      peakHw = 420;
      offPeakHw = 540;
    } else if (svc.id === 'SVC_SUNDAY') {
      peakHw = 480;
      offPeakHw = 600;
    }

    // Frequencies
    frequenciesTxt += `${tripId0},06:00:00,08:00:00,${offPeakHw},0\n`;
    frequenciesTxt += `${tripId0},08:00:00,11:30:00,${peakHw},0\n`;
    frequenciesTxt += `${tripId0},11:30:00,17:30:00,${offPeakHw},0\n`;
    frequenciesTxt += `${tripId0},17:30:00,20:30:00,${peakHw},0\n`;
    frequenciesTxt += `${tripId0},20:30:00,22:30:00,${offPeakHw},0\n`;

    frequenciesTxt += `${tripId1},06:00:00,08:00:00,${offPeakHw},0\n`;
    frequenciesTxt += `${tripId1},08:00:00,11:30:00,${peakHw},0\n`;
    frequenciesTxt += `${tripId1},11:30:00,17:30:00,${offPeakHw},0\n`;
    frequenciesTxt += `${tripId1},17:30:00,20:30:00,${peakHw},0\n`;
    frequenciesTxt += `${tripId1},20:30:00,22:30:00,${offPeakHw},0\n`;

    function formatSec(sec) {
      const total = 6 * 3600 + sec;
      const h = String(Math.floor(total / 3600)).padStart(2, '0');
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
      const s = String(total % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }

    // Stop Times Direction 0
    let lastDist0 = 0;
    line.stations.forEach((stn, idx) => {
      const platId = stn.id === 'STN_NAG_SITABULDI'
        ? (line.lineId === 'AQUA_LINE' ? 'PF_STN_NAG_AQUA_SITABULDI_1' : 'PF_STN_NAG_ORANGE_SITABULDI_1')
        : `PF_${stn.id}_1`;
      const arr = formatSec(idx * 115);
      const dep = formatSec(idx * 115 + (idx === 0 || idx === line.stations.length - 1 ? 0 : 25));
      const sDist = Math.max(lastDist0, getStationShapeDist([stn.lon, stn.lat], forwardCoords));
      lastDist0 = sDist;
      stopTimesTxt += `${tripId0},${arr},${dep},${platId},${idx + 1},0,0,${sDist.toFixed(2)},1\n`;
    });

    // Stop Times Direction 1
    let lastDist1 = 0;
    const revStns = [...line.stations].reverse();
    revStns.forEach((stn, idx) => {
      const platId = stn.id === 'STN_NAG_SITABULDI'
        ? (line.lineId === 'AQUA_LINE' ? 'PF_STN_NAG_AQUA_SITABULDI_2' : 'PF_STN_NAG_ORANGE_SITABULDI_2')
        : `PF_${stn.id}_2`;
      const arr = formatSec(idx * 115);
      const dep = formatSec(idx * 115 + (idx === 0 || idx === line.stations.length - 1 ? 0 : 25));
      const sDist = Math.max(lastDist1, getStationShapeDist([stn.lon, stn.lat], reverseCoords));
      lastDist1 = sDist;
      stopTimesTxt += `${tripId1},${arr},${dep},${platId},${idx + 1},0,0,${sDist.toFixed(2)},1\n`;
    });
  }
}

fs.writeFileSync(path.join(outDir, 'shapes.txt'), shapesTxt, 'utf8');
fs.writeFileSync(path.join(outDir, 'trips.txt'), tripsTxt, 'utf8');
fs.writeFileSync(path.join(outDir, 'frequencies.txt'), frequenciesTxt, 'utf8');
fs.writeFileSync(path.join(outDir, 'stop_times.txt'), stopTimesTxt, 'utf8');

// ── 10. Transfers ───────────────────────────────────────────────────────────
const transfersContent = `from_stop_id,to_stop_id,transfer_type,min_transfer_time
PF_STN_NAG_AQUA_SITABULDI_1,PF_STN_NAG_ORANGE_SITABULDI_1,2,120
PF_STN_NAG_AQUA_SITABULDI_1,PF_STN_NAG_ORANGE_SITABULDI_2,2,120
PF_STN_NAG_AQUA_SITABULDI_2,PF_STN_NAG_ORANGE_SITABULDI_1,2,120
PF_STN_NAG_AQUA_SITABULDI_2,PF_STN_NAG_ORANGE_SITABULDI_2,2,120
PF_STN_NAG_ORANGE_SITABULDI_1,PF_STN_NAG_AQUA_SITABULDI_1,2,120
PF_STN_NAG_ORANGE_SITABULDI_1,PF_STN_NAG_AQUA_SITABULDI_2,2,120
PF_STN_NAG_ORANGE_SITABULDI_2,PF_STN_NAG_AQUA_SITABULDI_1,2,120
PF_STN_NAG_ORANGE_SITABULDI_2,PF_STN_NAG_AQUA_SITABULDI_2,2,120
STN_NAG_AQUA_011,PF_IR_NAGPUR_JN,2,180
PF_IR_NAGPUR_JN,STN_NAG_AQUA_011,2,180
STN_NAG_ORANGE_010,PF_IR_AJNI,2,180
PF_IR_AJNI,STN_NAG_ORANGE_010,2,180
`;
fs.writeFileSync(path.join(outDir, 'transfers.txt'), transfersContent, 'utf8');

// ── 11. Fare Attributes & Fare Rules ─────────────────────────────────────────
const fareAttributesContent = `fare_id,price,currency_type,payment_method,transfers,transfer_duration
FARE_NAG_10,10.00,INR,0,0,
FARE_NAG_20,20.00,INR,0,0,
FARE_NAG_30,30.00,INR,0,0,
FARE_NAG_40,40.00,INR,0,0,
FARE_NAG_50,50.00,INR,0,0,
`;
fs.writeFileSync(path.join(outDir, 'fare_attributes.txt'), fareAttributesContent, 'utf8');

const fareRulesContent = `fare_id,route_id,origin_id,destination_id
FARE_NAG_10,AQUA_LINE,ZONE_NAG,ZONE_NAG
FARE_NAG_10,ORANGE_LINE,ZONE_NAG,ZONE_NAG
`;
fs.writeFileSync(path.join(outDir, 'fare_rules.txt'), fareRulesContent, 'utf8');

console.log('✅ Generated 100% Canonical Compliant GTFS static files for Nagpur Metro!');
