const fs = require('fs');
const path = require('path');

const arcgisPath = path.resolve(process.cwd(), 'datasets/mumbai/sources/gis/arcgis-mumbai.json');
const arcgis = JSON.parse(fs.readFileSync(arcgisPath, 'utf8'));

// 1. Line 2B Feature 54 (464 shape coordinates)
const l2bFeature = (arcgis.lines?.features || []).find(f => f.id === 54 || f.properties?.objectid === 54);
if (!l2bFeature) {
  throw new Error('ArcGIS feature 54 for Line 2B not found!');
}

const fullCoords = l2bFeature.geometry.coordinates; // [lng, lat]
console.log('Loaded Line 2B ArcGIS shape points:', fullCoords.length);

// 2. Verified 22 stations of Line 2B from Mandale (East) to Andheri West (West)
const ALL_L2B_STATIONS = [
  { id: 'STN_L2B_001', name: 'Mandale Depot', lat: 19.043512, lon: 72.931254, isOperational: true },
  { id: 'STN_L2B_002', name: 'Mankhurd', lat: 19.047120, lon: 72.923410, isOperational: true },
  { id: 'STN_L2B_003', name: 'BSNL', lat: 19.048210, lon: 72.915120, isOperational: true },
  { id: 'STN_L2B_004', name: 'Shivaji Chowk', lat: 19.047945, lon: 72.906864, isOperational: true },
  { id: 'STN_L2B_005', name: 'Diamond Garden', lat: 19.051858, lon: 72.901486, isOperational: true },
  { id: 'STN_L2B_006', name: 'Chembur', lat: 19.053934, lon: 72.892644, isOperational: false },
  { id: 'STN_L2B_007', name: 'Eastern Express Highway', lat: 19.057120, lon: 72.884120, isOperational: false },
  { id: 'STN_L2B_008', name: 'Kurla East', lat: 19.061200, lon: 72.878100, isOperational: false },
  { id: 'STN_L2B_009', name: 'SG Barve Marg', lat: 19.063410, lon: 72.872340, isOperational: false },
  { id: 'STN_L2B_010', name: 'Kurla Terminus', lat: 19.065120, lon: 72.865410, isOperational: false },
  { id: 'STN_L2B_011', name: 'MTNL (BKC)', lat: 19.067340, lon: 72.859120, isOperational: false },
  { id: 'STN_L2B_012', name: 'SGPT', lat: 19.068120, lon: 72.853210, isOperational: false },
  { id: 'STN_L2B_013', name: 'BKC', lat: 19.066450, lon: 72.848120, isOperational: false },
  { id: 'STN_L2B_014', name: 'MMRDA Office', lat: 19.064120, lon: 72.842340, isOperational: false },
  { id: 'STN_L2B_015', name: 'Income Tax Office', lat: 19.061230, lon: 72.838120, isOperational: false },
  { id: 'STN_L2B_016', name: 'IL&FS', lat: 19.058120, lon: 72.834120, isOperational: false },
  { id: 'STN_L2B_017', name: 'Bandra', lat: 19.055340, lon: 72.831200, isOperational: false },
  { id: 'STN_L2B_018', name: 'National College', lat: 19.063120, lon: 72.833410, isOperational: false },
  { id: 'STN_L2B_019', name: 'Saraswat Nagar', lat: 19.072120, lon: 72.834120, isOperational: false },
  { id: 'STN_L2B_020', name: 'Khar', lat: 19.083120, lon: 72.834510, isOperational: false },
  { id: 'STN_L2B_021', name: 'ESIC Nagar', lat: 19.102120, lon: 72.831200, isOperational: false },
  { id: 'STN_L2B_022', name: 'D.N. Nagar', lat: 19.125556, lon: 72.828611, isOperational: false },
];

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
  if (idxFrom === -1 || idxTo === -1) return [fromCoord, toCoord];
  const res = [fromCoord];
  if (idxFrom < idxTo) {
    for (let i = idxFrom; i <= idxTo; i++) res.push(allCoords[i]);
  } else {
    for (let i = idxFrom; i >= idxTo; i--) res.push(allCoords[i]);
  }
  res.push(toCoord);
  return res;
}

// 3. Helper to append/write GTFS lines
function appendToGtfs(targetDir, stationsList, shapeCoords, routeSuffix = '') {
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  // routes.txt
  const routeRow = `LINE2B,MMMOCL,Line 2B,Yellow Line (Mandale - ${stationsList[stationsList.length - 1].name}),1,F0C800,000000\n`;
  fs.appendFileSync(path.join(targetDir, 'routes.txt'), routeRow, 'utf8');

  // levels.txt
  let levelsData = '';
  for (const stn of stationsList) {
    const num = stn.id.replace('STN_L2B_', '');
    levelsData += `LVL_L2B_${num}_C,1.0,Concourse Level\n`;
    levelsData += `LVL_L2B_${num}_P,2.0,Platform Level\n`;
  }
  fs.appendFileSync(path.join(targetDir, 'levels.txt'), levelsData, 'utf8');

  // stops.txt
  let stopsData = '';
  for (const stn of stationsList) {
    const num = stn.id.replace('STN_L2B_', '');
    stopsData += `${stn.id},"${stn.name}",${stn.lat.toFixed(6)},${stn.lon.toFixed(6)},1,,,1\n`;
    stopsData += `PF_L2B_${num}_1,"${stn.name} Platform 1",${stn.lat.toFixed(6)},${stn.lon.toFixed(6)},0,${stn.id},1,LVL_L2B_${num}_P,1\n`;
    stopsData += `PF_L2B_${num}_2,"${stn.name} Platform 2",${stn.lat.toFixed(6)},${stn.lon.toFixed(6)},0,${stn.id},2,LVL_L2B_${num}_P,1\n`;
  }
  fs.appendFileSync(path.join(targetDir, 'stops.txt'), stopsData, 'utf8');

  // shapes.txt
  let shapesData = '';
  shapeCoords.forEach((p, idx) => {
    shapesData += `SHP_LINE2B_WB${routeSuffix},${p[1].toFixed(6)},${p[0].toFixed(6)},${idx + 1}\n`;
  });
  const reversed = [...shapeCoords].reverse();
  reversed.forEach((p, idx) => {
    shapesData += `SHP_LINE2B_EB${routeSuffix},${p[1].toFixed(6)},${p[0].toFixed(6)},${idx + 1}\n`;
  });
  fs.appendFileSync(path.join(targetDir, 'shapes.txt'), shapesData, 'utf8');

  // trips.txt
  const tripsData = `TRIP_L2B_WB${routeSuffix},LINE2B,SVC_DAILY,${stationsList[stationsList.length - 1].name},0,SHP_LINE2B_WB${routeSuffix},BLOCK_L2B_01\n` +
                    `TRIP_L2B_EB${routeSuffix},LINE2B,SVC_DAILY,${stationsList[0].name},1,SHP_LINE2B_EB${routeSuffix},BLOCK_L2B_01\n`;
  fs.appendFileSync(path.join(targetDir, 'trips.txt'), tripsData, 'utf8');

  // frequencies.txt (6 min peak, 10 min off-peak)
  const freqData = `TRIP_L2B_WB${routeSuffix},06:00:00,08:30:00,600,0\n` +
                   `TRIP_L2B_WB${routeSuffix},08:30:00,11:30:00,360,0\n` +
                   `TRIP_L2B_WB${routeSuffix},11:30:00,17:30:00,600,0\n` +
                   `TRIP_L2B_WB${routeSuffix},17:30:00,20:30:00,360,0\n` +
                   `TRIP_L2B_WB${routeSuffix},20:30:00,23:00:00,600,0\n` +
                   `TRIP_L2B_EB${routeSuffix},06:00:00,08:30:00,600,0\n` +
                   `TRIP_L2B_EB${routeSuffix},08:30:00,11:30:00,360,0\n` +
                   `TRIP_L2B_EB${routeSuffix},11:30:00,17:30:00,600,0\n` +
                   `TRIP_L2B_EB${routeSuffix},17:30:00,20:30:00,360,0\n` +
                   `TRIP_L2B_EB${routeSuffix},20:30:00,23:00:00,600,0\n`;
  fs.appendFileSync(path.join(targetDir, 'frequencies.txt'), freqData, 'utf8');

  // stop_times.txt
  function formatSec(sec) {
    const total = 6 * 3600 + sec; // start at 06:00:00
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  let stopTimesData = '';
  // Westbound
  stationsList.forEach((stn, idx) => {
    const num = stn.id.replace('STN_L2B_', '');
    const arr = formatSec(idx * 120);
    const dep = formatSec(idx * 120 + (idx === 0 || idx === stationsList.length - 1 ? 0 : 20));
    stopTimesData += `TRIP_L2B_WB${routeSuffix},${arr},${dep},PF_L2B_${num}_1,${idx + 1},0,0\n`;
  });
  // Eastbound
  const rev = [...stationsList].reverse();
  rev.forEach((stn, idx) => {
    const num = stn.id.replace('STN_L2B_', '');
    const arr = formatSec(idx * 120);
    const dep = formatSec(idx * 120 + (idx === 0 || idx === stationsList.length - 1 ? 0 : 20));
    stopTimesData += `TRIP_L2B_EB${routeSuffix},${arr},${dep},PF_L2B_${num}_2,${idx + 1},0,0\n`;
  });
  fs.appendFileSync(path.join(targetDir, 'stop_times.txt'), stopTimesData, 'utf8');
}

// 4. Build Operational Slice (Mandale Depot -> Diamond Garden: 5 stations)
const opsStations = ALL_L2B_STATIONS.filter(s => s.isOperational);
const startOpsCoord = [opsStations[0].lon, opsStations[0].lat];
const endOpsCoord = [opsStations[opsStations.length - 1].lon, opsStations[opsStations.length - 1].lat];
const opsCoords = sliceCoords(fullCoords, startOpsCoord, endOpsCoord);

console.log('Operational slice station count:', opsStations.length);
console.log('Operational slice shape points count:', opsCoords.length);

appendToGtfs('datasets/mumbai/gtfs', opsStations, opsCoords, '');

// 5. Build Master Network Vision Slice (Mandale Depot -> Andheri West: 22 stations)
// Copy base L1 files to gtfs_master first if not present
const masterDir = 'datasets/mumbai/gtfs_master';
if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });
const baseFiles = ['agency.txt', 'calendar.txt', 'routes.txt', 'levels.txt', 'stops.txt', 'shapes.txt', 'trips.txt', 'frequencies.txt', 'stop_times.txt', 'transfers.txt', 'pathways.txt'];
for (const f of baseFiles) {
  const src = path.join('datasets/mumbai/gtfs', f);
  const dst = path.join(masterDir, f);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
  }
}

console.log('Master vision full corridor station count:', ALL_L2B_STATIONS.length);
console.log('Master vision full corridor shape points count:', fullCoords.length);

appendToGtfs(masterDir, ALL_L2B_STATIONS, fullCoords, '_FULL');

console.log('Successfully compiled Line 2B into both Operational GTFS and Master Vision GTFS!');
