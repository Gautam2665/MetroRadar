const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

console.log('================================================================');
console.log('🧹 STEP 1: CLEAN THE GTFS DISCRETE FEED (CANONICAL RESTORATION)');
console.log('================================================================\n');

const gtfsDir = path.resolve('datasets/mumbai/gtfs');
const mumbaiDir = path.resolve('datasets/mumbai');
const zipPath = path.join(mumbaiDir, 'mumbai_discrete_ready.zip');

// 1. Read existing stops.txt
const stopsPath = path.join(gtfsDir, 'stops.txt');
const stopsRaw = fs.readFileSync(stopsPath, 'utf8');
const lines = stopsRaw.split('\n').map(l => l.trim()).filter(Boolean);
const header = lines[0].split(',');

// Map column indices
const colMap = {};
header.forEach((h, i) => colMap[h.trim()] = i);

const rawRows = lines.slice(1).map(l => l.split(','));

// Collect valid parent stations (location_type = 1)
const parentStations = [];
const parentIds = new Set();

for (const cols of rawRows) {
  const locType = cols[colMap['location_type']]?.trim();
  const stopId = cols[colMap['stop_id']]?.trim();
  const stopName = cols[colMap['stop_name']]?.trim();
  const lat = cols[colMap['stop_lat']]?.trim();
  const lon = cols[colMap['stop_lon']]?.trim();
  const wheelchair = cols[colMap['wheelchair_boarding']]?.trim() || '1';

  if (locType === '1' && stopId && stopId.startsWith('STN_')) {
    parentStations.push({
      stop_id: stopId,
      stop_code: stopId.replace('STN_', ''),
      stop_name: stopName,
      stop_lat: lat,
      stop_lon: lon,
      location_type: '1',
      parent_station: '',
      wheelchair_boarding: wheelchair,
      platform_code: ''
    });
    parentIds.add(stopId);
  }
}

console.log(`1. Extracted ${parentStations.length} verified Parent Stations (location_type = 1).`);

// Collect verified boarding platforms (PF_STN_*) matching valid parent stations
// Read stop_times.txt to ensure platform is actively used in schedule
const stRaw = fs.readFileSync(path.join(gtfsDir, 'stop_times.txt'), 'utf8');
const usedStopIds = new Set();
stRaw.split('\n').slice(1).forEach(l => {
  const parts = l.split(',');
  if (parts.length > 3) {
    usedStopIds.add(parts[3].trim());
  }
});

const platformStops = [];
const platformIds = new Set();

for (const cols of rawRows) {
  const stopId = cols[colMap['stop_id']]?.trim();
  const parentId = cols[colMap['parent_station']]?.trim();
  const stopName = cols[colMap['stop_name']]?.trim();
  const lat = cols[colMap['stop_lat']]?.trim();
  const lon = cols[colMap['stop_lon']]?.trim();
  const platformCode = cols[colMap['platform_code']]?.trim() || '';
  const wheelchair = cols[colMap['wheelchair_boarding']]?.trim() || '1';

  // Only keep platforms that belong to a verified parent station and are used in stop_times
  if (stopId && stopId.startsWith('PF_STN_') && parentIds.has(parentId) && usedStopIds.has(stopId)) {
    platformStops.push({
      stop_id: stopId,
      stop_code: '',
      stop_name: stopName,
      stop_lat: lat,
      stop_lon: lon,
      location_type: '0',
      parent_station: parentId,
      wheelchair_boarding: wheelchair,
      platform_code: platformCode || (stopId.endsWith('_1') ? '1' : stopId.endsWith('_2') ? '2' : '')
    });
    platformIds.add(stopId);
  }
}

console.log(`2. Extracted ${platformStops.length} verified Boarding Platforms (location_type = 0).`);

// Combine clean stops: ONLY Parents (type 1) and Platforms (type 0)
const cleanStops = [...parentStations, ...platformStops];
cleanStops.sort((a, b) => a.stop_name.localeCompare(b.stop_name));

const cleanStopsCsvHeader = 'stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type,parent_station,wheelchair_boarding,platform_code';
const cleanStopsCsvRows = cleanStops.map(s => 
  `${s.stop_id},${s.stop_code},"${s.stop_name}",${s.stop_lat},${s.stop_lon},${s.location_type},${s.parent_station},${s.wheelchair_boarding},${s.platform_code}`
);
const cleanStopsCsv = [cleanStopsCsvHeader, ...cleanStopsCsvRows].join('\n') + '\n';

fs.writeFileSync(path.join(gtfsDir, 'stops.txt'), cleanStopsCsv, 'utf8');
fs.writeFileSync(path.join(mumbaiDir, 'stops.txt'), cleanStopsCsv, 'utf8');
console.log(`   ✔ Wrote ${cleanStops.length} canonical stops to stops.txt (ZERO synthetic location_type=2/3 nodes).`);

// 3. Build verified transfers.txt
const verifiedTransfers = [
  'from_stop_id,to_stop_id,transfer_type,min_transfer_time',

  // 1. Gundavali (Line 7) <-> Western Express Highway (Line 1): 180s (58m enclosed skybridge)
  'STN_L1_005,STN_L7_014,2,180',
  'STN_L7_014,STN_L1_005,2,180',
  'PF_STN_L1_005_1,PF_STN_L7_014_1,2,180',
  'PF_STN_L7_014_1,PF_STN_L1_005_1,2,180',
  'PF_STN_L1_005_1,PF_STN_L7_014_2,2,180',
  'PF_STN_L7_014_2,PF_STN_L1_005_1,2,180',
  'PF_STN_L1_005_2,PF_STN_L7_014_1,2,180',
  'PF_STN_L7_014_1,PF_STN_L1_005_2,2,180',
  'PF_STN_L1_005_2,PF_STN_L7_014_2,2,180',
  'PF_STN_L7_014_2,PF_STN_L1_005_2,2,180',

  // 2. Marol Naka (Line 1) <-> Marol Naka (Line 3): 240s
  'STN_L1_008,STN_L3_004,2,240',
  'STN_L3_004,STN_L1_008,2,240',
  'PF_STN_L1_008_1,PF_STN_L3_004_1,2,240',
  'PF_STN_L3_004_1,PF_STN_L1_008_1,2,240',
  'PF_STN_L1_008_1,PF_STN_L3_004_2,2,240',
  'PF_STN_L3_004_2,PF_STN_L1_008_1,2,240',
  'PF_STN_L1_008_2,PF_STN_L3_004_1,2,240',
  'PF_STN_L3_004_1,PF_STN_L1_008_2,2,240',
  'PF_STN_L1_008_2,PF_STN_L3_004_2,2,240',
  'PF_STN_L3_004_2,PF_STN_L1_008_2,2,240',

  // 3. Dahisar East (Line 2A) <-> Dahisar East (Line 7): 60s (seamless concourse / cross-platform)
  'STN_L2A_001,STN_L7_001,2,60',
  'STN_L7_001,STN_L2A_001,2,60',
  'PF_STN_L2A_001_1,PF_STN_L7_001_1,2,60',
  'PF_STN_L7_001_1,PF_STN_L2A_001_1,2,60',
  'PF_STN_L2A_001_1,PF_STN_L7_001_2,2,60',
  'PF_STN_L7_001_2,PF_STN_L2A_001_1,2,60',
  'PF_STN_L2A_001_2,PF_STN_L7_001_1,2,60',
  'PF_STN_L7_001_1,PF_STN_L2A_001_2,2,60',
  'PF_STN_L2A_001_2,PF_STN_L7_001_2,2,60',
  'PF_STN_L7_001_2,PF_STN_L2A_001_2,2,60',

  // 4. Andheri West (Line 2A) <-> D.N. Nagar (Line 1): 180s (mezzanine transfer)
  'STN_L1_002,STN_L2A_017,2,180',
  'STN_L2A_017,STN_L1_002,2,180',
  'PF_STN_L1_002_1,PF_STN_L2A_017_1,2,180',
  'PF_STN_L2A_017_1,PF_STN_L1_002_1,2,180',
  'PF_STN_L1_002_2,PF_STN_L2A_017_1,2,180',
  'PF_STN_L2A_017_1,PF_STN_L1_002_2,2,180',
  'PF_STN_L1_002_1,PF_STN_L2A_017_2,2,180',
  'PF_STN_L2A_017_2,PF_STN_L1_002_1,2,180',
  'PF_STN_L1_002_2,PF_STN_L2A_017_2,2,180',
  'PF_STN_L2A_017_2,PF_STN_L1_002_2,2,180'
];

const transfersCsv = verifiedTransfers.join('\n') + '\n';
fs.writeFileSync(path.join(gtfsDir, 'transfers.txt'), transfersCsv, 'utf8');
fs.writeFileSync(path.join(mumbaiDir, 'transfers.txt'), transfersCsv, 'utf8');
console.log(`3. Wrote ${verifiedTransfers.length - 1} verified transfer pairs to transfers.txt.`);

// 4. Repackage mumbai_discrete_ready.zip without synthetic pathways.txt or levels.txt
console.log('4. Rebuilding canonical GTFS zip archive...');
const cleanZip = new AdmZip();

// Required canonical GTFS files
const canonicalFiles = [
  'agency.txt',
  'stops.txt',
  'routes.txt',
  'trips.txt',
  'stop_times.txt',
  'calendar.txt',
  'shapes.txt',
  'transfers.txt',
  'feed_info.txt'
];

canonicalFiles.forEach(fileName => {
  const filePath = path.join(gtfsDir, fileName);
  if (fs.existsSync(filePath)) {
    cleanZip.addLocalFile(filePath, '', fileName);
    console.log(`   + Added ${fileName} (${fs.statSync(filePath).size} bytes)`);
  } else {
    console.warn(`   ⚠ Missing: ${fileName}`);
  }
});

cleanZip.writeZip(zipPath);
console.log(`   ✔ Repackaged: ${zipPath}`);

// Also clean up other zip packages
const otherZips = [
  path.join(mumbaiDir, 'mumbai-operational-gtfs.zip'),
  path.resolve('sample-data/mumbai/mumbai-metro-gtfs.zip')
];

otherZips.forEach(zp => {
  if (fs.existsSync(zp)) {
    const oz = new AdmZip();
    canonicalFiles.forEach(f => {
      const fp = path.join(gtfsDir, f);
      if (fs.existsSync(fp)) oz.addLocalFile(fp, '', f);
    });
    oz.writeZip(zp);
    console.log(`   ✔ Repackaged: ${zp}`);
  }
});

// 5. Verification Integrity Check
console.log('\n5. Running Strict GTFS Cross-Reference Audit:');
const checkStops = new Set();
const checkParents = new Set();
const stopFileLines = fs.readFileSync(path.join(gtfsDir, 'stops.txt'), 'utf8').split('\n').filter(Boolean);

stopFileLines.slice(1).forEach(l => {
  const parts = l.split(',');
  const id = parts[0];
  const type = parts[5];
  const parent = parts[6];
  checkStops.add(id);
  if (type === '1') checkParents.add(id);
});

let orphanStops = 0;
let invalidParents = 0;

stopFileLines.slice(1).forEach(l => {
  const parts = l.split(',');
  const id = parts[0];
  const type = parts[5];
  const parent = parts[6];

  if (type === '0') {
    if (!parent) {
      orphanStops++;
      console.error(`   ❌ Platform ${id} has no parent_station!`);
    } else if (!checkParents.has(parent)) {
      invalidParents++;
      console.error(`   ❌ Platform ${id} points to invalid parent: ${parent}`);
    }
  }
});

// Check transfers references
let invalidTransfers = 0;
verifiedTransfers.slice(1).forEach(l => {
  const [from, to] = l.split(',');
  if (!checkStops.has(from)) {
    invalidTransfers++;
    console.error(`   ❌ Transfer 'from' ${from} does not exist in stops.txt!`);
  }
  if (!checkStops.has(to)) {
    invalidTransfers++;
    console.error(`   ❌ Transfer 'to' ${to} does not exist in stops.txt!`);
  }
});

// Check stop_times references
let invalidStopTimes = 0;
usedStopIds.forEach(id => {
  if (!checkStops.has(id)) {
    invalidStopTimes++;
    console.error(`   ❌ stop_times references non-existent stop: ${id}`);
  }
});

console.log('------------------------------------------------------');
console.log(`Orphan stops count:              ${orphanStops}`);
console.log(`Invalid parent references count:  ${invalidParents}`);
console.log(`Invalid transfer references count: ${invalidTransfers}`);
console.log(`Invalid stop_times references:     ${invalidStopTimes}`);
console.log('------------------------------------------------------');

if (orphanStops === 0 && invalidParents === 0 && invalidTransfers === 0 && invalidStopTimes === 0) {
  console.log('🎉 100% CANONICAL GTFS INTEGRITY ACHIEVED — READY FOR VALIDATOR UPLOAD!');
} else {
  console.error('❌ VALIDATION ISSUES DETECTED');
}
