#!/usr/bin/env ts-node
/**
 * TDSE Evidence Validation & Provenance Runner
 *
 * Validates extracted evidence records against the Source Catalog and schema rules,
 * and prints a Category summary report.
 *
 * Usage:
 *   npx ts-node tools/validate-evidence.ts
 *
 * Sprint v0.6.5-A
 */

import * as fs from "fs";
import * as path from "path";
import { EvidenceValidator } from "../tdse/evidence/validator.js";
import { EvidenceProvenanceTracker } from "../tdse/evidence/provenance.js";
import { EvidenceRecord, SourceRecord, KnowledgeGapRecord } from "../tdse/evidence/schema.js";

function main() {
  console.log("\n🔬 TDSE Evidence System — Validation & Provenance Audit");
  console.log("────────────────────────────────────────────────────────────");

  const sourcesPath = path.resolve("datasets/mumbai/sources/catalog.json");
  const evidencePath = path.resolve("datasets/mumbai/evidence/A-network-evidence.json");
  const gapsPath = path.resolve("datasets/mumbai/evidence/knowledge-gaps.json");

  if (!fs.existsSync(sourcesPath) || !fs.existsSync(evidencePath)) {
    console.error("❌ Evidence or Source catalog files not found.");
    process.exit(1);
  }

  const sourcesCatalog: { sources: SourceRecord[] } = JSON.parse(fs.readFileSync(sourcesPath, "utf-8"));
  const evidenceRecords: EvidenceRecord[] = JSON.parse(fs.readFileSync(evidencePath, "utf-8"));
  const knowledgeGaps: KnowledgeGapRecord[] = fs.existsSync(gapsPath)
    ? JSON.parse(fs.readFileSync(gapsPath, "utf-8"))
    : [];

  console.log(`📋 Source Catalog : ${sourcesCatalog.sources.length} sources registered`);
  for (const s of sourcesCatalog.sources) {
    console.log(`   [${s.sourceId}] ${s.shortName} (${s.authorityLevel}) — ${s.type}`);
  }

  console.log(`\n📄 Extracted Facts : ${evidenceRecords.length} records in A-network-evidence.json`);
  console.log(`⚠️  Knowledge Gaps  : ${knowledgeGaps.length} gaps identified in knowledge-gaps.json`);

  // Run Validator
  const result = EvidenceValidator.validate(evidenceRecords, sourcesCatalog.sources);

  console.log("\n" + "─".repeat(60));
  console.log("VALIDATION RESULTS");
  console.log("─".repeat(60));

  if (result.valid) {
    console.log("✅ All evidence records passed schema & authority validation (0 errors).");
  } else {
    console.log(`❌ Validation errors found (${result.summary.errorCount}):`);
    for (const err of result.errors) {
      console.log(`   [${err.evidenceId}] ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.summary.warningCount}):`);
    for (const w of result.warnings) {
      console.log(`   [${w.evidenceId}] ${w.message}`);
    }
  }

  // Summary Report
  const summary = EvidenceProvenanceTracker.generateCategorySummary(
    "A_NETWORK",
    evidenceRecords,
    knowledgeGaps.length
  );

  console.log("\n" + "─".repeat(60));
  console.log("CATEGORY A — NETWORK TOPOLOGY AUDIT SUMMARY");
  console.log("─".repeat(60));
  console.log(`  Category               : ${summary.category}`);
  console.log(`  Total Extracted Facts   : ${summary.totalFacts}`);
  console.log(`  Direct Facts (from DPR): ${summary.directFacts}`);
  console.log(`  Derived Facts          : ${summary.derivedFacts}`);
  console.log(`  Estimated Facts        : ${summary.estimatedFacts}`);
  console.log(`  Average Confidence     : ${summary.averageConfidence}`);
  console.log(`  Open Knowledge Gaps    : ${summary.knowledgeGaps}`);
  console.log(`  Category Completion    : ${summary.completionPercentage}%\n`);

  if (!result.valid) {
    process.exit(1);
  }
}

main();
