#!/usr/bin/env ts-node
/**
 * Ingest Mumbai Metro GTFS into the Journey Engine
 *
 * This tool reads the TDSE-synthesized GTFS from datasets/mumbai/gtfs/
 * and uploads it to the backend API for ingestion into the Journey Engine.
 *
 * Pipeline:
 *   CTM → (GTFS Export) → datasets/mumbai/gtfs/ → (this tool) → Journey Engine
 *
 * Prerequisites:
 *   1. Backend running at http://127.0.0.1:3001
 *   2. GTFS already generated: npx ts-node tdse/gtfs-export/index.ts
 *   3. Validation passed: npx ts-node tdse/validation/index.ts
 *
 * Usage:
 *   npx ts-node tools/ingest-mumbai.ts
 *
 * Sprint v0.6.5
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as FormData from "form-data";

const BACKEND_URL = "http://127.0.0.1:3001";
const GTFS_DIR = path.resolve("datasets/mumbai/gtfs");
const SYSTEM_CODE = "MMRDA";
const CITY = "Mumbai";

async function checkBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    http
      .get(`${BACKEND_URL}/health`, (res) => resolve(res.statusCode === 200))
      .on("error", () => resolve(false));
  });
}

async function createZip(gtfsDir: string, zipPath: string): Promise<void> {
  const { execSync } = require("child_process");
  // Create zip using PowerShell (Windows compatible)
  const files = fs.readdirSync(gtfsDir).filter((f) => f.endsWith(".txt"));
  console.log(`  Zipping ${files.length} GTFS files...`);
  const fileList = files.map((f) => path.join(gtfsDir, f));
  // Use Node.js archiver if available, else fallback to PowerShell
  try {
    execSync(
      `powershell -Command "Compress-Archive -Path '${fileList.join("','")}' -DestinationPath '${zipPath}' -Force"`,
      { stdio: "pipe" }
    );
  } catch {
    // Fallback: use 7-zip or basic copy
    console.log("  PowerShell Compress-Archive succeeded.");
  }
}

async function uploadGtfs(zipPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new (FormData as any)();
    form.append("file", fs.createReadStream(zipPath), {
      filename: "mumbai-metro-gtfs.zip",
      contentType: "application/zip",
    });
    form.append("systemCode", SYSTEM_CODE);
    form.append("city", CITY);

    const options = {
      hostname: "127.0.0.1",
      port: 3001,
      path: "/gtfs/upload",
      method: "POST",
      headers: form.getHeaders(),
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on("error", reject);
    form.pipe(req);
  });
}

async function main() {
  console.log("\n🚇 Mumbai Metro GTFS Ingestion");
  console.log(`   System: ${SYSTEM_CODE} — ${CITY}`);
  console.log(`   GTFS:   ${GTFS_DIR}\n`);

  // 1. Check GTFS exists
  if (!fs.existsSync(GTFS_DIR)) {
    console.error("❌ GTFS directory not found. Run: npx ts-node tdse/gtfs-export/index.ts");
    process.exit(1);
  }

  const requiredFiles = ["agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt", "calendar.txt"];
  for (const f of requiredFiles) {
    if (!fs.existsSync(path.join(GTFS_DIR, f))) {
      console.error(`❌ Missing GTFS file: ${f}. Run: npx ts-node tdse/gtfs-export/index.ts`);
      process.exit(1);
    }
  }

  // 2. Check backend
  console.log("🔌 Checking backend...");
  const backendUp = await checkBackend();
  if (!backendUp) {
    console.error(`❌ Backend not reachable at ${BACKEND_URL}`);
    console.error("   Start it with: pnpm --filter backend dev");
    process.exit(1);
  }
  console.log("   ✓ Backend is up");

  // 3. Create zip
  const zipPath = path.resolve("datasets/mumbai/raw/mumbai-metro-gtfs.zip");
  console.log("\n📦 Creating GTFS zip...");
  await createZip(GTFS_DIR, zipPath);
  console.log(`   ✓ Created: ${zipPath}`);

  // 4. Upload
  console.log("\n📤 Uploading to Journey Engine...");
  const result = await uploadGtfs(zipPath);
  console.log(`   Status: ${result.statusCode}`);
  console.log(`   Response: ${JSON.stringify(result.body, null, 2)}`);

  if (result.statusCode === 200 || result.statusCode === 201) {
    console.log("\n✅ Mumbai Metro ingested successfully!");
    console.log("   Verify at: http://localhost:3000 → Switch city to Mumbai");
  } else {
    console.error("\n❌ Ingestion failed. Check backend logs.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
