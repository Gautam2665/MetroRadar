#!/usr/bin/env ts-node
/* eslint-disable */
/**
 * MetroRadar Dataset Validator
 *
 * Usage:
 *   npx ts-node tools/validate-dataset.ts --city=delhi
 *   npx ts-node tools/validate-dataset.ts --city=kochi
 *
 * Runs 6 validation stages against datasets/{city}/raw/gtfs-static.zip
 * and writes a report to datasets/{city}/processed/validation-report.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationStageResult {
  passed: boolean;
  details: Record<string, any>;
}

interface ValidationReport {
  dataset: string;
  city: string;
  validatedAt: string;
  passed: boolean;
  stages: {
    schema: ValidationStageResult;
    coordinates: ValidationStageResult;
    duplicates: ValidationStageResult;
    references: ValidationStageResult;
    license: ValidationStageResult;
    checksum: ValidationStageResult;
  };
  counts: {
    agencies: number;
    stops: number;
    routes: number;
    trips: number;
    stopTimes: number;
    shapes: number;
    calendars: number;
  };
  warnings: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { city: string } {
  const cityArg = process.argv.find((a) => a.startsWith('--city='));
  if (!cityArg) {
    console.error('Usage: npx ts-node tools/validate-dataset.ts --city=<city>');
    process.exit(1);
  }
  return { city: cityArg.split('=')[1] };
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim().replace(/^"|"$/g, ''); });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function computeSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ---------------------------------------------------------------------------
// Validation Stages
// ---------------------------------------------------------------------------

const REQUIRED_FILES = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
const OPTIONAL_FILES = ['calendar.txt', 'calendar_dates.txt', 'shapes.txt', 'frequencies.txt', 'fare_attributes.txt', 'feed_info.txt'];

// India bounding box (generous)
const INDIA_BOUNDS = { minLat: 6.0, maxLat: 37.0, minLon: 68.0, maxLon: 97.5 };

function validateSchema(files: Map<string, string>): ValidationStageResult {
  const missingRequired: string[] = [];
  const presentOptional: string[] = [];

  for (const f of REQUIRED_FILES) {
    if (!files.has(f)) missingRequired.push(f);
  }
  for (const f of OPTIONAL_FILES) {
    if (files.has(f)) presentOptional.push(f);
  }

  return {
    passed: missingRequired.length === 0,
    details: { missingRequired, presentOptional },
  };
}

function validateCoordinates(files: Map<string, string>): ValidationStageResult {
  const stopsContent = files.get('stops.txt');
  if (!stopsContent) return { passed: true, details: { skipped: 'stops.txt not present' } };

  const stops = parseCsv(stopsContent);
  const outOfBounds: string[] = [];

  for (const stop of stops) {
    const lat = parseFloat(stop['stop_lat'] ?? stop['stop_latitude'] ?? '');
    const lon = parseFloat(stop['stop_lon'] ?? stop['stop_longitude'] ?? '');

    if (isNaN(lat) || isNaN(lon)) {
      outOfBounds.push(`${stop['stop_id']}: invalid coordinates (lat=${stop['stop_lat']}, lon=${stop['stop_lon']})`);
      continue;
    }
    if (lat < INDIA_BOUNDS.minLat || lat > INDIA_BOUNDS.maxLat || lon < INDIA_BOUNDS.minLon || lon > INDIA_BOUNDS.maxLon) {
      outOfBounds.push(`${stop['stop_id']}: out of India bounds (lat=${lat}, lon=${lon})`);
    }
  }

  return {
    passed: outOfBounds.length === 0,
    details: { totalStops: stops.length, outOfBoundsCount: outOfBounds.length, outOfBounds: outOfBounds.slice(0, 10) },
  };
}

function validateDuplicates(files: Map<string, string>): ValidationStageResult {
  const issues: Record<string, string[]> = {};

  const checkDuplicates = (filename: string, idField: string) => {
    const content = files.get(filename);
    if (!content) return;
    const rows = parseCsv(content);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const row of rows) {
      const id = row[idField];
      if (id && seen.has(id)) dupes.push(id);
      if (id) seen.add(id);
    }
    if (dupes.length > 0) issues[filename] = dupes.slice(0, 10);
  };

  checkDuplicates('stops.txt', 'stop_id');
  checkDuplicates('routes.txt', 'route_id');
  checkDuplicates('trips.txt', 'trip_id');

  return {
    passed: Object.keys(issues).length === 0,
    details: { duplicates: issues },
  };
}

function validateReferences(files: Map<string, string>): ValidationStageResult {
  const brokenRefs: string[] = [];

  // Build lookup sets
  const routeIds = new Set<string>();
  const tripIds = new Set<string>();
  const stopIds = new Set<string>();

  const routesContent = files.get('routes.txt');
  if (routesContent) parseCsv(routesContent).forEach((r) => routeIds.add(r['route_id']));

  const stopsContent = files.get('stops.txt');
  if (stopsContent) parseCsv(stopsContent).forEach((s) => stopIds.add(s['stop_id']));

  // Check trips reference valid routes
  const tripsContent = files.get('trips.txt');
  if (tripsContent) {
    const trips = parseCsv(tripsContent);
    for (const trip of trips) {
      tripIds.add(trip['trip_id']);
      if (trip['route_id'] && !routeIds.has(trip['route_id'])) {
        brokenRefs.push(`trip ${trip['trip_id']}: unknown route_id ${trip['route_id']}`);
      }
    }
  }

  // Check stop_times reference valid trips and stops (sample first 1000)
  const stopTimesContent = files.get('stop_times.txt');
  if (stopTimesContent) {
    const stopTimes = parseCsv(stopTimesContent).slice(0, 1000);
    for (const st of stopTimes) {
      if (st['trip_id'] && !tripIds.has(st['trip_id'])) {
        brokenRefs.push(`stop_time: unknown trip_id ${st['trip_id']}`);
      }
      if (st['stop_id'] && !stopIds.has(st['stop_id'])) {
        brokenRefs.push(`stop_time: unknown stop_id ${st['stop_id']}`);
      }
    }
  }

  const uniqueRefs = [...new Set(brokenRefs)].slice(0, 20);
  return {
    passed: uniqueRefs.length === 0,
    details: { brokenRefsCount: brokenRefs.length, brokenRefs: uniqueRefs },
  };
}

function validateLicense(datasetDir: string): ValidationStageResult {
  const licensePath = path.join(datasetDir, 'license.json');
  if (!fs.existsSync(licensePath)) {
    return { passed: false, details: { error: 'license.json not found' } };
  }
  const license = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
  const requiredFields = ['name', 'sourceUrl', 'lastReviewed', 'allowsCommercialUse', 'requiresAttribution'];
  const missingFields = requiredFields.filter((f) => license[f] === undefined || license[f] === null);
  return {
    passed: missingFields.length === 0,
    details: { missingFields, licenseFile: licensePath },
  };
}

function validateChecksum(zipPath: string, datasetDir: string): ValidationStageResult {
  const metaPath = path.join(datasetDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    return { passed: false, details: { error: 'metadata.json not found' } };
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (!meta.sha256) {
    return { passed: true, details: { warning: 'No sha256 in metadata.json — skipping checksum verification. Update metadata.json after first download.' } };
  }
  const actual = computeSha256(zipPath);
  return {
    passed: actual === meta.sha256,
    details: { expected: meta.sha256, actual, match: actual === meta.sha256 },
  };
}

// ---------------------------------------------------------------------------
// Count helper
// ---------------------------------------------------------------------------

function countRows(files: Map<string, string>, filename: string): number {
  const content = files.get(filename);
  if (!content) return 0;
  return parseCsv(content).length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { city } = parseArgs();

  const datasetDir = path.join(process.cwd(), 'datasets', city);
  const zipPath = path.join(datasetDir, 'raw', 'gtfs-static.zip');
  const processedDir = path.join(datasetDir, 'processed');
  const reportPath = path.join(processedDir, 'validation-report.json');

  console.log(`\n🔍 MetroRadar Dataset Validator`);
  console.log(`   City: ${city}`);
  console.log(`   ZIP:  ${zipPath}\n`);

  if (!fs.existsSync(zipPath)) {
    console.error(`❌ ZIP not found: ${zipPath}`);
    console.error(`   Download the dataset and place it at the path above.`);
    console.error(`   See: datasets/${city}/source.md for instructions.\n`);
    process.exit(1);
  }

  // Extract ZIP contents into memory
  const zip = new AdmZip(zipPath);
  const files = new Map<string, string>();
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory && entry.name.endsWith('.txt')) {
      files.set(entry.name, zip.readAsText(entry));
    }
  }

  console.log(`📦 Files found in ZIP: ${[...files.keys()].join(', ')}\n`);

  // Run all stages
  const warnings: string[] = [];
  const errors: string[] = [];

  const schemaResult = validateSchema(files);
  const coordResult = validateCoordinates(files);
  const dupeResult = validateDuplicates(files);
  const refResult = validateReferences(files);
  const licenseResult = validateLicense(datasetDir);
  const checksumResult = validateChecksum(zipPath, datasetDir);

  // Print stage results
  const printStage = (name: string, result: ValidationStageResult) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    if (!result.passed) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      errors.push(`${name} failed`);
    }
  };

  printStage('Schema Validation', schemaResult);
  printStage('Coordinate Validation', coordResult);
  printStage('Duplicate Validation', dupeResult);
  printStage('Reference Validation', refResult);
  printStage('License Validation', licenseResult);
  printStage('Checksum Validation', checksumResult);

  // Collect optional file warnings
  if (!files.has('shapes.txt')) warnings.push('shapes.txt not present — route polylines unavailable');
  if (!files.has('calendar.txt') && !files.has('calendar_dates.txt')) warnings.push('No calendar data — service dates unavailable');

  const allPassed =
    schemaResult.passed &&
    coordResult.passed &&
    dupeResult.passed &&
    refResult.passed &&
    licenseResult.passed &&
    checksumResult.passed;

  const counts = {
    agencies: countRows(files, 'agency.txt'),
    stops: countRows(files, 'stops.txt'),
    routes: countRows(files, 'routes.txt'),
    trips: countRows(files, 'trips.txt'),
    stopTimes: countRows(files, 'stop_times.txt'),
    shapes: countRows(files, 'shapes.txt'),
    calendars: countRows(files, 'calendar.txt'),
  };

  const report: ValidationReport = {
    dataset: `${city}-gtfs-static`,
    city,
    validatedAt: new Date().toISOString(),
    passed: allPassed,
    stages: {
      schema: schemaResult,
      coordinates: coordResult,
      duplicates: dupeResult,
      references: refResult,
      license: licenseResult,
      checksum: checksumResult,
    },
    counts,
    warnings,
    errors,
  };

  // Write report
  if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📊 Record Counts:`);
  Object.entries(counts).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  console.log(`\n${allPassed ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'}`);
  console.log(`📄 Report written to: ${reportPath}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
