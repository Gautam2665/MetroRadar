#!/usr/bin/env ts-node
/**
 * TDSE GTFS Export — Mumbai Metro
 *
 * Reads:  datasets/mumbai/normalized/ctm.json  (Canonical Transit Model)
 * Writes: datasets/mumbai/gtfs/               (GTFS static files)
 *
 * Architecture rule:
 *   CTM → GTFS    (this direction only)
 *   GTFS is the export format; CTM is the source of truth.
 *
 * Usage:
 *   npx ts-node tdse/gtfs-export/index.ts --system MMRDA --ctm datasets/mumbai/normalized/ctm.json --out datasets/mumbai/gtfs
 *
 * Sprint v0.6.5
 */

import * as fs from "fs";
import * as path from "path";

// ─── Types (inline subset of CTM schema for this script) ───────────────────

interface CtmStop {
  id: string;
  name: string;
  code: string;
  city: string;
  systemCode: string;
  agencyId: string;
  position: { lat: number; lng: number };
  locationType: string;
  wheelchairBoarding: 0 | 1 | 2;
  fareZone?: string;
  openDate?: string | null;
  isInterchange: boolean;
  interchangesWith?: string[];
}

interface CtmRoute {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  textColor: string;
  type: number;
  agencyId: string;
  desc?: string;
  url?: string;
}

interface CtmStopInSequence {
  sequence: number;
  stopId: string;
  travelTimeSecs?: number;
  dwellTimeSecs?: number;
}

interface CtmStopSequence {
  id: string;
  routeId: string;
  direction: 0 | 1;
  headsign: string;
  stops: CtmStopInSequence[];
}

interface CtmServiceFrequency {
  startTime: string;
  endTime: string;
  headwaySecs: number;
  exactTimes: 0 | 1;
}

interface CtmService {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  days: {
    monday: boolean; tuesday: boolean; wednesday: boolean;
    thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean;
  };
  frequencies: CtmServiceFrequency[];
}

interface CtmTransfer {
  fromStopId: string;
  toStopId: string;
  type: 0 | 1 | 2 | 3;
  minTransferTimeSecs?: number;
}

interface CtmAgency {
  id: string;
  name: string;
  url: string;
  timezone: string;
  lang: string;
  phone?: string;
}

interface CtmSystem {
  metadata: {
    systemCode: string;
    displayName: string;
    city: string;
    dataLicense: string;
    generatedAt: string;
  };
  agencies: CtmAgency[];
  stops: CtmStop[];
  routes: CtmRoute[];
  sequences: CtmStopSequence[];
  services: CtmService[];
  transfers: CtmTransfer[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function csvRow(fields: (string | number | undefined | null)[]): string {
  return fields
    .map((f) => {
      const s = f == null ? "" : String(f);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

function writeFile(outDir: string, filename: string, header: string, rows: string[]) {
  const content = [header, ...rows].join("\r\n") + "\r\n";
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  ✓ ${filename} (${rows.length} records)`);
}

/** Convert "HH:MM:SS" + offset seconds → "HH:MM:SS" (handles >24h for overnight service) */
function addSeconds(time: string, secs: number): string {
  const [h, m, s] = time.split(":").map(Number);
  const total = h * 3600 + m * 60 + s + secs;
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// ─── Exporters ─────────────────────────────────────────────────────────────

function exportAgency(ctm: CtmSystem, outDir: string) {
  const header = "agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone";
  const rows = ctm.agencies.map((a) =>
    csvRow([a.id, a.name, a.url, a.timezone, a.lang, a.phone || ""])
  );
  writeFile(outDir, "agency.txt", header, rows);
}

function exportStops(ctm: CtmSystem, outDir: string) {
  const header =
    "stop_id,stop_name,stop_code,stop_lat,stop_lon,location_type,wheelchair_boarding,zone_id,stop_url";
  const rows = ctm.stops.map((s) =>
    csvRow([
      s.id,
      s.name,
      s.code,
      s.position.lat.toFixed(6),
      s.position.lng.toFixed(6),
      s.locationType === "STATION" ? 1 : 0,
      s.wheelchairBoarding,
      s.fareZone || "",
      "",
    ])
  );
  writeFile(outDir, "stops.txt", header, rows);
}

function exportRoutes(ctm: CtmSystem, outDir: string) {
  const header =
    "route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color,route_desc,route_url";
  const rows = ctm.routes.map((r) =>
    csvRow([
      r.id,
      r.agencyId,
      r.shortName,
      r.longName,
      r.type,
      r.color,
      r.textColor,
      r.desc || "",
      r.url || "",
    ])
  );
  writeFile(outDir, "routes.txt", header, rows);
}

function exportTripsAndStopTimes(ctm: CtmSystem, outDir: string) {
  const tripRows: string[] = [];
  const stopTimeRows: string[] = [];
  const tripHeader = "route_id,service_id,trip_id,trip_headsign,direction_id";
  const stopTimeHeader =
    "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type";

  // For each service × sequence, generate synthetic trips based on first departure + headway
  for (const service of ctm.services) {
    for (const seq of ctm.sequences) {
      // Generate trips from service frequencies
      for (const freq of service.frequencies) {
        const [startH, startM] = freq.startTime.split(":").map(Number);
        const [endH, endM] = freq.endTime.split(":").map(Number);
        const startSecs = startH * 3600 + startM * 60;
        const endSecs = endH * 3600 + endM * 60;

        let departureOffset = 0; // seconds from startTime
        let tripIndex = 0;

        while (startSecs + departureOffset <= endSecs) {
          const tripId = `${seq.id}_${service.id}_${String(tripIndex).padStart(3, "0")}`;

          tripRows.push(
            csvRow([seq.routeId, service.id, tripId, seq.headsign, seq.direction])
          );

          // Stop times for this trip
          let cumulativeSecs = startSecs + departureOffset;
          for (const stop of seq.stops) {
            const arrival = addSeconds("00:00:00", cumulativeSecs);
            const dwell = stop.dwellTimeSecs ?? 30;
            const departure = addSeconds("00:00:00", cumulativeSecs + dwell);

            stopTimeRows.push(
              csvRow([tripId, arrival, departure, stop.stopId, stop.sequence, 0, 0])
            );

            cumulativeSecs += dwell + (stop.travelTimeSecs ?? 0);
          }

          departureOffset += freq.headwaySecs;
          tripIndex++;
        }
      }
    }
  }

  writeFile(outDir, "trips.txt", tripHeader, tripRows);
  writeFile(outDir, "stop_times.txt", stopTimeHeader, stopTimeRows);
}

function exportCalendar(ctm: CtmSystem, outDir: string) {
  const header =
    "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date";
  const rows = ctm.services.map((s) =>
    csvRow([
      s.id,
      s.days.monday ? 1 : 0,
      s.days.tuesday ? 1 : 0,
      s.days.wednesday ? 1 : 0,
      s.days.thursday ? 1 : 0,
      s.days.friday ? 1 : 0,
      s.days.saturday ? 1 : 0,
      s.days.sunday ? 1 : 0,
      s.startDate,
      s.endDate,
    ])
  );
  writeFile(outDir, "calendar.txt", header, rows);
  // Empty calendar_dates.txt (no exceptions in this version)
  writeFile(outDir, "calendar_dates.txt", "service_id,date,exception_type", []);
}

function exportTransfers(ctm: CtmSystem, outDir: string) {
  const header =
    "from_stop_id,to_stop_id,transfer_type,min_transfer_time";
  const rows = ctm.transfers.map((t) =>
    csvRow([t.fromStopId, t.toStopId, t.type, t.minTransferTimeSecs ?? ""])
  );
  // Reverse direction too
  const reverseRows = ctm.transfers.map((t) =>
    csvRow([t.toStopId, t.fromStopId, t.type, t.minTransferTimeSecs ?? ""])
  );
  writeFile(outDir, "transfers.txt", header, [...rows, ...reverseRows]);
}

function exportShapes(ctm: CtmSystem, outDir: string) {
  // If sequences have shape points, export them
  // Currently our CTM has no shape points — write empty file with note
  const header = "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled";
  writeFile(outDir, "shapes.txt", header, []);
  console.log("    ⚠ shapes.txt is empty — shape interpolation from coordinates is a backlog task (geometry/shapes.ts)");
}

function exportFeedInfo(ctm: CtmSystem, outDir: string) {
  const header =
    "feed_publisher_name,feed_publisher_url,feed_lang,default_lang,feed_start_date,feed_end_date,feed_version,feed_contact_email";
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rows = [
    csvRow([
      "MetroRadar / TransitOS TDSE",
      "https://github.com/Gautam2665/MetroRadar",
      "en",
      "en",
      ctm.services[0]?.startDate || today,
      ctm.services[0]?.endDate || today,
      `TDSE_v0.6.5_${today}`,
      "",
    ]),
  ];
  writeFile(outDir, "feed_info.txt", header, rows);
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const ctmArg = args[args.indexOf("--ctm") + 1] || "datasets/mumbai/normalized/ctm.json";
  const outArg = args[args.indexOf("--out") + 1] || "datasets/mumbai/gtfs";

  const ctmPath = path.resolve(ctmArg);
  const outDir = path.resolve(outArg);

  if (!fs.existsSync(ctmPath)) {
    console.error(`❌ CTM file not found: ${ctmPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("\n🚇 TDSE GTFS Export");
  console.log(`   CTM source : ${ctmPath}`);
  console.log(`   GTFS output: ${outDir}\n`);

  const ctm: CtmSystem = JSON.parse(fs.readFileSync(ctmPath, "utf-8"));

  console.log(`📋 System: ${ctm.metadata.displayName} (${ctm.metadata.systemCode})`);
  console.log(`   Agencies  : ${ctm.agencies.length}`);
  console.log(`   Stops     : ${ctm.stops.length}`);
  console.log(`   Routes    : ${ctm.routes.length}`);
  console.log(`   Sequences : ${ctm.sequences.length}`);
  console.log(`   Services  : ${ctm.services.length}`);
  console.log(`   Transfers : ${ctm.transfers.length}`);
  console.log(`   License   : ${ctm.metadata.dataLicense}\n`);

  console.log("📁 Generating GTFS files...");
  exportAgency(ctm, outDir);
  exportStops(ctm, outDir);
  exportRoutes(ctm, outDir);
  exportTripsAndStopTimes(ctm, outDir);
  exportCalendar(ctm, outDir);
  exportTransfers(ctm, outDir);
  exportShapes(ctm, outDir);
  exportFeedInfo(ctm, outDir);

  console.log("\n✅ GTFS export complete.");
  console.log(`   Output: ${outDir}`);
  console.log("\n⚠️  Confidence notes:");
  console.log("   Stop times are synthesized from headway frequencies (X1 — confidence 0.55–0.65).");
  console.log("   Shapes are empty — run geometry/shapes.ts to interpolate from stop coordinates.");
  console.log("   Run tdse/validation/index.ts to validate before ingesting into Journey Engine.");
}

main();
