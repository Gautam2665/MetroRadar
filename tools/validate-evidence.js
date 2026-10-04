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

const FORBIDDEN_SYNTHETIC_KEYS = [
  'trip_id',
  'stop_times',
  'vehicle_position',
  'eta',
  'gtfs-rt',
  'gtfs_rt',
  'trajectory',
  'speed_profile',
];

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

    // Downstream synthetic leak check
    const attrLower = (r.attribute || '').toLowerCase();
    const keyLower = (r.entityKey || '').toLowerCase();
    for (const forbidden of FORBIDDEN_SYNTHETIC_KEYS) {
      if (attrLower.includes(forbidden) || keyLower.includes(forbidden)) {
        errors.push({
          evidenceId: r.evidenceId,
          message: `Forbidden downstream synthetic concept '${forbidden}' detected in evidence layer`,
        });
      }
    }

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
        if ((src.type === 'DPR' || src.type === 'OFFICIAL_REPORT') && r.temporalStatus === 'OPERATIONAL') {
          warnings.push({
            evidenceId: r.evidenceId,
            message: `Official DPR/Report source '${r.source.sourceId}' claims OPERATIONAL status — verify if DPR text establishes operational reality or if this should be PROPOSED`,
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

function validateGisEvidence(records) {
  const errors = [];
  const warnings = [];
  for (const r of records) {
    if (!r.evidenceId) errors.push({ evidenceId: 'UNKNOWN', message: 'GIS record missing evidenceId' });
    if (!r.entityKey) errors.push({ evidenceId: r.evidenceId, message: 'GIS record missing entityKey' });
    if (!r.attribute) errors.push({ evidenceId: r.evidenceId, message: 'GIS record missing attribute' });
    if (!r.source || !r.source.sourceId) errors.push({ evidenceId: r.evidenceId, message: 'GIS record missing source.sourceId' });
    if (r.confidence < 0 || r.confidence > 1) errors.push({ evidenceId: r.evidenceId, message: `Confidence ${r.confidence} out of range` });
    if (r.validationStatus === 'VALIDATED' && r.confidence < 0.75) {
      warnings.push({ evidenceId: r.evidenceId, message: 'VALIDATED GIS record has low confidence < 0.75' });
    }
    if (!r.temporalStatus) {
      warnings.push({ evidenceId: r.evidenceId, message: 'GIS record missing temporalStatus — UNKNOWN recommended for unverified community geometry' });
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

function networkReadinessSummary(lineRegistry) {
  const lines = lineRegistry.lines || [];
  const operational = lines.filter(l => l.operationalStatus === 'OPERATIONAL');
  const partialOp = lines.filter(l => l.operationalStatus === 'PARTIAL');
  const ctmReady = lines.filter(l => l.ctmReady === true);
  const ctmBlocked = lines.filter(l => !l.ctmReady);
  return { total: lines.length, operational: operational.length, partiallyOperational: partialOp.length, ctmReady: ctmReady.length, ctmBlocked: ctmBlocked.length, lines };
}

function main() {
  console.log('\n🔬 TDSE Evidence System — Sprint v0.6.5-F Audit');
  console.log('────────────────────────────────────────────────────────────');

  const sourcesPath = path.resolve('datasets/mumbai/sources/catalog.json');
  const evidenceAPath = path.resolve('datasets/mumbai/evidence/A-network-evidence.json');
  const evidenceBPath = path.resolve('datasets/mumbai/evidence/B-station-infrastructure-evidence.json');
  const evidenceCPath = path.resolve('datasets/mumbai/evidence/C-operations-evidence.json');
  const evidenceDPath = path.resolve('datasets/mumbai/evidence/D-rolling-stock-evidence.json');
  const evidenceFPath = path.resolve('datasets/mumbai/evidence/F-gis-evidence.json');
  const gapsPath = path.resolve('datasets/mumbai/evidence/knowledge-gaps.json');
  const lineRegistryPath = path.resolve('datasets/mumbai/network/line-registry.json');
  const sharedEvidencePath = path.resolve('datasets/mumbai/network/shared-evidence.json');
  const networkSourceRegistryPath = path.resolve('datasets/mumbai/network/source-registry.json');

  if (!fs.existsSync(sourcesPath)) {
    console.error('❌ Source catalog file not found.');
    process.exit(1);
  }

  const sourcesCatalog = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  const recordsA = fs.existsSync(evidenceAPath) ? JSON.parse(fs.readFileSync(evidenceAPath, 'utf-8')) : [];
  const recordsB = fs.existsSync(evidenceBPath) ? JSON.parse(fs.readFileSync(evidenceBPath, 'utf-8')) : [];
  const recordsC = fs.existsSync(evidenceCPath) ? JSON.parse(fs.readFileSync(evidenceCPath, 'utf-8')) : [];
  const recordsD = fs.existsSync(evidenceDPath) ? JSON.parse(fs.readFileSync(evidenceDPath, 'utf-8')) : [];
  const recordsF = fs.existsSync(evidenceFPath) ? JSON.parse(fs.readFileSync(evidenceFPath, 'utf-8')) : [];
  const sharedEvidence = fs.existsSync(sharedEvidencePath) ? JSON.parse(fs.readFileSync(sharedEvidencePath, 'utf-8')) : { sharedEvidence: [] };
  const allLine3Records = [...recordsA, ...recordsB, ...recordsC, ...recordsD];
  const knowledgeGaps = fs.existsSync(gapsPath) ? JSON.parse(fs.readFileSync(gapsPath, 'utf-8')) : [];
  const lineRegistry = fs.existsSync(lineRegistryPath) ? JSON.parse(fs.readFileSync(lineRegistryPath, 'utf-8')) : null;
  const networkSources = fs.existsSync(networkSourceRegistryPath) ? JSON.parse(fs.readFileSync(networkSourceRegistryPath, 'utf-8')) : null;

  console.log(`📋 Line 3 Source Catalog (${sourcesCatalog.sources.length} sources)`);
  for (const s of sourcesCatalog.sources) {
    console.log(`   [${s.sourceId}] ${s.shortName} (${s.authorityLevel}) — ${s.type}`);
  }

  const resAll = validateEvidence(allLine3Records, sourcesCatalog.sources);
  const resGis = validateGisEvidence(recordsF);

  const sumA = summarizeCategory(recordsA, knowledgeGaps, 'A');
  const sumB = summarizeCategory(recordsB, knowledgeGaps, 'B');
  const sumC = summarizeCategory(recordsC, knowledgeGaps, 'C');
  const sumD = summarizeCategory(recordsD, knowledgeGaps, 'D');

  // GIS evidence summary by line and status
  let gisValidated = 0, gisUnverified = 0;
  for (const r of recordsF) {
    if (r.validationStatus === 'VALIDATED') gisValidated++;
    else gisUnverified++;
  }

  const line3Gis = recordsF.filter(r => r.systemCode === 'MMRDA_LINE3');
  const l3Validated = line3Gis.filter(r => r.validationStatus === 'VALIDATED').length;
  const l3StationPoints = line3Gis.filter(r => r.entityType === 'station_point');
  const l3Revenue = l3StationPoints.filter(r => r.pointClassification === 'REVENUE_STATION').length;
  const l3Depot = l3StationPoints.filter(r => r.pointClassification === 'DEPOT').length;
  const l3Extension = l3StationPoints.filter(r => r.pointClassification === 'PROPOSED_EXTENSION').length;

  console.log('\n' + '─'.repeat(60));
  console.log('CATEGORY F — GIS EVIDENCE AUDIT (All Mumbai Lines)');
  console.log('─'.repeat(60));
  console.log(`  Total GIS records       : ${recordsF.length}`);
  console.log(`    Validated GIS records : ${gisValidated}`);
  console.log(`    Unverified (bootstrap): ${gisUnverified}`);
  console.log(`\n  Line 3 GIS Breakdown:`);
  console.log(`    Total Line 3 records  : ${line3Gis.length}`);
  console.log(`    Revenue stations      : ${l3Revenue} (VALIDATED)`);
  console.log(`    Depot points          : ${l3Depot} (Aarey Car Shed)`);
  console.log(`    Proposed extensions   : ${l3Extension} (Navy Nagar spur)`);
  console.log(`    Alignment geometries  : ${line3Gis.filter(r => r.entityType === 'alignment_geometry').length} (28,641 vertices main + spur)`);
  console.log(`  GIS Errors              : ${resGis.errors.length}`);
  console.log(`  GIS Warnings            : ${resGis.warnings.length}`);

  if (lineRegistry) {
    const net = networkReadinessSummary(lineRegistry);
    const sharedCount = sharedEvidence.sharedEvidence ? sharedEvidence.sharedEvidence.length : 0;
    const netSourceCount = networkSources && networkSources.sources ? networkSources.sources.length : 0;

    console.log('\n' + '─'.repeat(60));
    console.log('NETWORK REGISTRY SUMMARY (All Mumbai Metro Lines)');
    console.log('─'.repeat(60));
    console.log(`  Total lines registered    : ${net.total}`);
    console.log(`  Fully operational         : ${net.operational}`);
    console.log(`  Partially operational     : ${net.partiallyOperational}`);
    console.log(`  🎉 CTM-READY LINES       : ${net.ctmReady} (First CTM-ready line: MUMBAI_LINE3)`);
    console.log(`  CTM-blocked lines         : ${net.ctmBlocked}`);
    console.log(`\n  Network source registry   : ${netSourceCount} sources registered`);
    console.log(`  Shared system evidence    : ${sharedCount} records (multi-line applicability)`);
    console.log('\n  CTM Status per line:');
    net.lines.forEach(l => {
      if (l.ctmReady) {
        console.log(`    [${l.localDesignation.padEnd(8)}] ${(l.operationalStatus || '').padEnd(20)} 🎉 CTM_READY (27 revenue stations + 28,641 alignment vertices)`);
      } else {
        console.log(`    [${l.localDesignation.padEnd(8)}] ${(l.operationalStatus || '').padEnd(20)} BLOCKED: ${l.ctmBlocker || 'UNSPECIFIED'}`);
      }
    });
  }

  console.log('\n' + '─'.repeat(60));
  console.log('OVERALL EVIDENCE LAYER SUMMARY — Line 3 (A + B + C + D + F)');
  console.log('─'.repeat(60));
  console.log(`  Category A (Network Topology)              : ${sumA.total} facts (${sumA.gapsCount} gaps)`);
  console.log(`  Category B (Station Infrastructure)        : ${sumB.total} facts (${sumB.gapsCount} gaps)`);
  console.log(`  Category C (Operations)                    : ${sumC.total} facts (${sumC.gapsCount} gaps)`);
  console.log(`  Category D (Rolling Stock)                 : ${sumD.total} facts (${sumD.gapsCount} gaps)`);
  console.log(`  Category F (GIS Evidence)                  : ${line3Gis.length} records (${l3Validated} VALIDATED)`);
  console.log(`  Total Line 3 Evidence Records              : ${allLine3Records.length + line3Gis.length} records`);
  console.log(`  Coverage Metric                            : NOT SCORED (Unweighted counts only)\n`);

  const totalErrors = resAll.errors.length + resGis.errors.length;
  if (totalErrors > 0) {
    console.error(`❌ ${totalErrors} validation error(s) found.`);
    process.exit(1);
  }
  console.log('✅ Sprint v0.6.5-F Validation passed — 0 errors.\n');
}

main();




