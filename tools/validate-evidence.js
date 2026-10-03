const fs = require('fs');
const path = require('path');

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

    if (!r.source || !r.source.sourceId) {
      errors.push({ evidenceId: r.evidenceId, message: 'Missing source.sourceId' });
    } else {
      const src = sourceMap.get(r.source.sourceId);
      if (!src) {
        errors.push({ evidenceId: r.evidenceId, message: `Source '${r.source.sourceId}' not registered in source catalog` });
      } else if (src.authorityLevel === 'SECONDARY' && r.confidence > 0.6) {
        errors.push({
          evidenceId: r.evidenceId,
          message: `Secondary source '${r.source.sourceId}' cannot claim confidence > 0.6 (claimed ${r.confidence})`,
        });
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

function main() {
  console.log('\n🔬 TDSE Evidence System — Validation & Provenance Audit');
  console.log('────────────────────────────────────────────────────────────');

  const sourcesPath = path.resolve('datasets/mumbai/sources/catalog.json');
  const evidencePath = path.resolve('datasets/mumbai/evidence/A-network-evidence.json');
  const gapsPath = path.resolve('datasets/mumbai/evidence/knowledge-gaps.json');

  if (!fs.existsSync(sourcesPath) || !fs.existsSync(evidencePath)) {
    console.error('❌ Evidence or Source catalog files not found.');
    process.exit(1);
  }

  const sourcesCatalog = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  const evidenceRecords = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
  const knowledgeGaps = fs.existsSync(gapsPath) ? JSON.parse(fs.readFileSync(gapsPath, 'utf-8')) : [];

  console.log(`📋 Source Catalog : ${sourcesCatalog.sources.length} sources registered`);
  for (const s of sourcesCatalog.sources) {
    console.log(`   [${s.sourceId}] ${s.shortName} (${s.authorityLevel}) — ${s.type}`);
  }

  console.log(`\n📄 Extracted Facts : ${evidenceRecords.length} records in A-network-evidence.json`);
  console.log(`⚠️  Knowledge Gaps  : ${knowledgeGaps.length} gaps identified in knowledge-gaps.json`);

  const result = validateEvidence(evidenceRecords, sourcesCatalog.sources);

  console.log('\n' + '─'.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('─'.repeat(60));

  if (result.valid) {
    console.log('✅ All evidence records passed schema & authority validation (0 errors).');
  } else {
    console.log(`❌ Validation errors found (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`   [${err.evidenceId}] ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) {
      console.log(`   [${w.evidenceId}] ${w.message}`);
    }
  }

  let direct = 0, derived = 0, estimated = 0, totalConfidence = 0;
  for (const r of evidenceRecords) {
    if (r.evidenceType === 'DIRECT') direct++;
    else if (r.evidenceType === 'DERIVED') derived++;
    else if (r.evidenceType === 'ESTIMATED') estimated++;
    totalConfidence += r.confidence;
  }
  const avgConf = (totalConfidence / evidenceRecords.length).toFixed(2);
  const totalSlots = evidenceRecords.length + knowledgeGaps.length;
  const completionPct = ((evidenceRecords.length / totalSlots) * 100).toFixed(1);

  console.log('\n' + '─'.repeat(60));
  console.log('CATEGORY A — NETWORK TOPOLOGY AUDIT SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  Category               : A_NETWORK`);
  console.log(`  Total Extracted Facts   : ${evidenceRecords.length}`);
  console.log(`  Direct Facts (from DPR): ${direct}`);
  console.log(`  Derived Facts          : ${derived}`);
  console.log(`  Estimated Facts        : ${estimated}`);
  console.log(`  Average Confidence     : ${avgConf}`);
  console.log(`  Open Knowledge Gaps    : ${knowledgeGaps.length}`);
  console.log(`  Category Completion    : ${completionPct}%\n`);

  if (!result.valid) {
    process.exit(1);
  }
}

main();
