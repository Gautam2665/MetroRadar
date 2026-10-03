const fs = require('fs');
const path = require('path');

const VALID_TEMPORAL_STATUSES = new Set([
  'PROPOSED',
  'APPROVED',
  'UNDER_CONSTRUCTION',
  'OPERATIONAL',
  'HISTORICAL',
  'UNKNOWN',
]);

function validateEvidence(records, sources) {
  const errors = [];
  const warnings = [];
  const sourceMap = new Map(sources.map((s) => [s.sourceId, s]));

  for (const r of records) {
    if (!r.evidenceId) errors.push({ evidenceId: r.evidenceId || 'UNKNOWN', message: 'Missing evidenceId' });
    if (!r.entityType) errors.push({ evidenceId: r.evidenceId, message: 'Missing entityType' });
    if (!r.entityKey) errors.push({ evidenceId: r.evidenceId, message: 'Missing entityKey' });
    if (!r.attribute) errors.push({ evidenceId: r.evidenceId, message: 'Missing attribute' });
    if (r.value === undefined || r.value === null) errors.push({ evidenceId: r.evidenceId, message: 'Missing value' });

    if (!r.temporalStatus) {
      errors.push({ evidenceId: r.evidenceId, message: 'Missing temporalStatus' });
    } else if (!VALID_TEMPORAL_STATUSES.has(r.temporalStatus)) {
      errors.push({ evidenceId: r.evidenceId, message: `Invalid temporalStatus '${r.temporalStatus}'` });
    }

    if (!r.source || !r.source.sourceId) {
      errors.push({ evidenceId: r.evidenceId, message: 'Missing source.sourceId' });
    } else {
      const src = sourceMap.get(r.source.sourceId);
      if (!src) {
        errors.push({ evidenceId: r.evidenceId, message: `Source '${r.source.sourceId}' not registered in source catalog` });
      } else {
        if (src.authorityLevel === 'SECONDARY' && r.confidence > 0.6) {
          errors.push({
            evidenceId: r.evidenceId,
            message: `Secondary source '${r.source.sourceId}' cannot claim confidence > 0.6 (claimed ${r.confidence})`,
          });
        }
        if (src.type === 'DPR' && r.temporalStatus === 'OPERATIONAL') {
          warnings.push({
            evidenceId: r.evidenceId,
            message: `DPR source '${r.source.sourceId}' (2011) claims OPERATIONAL status — verify if DPR text establishes operational reality or if this should be PROPOSED`,
          });
        }
      }
    }

    if (r.evidenceType === 'DIRECT' && (!r.source?.page && !r.source?.section && !r.source?.table)) {
      warnings.push({
        evidenceId: r.evidenceId,
        message: 'DIRECT evidence record missing page/section/table reference',
      });
    }

    if (r.confidence < 0.0 || r.confidence > 1.0) {
      errors.push({
        evidenceId: r.evidenceId,
        message: `Confidence ${r.confidence} out of valid range [0.0, 1.0]`,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function summarizeCategory(records, gaps, catName) {
  let direct = 0, derived = 0, estimated = 0;
  const temporalCounts = {
    PROPOSED: 0, APPROVED: 0, UNDER_CONSTRUCTION: 0, OPERATIONAL: 0, HISTORICAL: 0, UNKNOWN: 0
  };

  for (const r of records) {
    if (r.evidenceType === 'DIRECT') direct++;
    else if (r.evidenceType === 'DERIVED') derived++;
    else if (r.evidenceType === 'ESTIMATED') estimated++;

    const st = r.temporalStatus || 'UNKNOWN';
    if (temporalCounts[st] !== undefined) temporalCounts[st]++;
    else temporalCounts.UNKNOWN++;
  }

  return {
    total: records.length,
    direct,
    derived,
    estimated,
    temporalCounts,
    gapsCount: gaps.filter((g) => g.category.startsWith(catName)).length,
  };
}

function main() {
  console.log('\n🔬 TDSE Evidence System — Sprint v0.6.5-B Audit');
  console.log('────────────────────────────────────────────────────────────');

  const sourcesPath = path.resolve('datasets/mumbai/sources/catalog.json');
  const evidenceAPath = path.resolve('datasets/mumbai/evidence/A-network-evidence.json');
  const evidenceBPath = path.resolve('datasets/mumbai/evidence/B-station-infrastructure-evidence.json');
  const gapsPath = path.resolve('datasets/mumbai/evidence/knowledge-gaps.json');

  if (!fs.existsSync(sourcesPath)) {
    console.error('❌ Source catalog file not found.');
    process.exit(1);
  }

  const sourcesCatalog = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  const recordsA = fs.existsSync(evidenceAPath) ? JSON.parse(fs.readFileSync(evidenceAPath, 'utf-8')) : [];
  const recordsB = fs.existsSync(evidenceBPath) ? JSON.parse(fs.readFileSync(evidenceBPath, 'utf-8')) : [];
  const allRecords = [...recordsA, ...recordsB];
  const knowledgeGaps = fs.existsSync(gapsPath) ? JSON.parse(fs.readFileSync(gapsPath, 'utf-8')) : [];

  console.log(`📋 Source Catalog`);
  for (const s of sourcesCatalog.sources) {
    console.log(`   [${s.sourceId}] ${s.shortName} (${s.authorityLevel}) — ${s.type}`);
  }

  const resAll = validateEvidence(allRecords, sourcesCatalog.sources);

  const sumA = summarizeCategory(recordsA, knowledgeGaps, 'A');
  const sumB = summarizeCategory(recordsB, knowledgeGaps, 'B');

  console.log('\n' + '─'.repeat(60));
  console.log('CATEGORY B — STATION INFRASTRUCTURE AUDIT REPORT');
  console.log('─'.repeat(60));
  console.log(`  Total extracted facts : ${sumB.total}`);
  console.log(`\n  Evidence Type`);
  console.log(`    DIRECT              : ${sumB.direct}`);
  console.log(`    DERIVED             : ${sumB.derived}`);
  console.log(`    ESTIMATED           : ${sumB.estimated}`);
  console.log(`\n  Temporal Status`);
  console.log(`    PROPOSED            : ${sumB.temporalCounts.PROPOSED}`);
  console.log(`    APPROVED            : ${sumB.temporalCounts.APPROVED}`);
  console.log(`    UNDER_CONSTRUCTION  : ${sumB.temporalCounts.UNDER_CONSTRUCTION}`);
  console.log(`    OPERATIONAL         : ${sumB.temporalCounts.OPERATIONAL}`);
  console.log(`    HISTORICAL          : ${sumB.temporalCounts.HISTORICAL}`);
  console.log(`    UNKNOWN             : ${sumB.temporalCounts.UNKNOWN}`);
  console.log(`\n  Knowledge Gaps`);
  console.log(`    B-specific gaps     : ${sumB.gapsCount}`);
  console.log(`\n  Validation Results`);
  console.log(`    Errors              : ${resAll.errors.length}`);
  console.log(`    Warnings            : ${resAll.warnings.length}`);

  console.log('\n' + '─'.repeat(60));
  console.log('OVERALL EVIDENCE LAYER SUMMARY (A + B)');
  console.log('─'.repeat(60));
  console.log(`  Category A (Network Topology)              : ${sumA.total} facts (${sumA.gapsCount} gaps)`);
  console.log(`  Category B (Station Infrastructure)        : ${sumB.total} facts (${sumB.gapsCount} gaps)`);
  console.log(`  Total Validated Evidence Records           : ${allRecords.length} records`);
  console.log(`  Coverage Metric                            : NOT SCORED (Unweighted counts only)\n`);

  if (!resAll.valid) {
    process.exit(1);
  }
}

main();
