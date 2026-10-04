const fs = require('fs');
const path = require('path');

console.log('🔬 CTM Contract Validation Suite — Verifying datasets/mumbai/normalized/ctm.json...');

const ctmPath = path.resolve('datasets/mumbai/normalized/ctm.json');
if (!fs.existsSync(ctmPath)) {
  console.error('❌ CTM file not found at datasets/mumbai/normalized/ctm.json');
  process.exit(1);
}

const ctm = JSON.parse(fs.readFileSync(ctmPath, 'utf-8'));
const errors = [];
const warnings = [];

// 1. Mandatory Root Attributes
const mandatoryRootKeys = [
  'ctmVersion', 'schemaVersion', 'systemId', 'systemName', 'city', 'country',
  'operator', 'gauge', 'electrification', 'operationalStatus', 'stations',
  'route', 'rollingStock', 'operationsBaseline', 'sourceCatalog', 'auditLedger'
];

for (const k of mandatoryRootKeys) {
  if (!ctm[k]) {
    errors.push(`Missing mandatory root key '${k}' in CTM.`);
  }
}

// 2. Station Contract Validation
if (Array.isArray(ctm.stations)) {
  if (ctm.stations.length !== 27) {
    errors.push(`Line 3 CTM revenue station count must be exactly 27 (got ${ctm.stations.length}).`);
  }

  ctm.stations.forEach((stn, idx) => {
    if (!stn.stationId) errors.push(`Station #${idx+1} missing stationId.`);
    if (!stn.name) errors.push(`Station #${idx+1} missing name.`);
    if (stn.sequence !== idx + 1) errors.push(`Station #${idx+1} (${stn.name}) sequence mismatch: expected ${idx+1}, got ${stn.sequence}.`);
    
    if (!stn.coordinates || typeof stn.coordinates.latitude !== 'number' || typeof stn.coordinates.longitude !== 'number') {
      errors.push(`Station #${idx+1} (${stn.name}) missing or invalid WGS84 lat/lon coordinates.`);
    } else {
      if (stn.coordinates.latitude < 18.0 || stn.coordinates.latitude > 20.0 || stn.coordinates.longitude < 72.0 || stn.coordinates.longitude > 73.0) {
        errors.push(`Station #${idx+1} (${stn.name}) coordinates [${stn.coordinates.latitude}, ${stn.coordinates.longitude}] outside Mumbai bounding box!`);
      }
    }

    if (!stn.provenance || !stn.provenance.sourceId) {
      errors.push(`Station #${idx+1} (${stn.name}) missing provenance citation.`);
    }
  });
} else {
  errors.push(`ctm.stations is not an array.`);
}

// 3. Route & Alignment Contract Validation
if (ctm.route) {
  if (!ctm.route.alignmentGeometry || !ctm.route.alignmentGeometry.vertexCount) {
    errors.push(`Route missing alignmentGeometry or vertexCount.`);
  } else if (ctm.route.alignmentGeometry.vertexCount !== 28641) {
    warnings.push(`Alignment vertex count is ${ctm.route.alignmentGeometry.vertexCount} (expected 28641).`);
  }
}

// 4. Rolling Stock Contract Validation
if (ctm.rollingStock) {
  if (ctm.rollingStock.carsPerTrain !== 8) {
    errors.push(`Line 3 rolling stock must be 8-car formation (got ${ctm.rollingStock.carsPerTrain}).`);
  }
  if (!ctm.rollingStock.electrification.includes('25kV AC')) {
    errors.push(`Line 3 rolling stock electrification must specify 25kV AC OHE.`);
  }
}

// Summary Output
console.log('\n────────────────────────────────────────────────────────────');
console.log('CTM CONTRACT AUDIT SUMMARY');
console.log('────────────────────────────────────────────────────────────');
console.log(`  System ID               : ${ctm.systemId}`);
console.log(`  System Name             : ${ctm.systemName}`);
console.log(`  Revenue Stations        : ${ctm.stations ? ctm.stations.length : 0} stations`);
console.log(`  Non-Revenue Points      : ${ctm.nonRevenuePoints ? ctm.nonRevenuePoints.length : 0} (Depot + Extension)`);
console.log(`  Intermodal Transfers    : ${ctm.transfers ? ctm.transfers.length : 0} transfer nodes`);
console.log(`  Alignment Vertices      : ${ctm.route && ctm.route.alignmentGeometry ? ctm.route.alignmentGeometry.vertexCount : 0} vertices`);
console.log(`  Rolling Stock           : ${ctm.rollingStock ? ctm.rollingStock.family : 'None'}`);
console.log(`  Contract Errors         : ${errors.length}`);
console.log(`  Contract Warnings       : ${warnings.length}`);

if (errors.length > 0) {
  console.error('\n❌ CTM Contract Validation Failed:');
  errors.forEach(e => console.error(`   - ${e}`));
  process.exit(1);
}

console.log('\n✅ CTM Contract Validation Passed — 0 errors. Line 3 CTM is production ready!\n');
