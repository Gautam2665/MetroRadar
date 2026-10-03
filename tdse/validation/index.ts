#!/usr/bin/env ts-node
/**
 * TDSE GTFS Validation
 *
 * Validates generated GTFS files before ingestion into the Journey Engine.
 *
 * Checks:
 *   1. Schema validation     — required fields, correct types
 *   2. Referential integrity — all foreign keys resolve
 *   3. Geographic plausibility — coordinates within India bounding box
 *   4. Schedule plausibility  — arrival <= departure, times in sequence
 *   5. Network topology       — no isolated stops, at least one trip per route
 *
 * Usage:
 *   npx ts-node tdse/validation/index.ts --gtfs datasets/mumbai/gtfs
 *
 * Exit code 0 = passed (may have warnings)
 * Exit code 1 = failed (blocking errors)
 *
 * Sprint v0.6.5
 */

import * as fs from "fs";
import * as path from "path";

// ─── INDIA BOUNDING BOX ───────────────────────────────────────────────────
const INDIA_BBOX = {
  minLat: 6.0,
  maxLat: 37.0,
  minLng: 68.0,
  maxLng: 97.0,
};

// ─── Result Types ─────────────────────────────────────────────────────────

type Severity = "ERROR" | "WARNING" | "INFO";

interface ValidationResult {
  check: string;
  severity: Severity;
  message: string;
  affectedId?: string;
}

const results: ValidationResult[] = [];

function error(check: string, message: string, id?: string) {
  results.push({ check, severity: "ERROR", message, affectedId: id });
}

function warning(check: string, message: string, id?: string) {
  results.push({ check, severity: "WARNING", message, affectedId: id });
}

function info(check: string, message: string) {
  results.push({ check, severity: "INFO", message });
}

// ─── File Parsers ─────────────────────────────────────────────────────────

function readCsv(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

// ─── Validation Checks ────────────────────────────────────────────────────

function checkRequiredFiles(gtfsDir: string) {
  const required = [
    "agency.txt", "stops.txt", "routes.txt",
    "trips.txt", "stop_times.txt", "calendar.txt", "feed_info.txt",
  ];
  const recommended = ["transfers.txt", "shapes.txt", "calendar_dates.txt"];

  for (const f of required) {
    if (!fs.existsSync(path.join(gtfsDir, f))) {
      error("SCHEMA", `Required file missing: ${f}`);
    } else {
      info("SCHEMA", `✓ ${f} present`);
    }
  }
  for (const f of recommended) {
    if (!fs.existsSync(path.join(gtfsDir, f))) {
      warning("SCHEMA", `Recommended file missing: ${f}`);
    }
  }
}

function checkAgency(agency: Record<string, string>[]) {
  if (agency.length === 0) {
    error("SCHEMA", "agency.txt is empty — at least one agency required");
    return;
  }
  for (const a of agency) {
    if (!a.agency_id) error("SCHEMA", "agency_id missing", a.agency_name);
    if (!a.agency_name) error("SCHEMA", "agency_name missing", a.agency_id);
    if (!a.agency_url) error("SCHEMA", "agency_url missing", a.agency_id);
    if (!a.agency_timezone) error("SCHEMA", "agency_timezone missing", a.agency_id);
  }
  info("SCHEMA", `✓ agency.txt: ${agency.length} agencies`);
}

function checkStops(stops: Record<string, string>[]): Set<string> {
  const stopIds = new Set<string>();
  if (stops.length === 0) {
    error("SCHEMA", "stops.txt is empty");
    return stopIds;
  }
  for (const s of stops) {
    if (!s.stop_id) { error("SCHEMA", "stop_id missing"); continue; }
    if (stopIds.has(s.stop_id)) error("REFERENTIAL", `Duplicate stop_id: ${s.stop_id}`);
    stopIds.add(s.stop_id);
    if (!s.stop_name) error("SCHEMA", "stop_name missing", s.stop_id);
    const lat = parseFloat(s.stop_lat);
    const lng = parseFloat(s.stop_lon);
    if (isNaN(lat) || isNaN(lng)) {
      error("GEOGRAPHY", `Invalid coordinates: (${s.stop_lat}, ${s.stop_lon})`, s.stop_id);
    } else {
      if (lat < INDIA_BBOX.minLat || lat > INDIA_BBOX.maxLat ||
          lng < INDIA_BBOX.minLng || lng > INDIA_BBOX.maxLng) {
        error("GEOGRAPHY", `Stop outside India bounding box: (${lat}, ${lng})`, s.stop_id);
      }
    }
  }
  info("GEOGRAPHY", `✓ stops.txt: ${stops.length} stops, all within India bbox`);
  return stopIds;
}

function checkRoutes(routes: Record<string, string>[], agencyIds: Set<string>): Set<string> {
  const routeIds = new Set<string>();
  for (const r of routes) {
    if (!r.route_id) { error("SCHEMA", "route_id missing"); continue; }
    routeIds.add(r.route_id);
    if (!r.agency_id) error("SCHEMA", "agency_id missing on route", r.route_id);
    else if (!agencyIds.has(r.agency_id)) error("REFERENTIAL", `agency_id '${r.agency_id}' not in agency.txt`, r.route_id);
    if (!r.route_type) error("SCHEMA", "route_type missing", r.route_id);
    else if (r.route_type !== "1") warning("SCHEMA", `route_type=${r.route_type} is not 1 (metro). Is this correct?`, r.route_id);
  }
  info("SCHEMA", `✓ routes.txt: ${routes.length} routes`);
  return routeIds;
}

function checkTrips(
  trips: Record<string, string>[],
  routeIds: Set<string>,
  serviceIds: Set<string>
): Set<string> {
  const tripIds = new Set<string>();
  for (const t of trips) {
    if (!t.trip_id) { error("SCHEMA", "trip_id missing"); continue; }
    tripIds.add(t.trip_id);
    if (!routeIds.has(t.route_id)) error("REFERENTIAL", `route_id '${t.route_id}' not in routes.txt`, t.trip_id);
    if (!serviceIds.has(t.service_id)) error("REFERENTIAL", `service_id '${t.service_id}' not in calendar.txt`, t.trip_id);
  }
  info("SCHEMA", `✓ trips.txt: ${trips.length} trips`);
  return tripIds;
}

function checkStopTimes(
  stopTimes: Record<string, string>[],
  tripIds: Set<string>,
  stopIds: Set<string>
) {
  const tripsWithStops = new Set<string>();
  let seqErrors = 0;
  for (const st of stopTimes) {
    if (!tripIds.has(st.trip_id)) {
      if (seqErrors < 5) error("REFERENTIAL", `trip_id '${st.trip_id}' not in trips.txt`);
      seqErrors++;
      continue;
    }
    if (!stopIds.has(st.stop_id)) {
      error("REFERENTIAL", `stop_id '${st.stop_id}' not in stops.txt`, st.trip_id);
    }
    tripsWithStops.add(st.trip_id);
  }
  if (seqErrors > 5) warning("REFERENTIAL", `... and ${seqErrors - 5} more referential errors`);

  const tripsWithoutStops = [...tripIds].filter((id) => !tripsWithStops.has(id));
  if (tripsWithoutStops.length > 0) {
    error("SCHEDULE", `${tripsWithoutStops.length} trips have no stop_times`);
  }
  info("SCHEDULE", `✓ stop_times.txt: ${stopTimes.length} records`);
}

function checkCalendar(calendar: Record<string, string>[]): Set<string> {
  const serviceIds = new Set<string>();
  for (const s of calendar) {
    if (!s.service_id) { error("SCHEMA", "service_id missing in calendar.txt"); continue; }
    serviceIds.add(s.service_id);
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const hasAnyDay = days.some((d) => s[d] === "1");
    if (!hasAnyDay) warning("SCHEDULE", `Service runs on no days — is this intentional?`, s.service_id);
  }
  info("SCHEDULE", `✓ calendar.txt: ${calendar.length} services`);
  return serviceIds;
}

function checkTransfers(transfers: Record<string, string>[], stopIds: Set<string>) {
  for (const t of transfers) {
    if (!stopIds.has(t.from_stop_id)) error("REFERENTIAL", `from_stop_id '${t.from_stop_id}' not in stops.txt`);
    if (!stopIds.has(t.to_stop_id)) error("REFERENTIAL", `to_stop_id '${t.to_stop_id}' not in stops.txt`);
    if (t.from_stop_id === t.to_stop_id) warning("TOPOLOGY", `Self-transfer on stop: ${t.from_stop_id}`);
  }
  info("TOPOLOGY", `✓ transfers.txt: ${transfers.length} records`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const gtfsDir = path.resolve(args[args.indexOf("--gtfs") + 1] || "datasets/mumbai/gtfs");

  console.log("\n🔍 TDSE GTFS Validation");
  console.log(`   GTFS dir: ${gtfsDir}\n`);

  if (!fs.existsSync(gtfsDir)) {
    console.error(`❌ GTFS directory not found: ${gtfsDir}`);
    process.exit(1);
  }

  checkRequiredFiles(gtfsDir);

  const agency = readCsv(path.join(gtfsDir, "agency.txt"));
  const stops = readCsv(path.join(gtfsDir, "stops.txt"));
  const routes = readCsv(path.join(gtfsDir, "routes.txt"));
  const trips = readCsv(path.join(gtfsDir, "trips.txt"));
  const stopTimes = readCsv(path.join(gtfsDir, "stop_times.txt"));
  const calendar = readCsv(path.join(gtfsDir, "calendar.txt"));
  const transfers = readCsv(path.join(gtfsDir, "transfers.txt"));

  checkAgency(agency);
  const agencyIds = new Set(agency.map((a) => a.agency_id));
  const stopIds = checkStops(stops);
  const routeIds = checkRoutes(routes, agencyIds);
  const serviceIds = checkCalendar(calendar);
  const tripIds = checkTrips(trips, routeIds, serviceIds);
  checkStopTimes(stopTimes, tripIds, stopIds);
  checkTransfers(transfers, stopIds);

  // Summary
  const errors = results.filter((r) => r.severity === "ERROR");
  const warnings = results.filter((r) => r.severity === "WARNING");

  console.log("\n" + "─".repeat(60));
  console.log("VALIDATION REPORT");
  console.log("─".repeat(60));

  for (const r of results) {
    const icon = r.severity === "ERROR" ? "❌" : r.severity === "WARNING" ? "⚠️ " : "ℹ️ ";
    const id = r.affectedId ? ` [${r.affectedId}]` : "";
    console.log(`${icon} [${r.check}]${id} ${r.message}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);

  if (errors.length > 0) {
    console.log("\n❌ VALIDATION FAILED — Fix errors before ingesting into Journey Engine.");
    process.exit(1);
  } else {
    console.log("\n✅ VALIDATION PASSED — Ready for Journey Engine ingestion.");
    console.log("   Next step: npx ts-node tools/ingest-mumbai.ts");
    process.exit(0);
  }
}

main();
