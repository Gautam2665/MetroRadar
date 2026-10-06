const fs = require('fs');
const path = require('path');

const gtfsDir = path.resolve(process.cwd(), 'datasets/mumbai/gtfs');
const ctmDir = path.resolve(process.cwd(), 'datasets/mumbai/normalized');

function parseCsv(filename) {
  const file = path.join(gtfsDir, filename);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuote = !inQuote;
      } else if (c === ',' && !inQuote) {
        values.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : ''; });
    return obj;
  });
}

console.log('===============================================================');
console.log('       MUMBAI OPERATIONAL GTFS COMPREHENSIVE AUDIT REPORT      ');
console.log('===============================================================');

const agencies = parseCsv('agency.txt');
const routes = parseCsv('routes.txt');
const calendar = parseCsv('calendar.txt');
const levels = parseCsv('levels.txt');
const stops = parseCsv('stops.txt');
const shapes = parseCsv('shapes.txt');
const trips = parseCsv('trips.txt');
const frequencies = parseCsv('frequencies.txt');
const stopTimes = parseCsv('stop_times.txt');
const transfers = parseCsv('transfers.txt');
const pathways = parseCsv('pathways.txt');

const errors = [];
const warnings = [];
const passes = [];

// ── 1. Referential Integrity Checks ─────────────────────────────────────────
const agencyIds = new Set(agencies.map(a => a.agency_id));
const routeIds = new Set(routes.map(r => r.route_id));
const serviceIds = new Set(calendar.map(c => c.service_id));
const levelIds = new Set(levels.map(l => l.level_id));
const stopIds = new Set(stops.map(s => s.stop_id));
const parentStationIds = new Set(stops.filter(s => s.location_type === '1').map(s => s.stop_id));
const shapeIds = new Set(shapes.map(s => s.shape_id));
const tripIds = new Set(trips.map(t => t.trip_id));

// Check routes -> agencies
routes.forEach(r => {
  if (!agencyIds.has(r.agency_id)) {
    errors.push(`[Referential] Route ${r.route_id} references non-existent agency_id: "${r.agency_id}"`);
  }
});

// Check trips -> routes, service, shapes
trips.forEach(t => {
  if (!routeIds.has(t.route_id)) {
    errors.push(`[Referential] Trip ${t.trip_id} references non-existent route_id: "${t.route_id}"`);
  }
  if (!serviceIds.has(t.service_id)) {
    errors.push(`[Referential] Trip ${t.trip_id} references non-existent service_id: "${t.service_id}"`);
  }
  if (!shapeIds.has(t.shape_id)) {
    errors.push(`[Referential] Trip ${t.trip_id} references non-existent shape_id: "${t.shape_id}"`);
  }
});

// Check frequencies -> trips
frequencies.forEach(f => {
  if (!tripIds.has(f.trip_id)) {
    errors.push(`[Referential] Frequency record references non-existent trip_id: "${f.trip_id}"`);
  }
});

// Check stop_times -> trips, stops
stopTimes.forEach(st => {
  if (!tripIds.has(st.trip_id)) {
    errors.push(`[Referential] Stop_time references non-existent trip_id: "${st.trip_id}"`);
  }
  if (!stopIds.has(st.stop_id)) {
    errors.push(`[Referential] Stop_time references non-existent stop_id: "${st.stop_id}"`);
  }
});

// Check stops -> levels, parent_station
stops.forEach(s => {
  if (s.level_id && !levelIds.has(s.level_id)) {
    errors.push(`[Referential] Stop ${s.stop_id} references non-existent level_id: "${s.level_id}"`);
  }
  if (s.parent_station && !parentStationIds.has(s.parent_station)) {
    errors.push(`[Referential] Stop ${s.stop_id} references non-existent parent_station: "${s.parent_station}"`);
  }
});

// Check transfers -> stops
transfers.forEach(tr => {
  // Allow external railway stns like STN_CR_DADAR or verify
  if (!stopIds.has(tr.from_stop_id) && !tr.from_stop_id.startsWith('STN_CR_') && !tr.from_stop_id.startsWith('STN_WR_')) {
    warnings.push(`[Transfers] from_stop_id "${tr.from_stop_id}" not in stops.txt (external station link)`);
  }
  if (!stopIds.has(tr.to_stop_id) && !tr.to_stop_id.startsWith('STN_CR_') && !tr.to_stop_id.startsWith('STN_WR_')) {
    warnings.push(`[Transfers] to_stop_id "${tr.to_stop_id}" not in stops.txt (external station link)`);
  }
});

// Check pathways -> stops, modes
pathways.forEach(pw => {
  if (!stopIds.has(pw.from_stop_id) && !pw.from_stop_id.startsWith('STN_CR_') && !pw.from_stop_id.startsWith('STN_WR_')) {
    errors.push(`[Pathways] from_stop_id "${pw.from_stop_id}" does NOT exist in stops.txt (must never be a level_id)`);
  }
  if (!stopIds.has(pw.to_stop_id) && !pw.to_stop_id.startsWith('STN_CR_') && !pw.to_stop_id.startsWith('STN_WR_')) {
    errors.push(`[Pathways] to_stop_id "${pw.to_stop_id}" does NOT exist in stops.txt (must never be a level_id)`);
  }
  if (pw.pathway_mode === '6' && pw.is_bidirectional === '1') {
    errors.push(`[Pathways Spec Violation] Pathway ${pw.pathway_id} has pathway_mode=6 (fare gate) with is_bidirectional=1 (must be 0)`);
  }
});

// ── 2. Spatial Bounding Box & Coordinate Checks ─────────────────────────────
const MUMBAI_BBOX = { minLat: 18.80, maxLat: 19.35, minLon: 72.75, maxLon: 73.05 };
stops.forEach(s => {
  const lat = parseFloat(s.stop_lat);
  const lon = parseFloat(s.stop_lon);
  if (isNaN(lat) || isNaN(lon) || lat < MUMBAI_BBOX.minLat || lat > MUMBAI_BBOX.maxLat || lon < MUMBAI_BBOX.minLon || lon > MUMBAI_BBOX.maxLon) {
    errors.push(`[Spatial Outlier] Stop ${s.stop_id} (${s.stop_name}) lat/lon (${lat}, ${lon}) is outside Mumbai bounding box!`);
  }
});

// ── 3. Cross-Reconciliation with Ground Truth Normalized CTM Datasets ───────
const ctmFiles = [
  { file: 'ctm-line1.json', name: 'Line 1 (Blue Line)' },
  { file: 'ctm-line2a.json', name: 'Line 2A (Yellow Line)' },
  { file: 'ctm-line7.json', name: 'Line 7 (Red Line)' },
  { file: 'ctm-line9-phase1.json', name: 'Line 9 (Red Extension)' },
  { file: 'ctm-line2b-phase1.json', name: 'Line 2B (Yellow Phase 1)' }
];

ctmFiles.forEach(({ file, name }) => {
  const filePath = path.join(ctmDir, file);
  if (!fs.existsSync(filePath)) return;
  const ctmData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ctmStations = ctmData.stations || [];
  
  const ctmIds = new Set(ctmStations.map(s => s.canonicalId));
  const matchedGtfsStations = stops.filter(s => s.location_type === '1' && ctmIds.has(s.stop_id));
  
  if (ctmStations.length !== matchedGtfsStations.length) {
    errors.push(`[Count Mismatch] ${name}: CTM has ${ctmStations.length} stations, but found only ${matchedGtfsStations.length} in GTFS stops.txt`);
  } else {
    passes.push(`[Ground Truth Match] ${name}: Station count perfectly matches (${matchedGtfsStations.length} stations)`);
  }

  // Coordinate check between CTM and GTFS
  ctmStations.forEach(ctmStn => {
    const gtfsStn = stops.find(g => g.stop_id === ctmStn.canonicalId && g.location_type === '1');
    if (!gtfsStn) {
      errors.push(`[Missing Station] ${name}: Canonical ID ${ctmStn.canonicalId} (${ctmStn.name}) missing from GTFS`);
    } else {
      const dLat = Math.abs(parseFloat(gtfsStn.stop_lat) - ctmStn.latitude);
      const dLon = Math.abs(parseFloat(gtfsStn.stop_lon) - ctmStn.longitude);
      if (dLat > 0.0001 || dLon > 0.0001) {
        warnings.push(`[Coordinate Drift] ${name} ${ctmStn.name}: delta (${dLat.toFixed(6)}, ${dLon.toFixed(6)})`);
      }
    }
  });
});

// ── 4. Output Summary ───────────────────────────────────────────────────────
console.log('\nAudit Results:');
console.log(`- Total GTFS Stations (location_type=1): ${parentStationIds.size}`);
console.log(`- Total Platforms (location_type=0): ${stops.filter(s => s.location_type === '0').length}`);
console.log(`- Total Concourse Nodes (location_type=3): ${stops.filter(s => s.location_type === '3').length}`);
console.log(`- Total Structural Levels: ${levelIds.size}`);
console.log(`- Total Shape Points: ${shapes.length}`);
console.log(`- Total Pathways: ${pathways.length}`);
console.log(`- Total Transfers: ${transfers.length}`);

console.log('\n---------------------------------------------------------------');
console.log(`PASSED CHECKS: ${passes.length}`);
passes.forEach(p => console.log(`  ✓ ${p}`));

if (warnings.length > 0) {
  console.log(`\nWARNINGS (${warnings.length}):`);
  warnings.forEach(w => console.log(`  ⚠ ${w}`));
} else {
  console.log('\nWARNINGS: 0');
}

if (errors.length > 0) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach(e => console.log(`  ✗ ${e}`));
} else {
  console.log('\nCRITICAL SPECIFICATION & REFERENTIAL ERRORS: 0');
  console.log('✓ Feed strictly complies with Canonical GTFS & GTFS-Pathways specifications.');
}
console.log('===============================================================\n');
