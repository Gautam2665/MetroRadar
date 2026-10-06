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

function validateLine2bPhase1(ctm, crosswalk, sources) {
  const errors = [];
  const warnings = [];
  const stations = ctm?.stations ?? [];
  const rows = crosswalk?.records ?? [];
  const expectedSequences = [15, 16, 17, 18, 19, 20];
  if (ctm?.lineId !== 'MUMBAI_LINE2B') errors.push('Line 2B partial CTM has the wrong lineId.');
  if (stations.length !== 6 || rows.length !== 6) errors.push('Line 2B operational slice must contain exactly six operator-confirmed stations.');
  if (JSON.stringify(stations.map((s) => s.sequence)) !== JSON.stringify(expectedSequences)) {
    errors.push('Line 2B operating slice must preserve MMRDA route positions 15–20.');
  }
  if (new Set(stations.map((s) => s.canonicalId)).size !== stations.length) errors.push('Line 2B CTM has duplicate station IDs.');
  if (ctm?.scheduleStatus !== 'BLOCKED_SOURCE_REQUIRED' || ctm?.commercialRuntimeSeconds !== null) {
    errors.push('Line 2B must not invent an unsupported current schedule/runtime.');
  }
  if (ctm?.alignmentGeometry?.coordinates?.length !== ctm?.alignmentGeometry?.vertexCount || ctm?.alignmentGeometry?.coordinates?.length < 2) {
    errors.push('Line 2B operational alignment geometry count is invalid.');
  }
  if (!sources.some((s) => s.sourceId === 'SRC-USER-L2B-KML')) errors.push('Supplied Line 2B KML source is not registered.');
  for (let i = 0; i < stations.length; i += 1) {
    const station = stations[i];
    const row = rows[i];
    if (row?.operationalStationId !== station.canonicalId || row?.dprEntityKey !== station.provenance?.dprEntityKey) {
      errors.push(`Line 2B station/crosswalk mismatch at route sequence ${station.sequence}.`);
    }
    if (!Number.isFinite(row?.distanceToOfficialRouteMeters) || row.distanceToOfficialRouteMeters > 200) {
      errors.push(`Line 2B KML point is not adequately cross-checked to the ArcGIS route at ${station.name}.`);
    }
    if (station.stationInfrastructure?.currentLevelCount !== null || station.stationInfrastructure?.currentPlatformCount !== null || station.physicalLayout?.platformCount !== null) {
      errors.push(`Line 2B ${station.name} incorrectly promotes proposed platform/level facts as current as-built P1.`);
    }
    if (station.stationInfrastructure?.platformNumberingStatus !== 'UNKNOWN_SOURCE_REQUIRED' || station.stationInfrastructure?.screenDoorsInstalled !== null) {
      errors.push(`Line 2B ${station.name} has unsupported current platform semantics.`);
    }
    if (row?.distanceToArcgisStationPointMeters > 200) warnings.push(`${station.name} ArcGIS station-point offset ${row.distanceToArcgisStationPointMeters} m is preserved for review.`);
  }
  if (ctm?.stationGraph?.edges?.some((edge) => edge.travelTimeSeconds !== null || edge.travelTimeStatus !== 'UNKNOWN_SOURCE_REQUIRED')) {
    errors.push('Line 2B topological edges must retain unknown travel times until supported by a current source.');
  }
  return { valid: errors.length === 0, errors, warnings };
}

function validateLine9Phase1(ctm, crosswalk, sources) {
  const errors = [];
  const warnings = [];
  const stations = ctm?.stations ?? [];
  const rows = crosswalk?.records ?? [];
  const expectedIds = ['STN_L7_001', 'STN_L9_001', 'STN_L9_002', 'STN_L9_003'];
  const expectedNames = ['Dahisar (East)', 'Pandhurang Wadi', 'Miragaon', 'Kashigaon'];
  if (ctm?.lineId !== 'MUMBAI_LINE9') errors.push('Line 9 phase-I CTM has the wrong lineId.');
  if (stations.length !== 4 || rows.length !== 4) errors.push('Line 9 phase-I must contain exactly four operational route stations.');
  if (JSON.stringify(stations.map((s) => s.canonicalId)) !== JSON.stringify(expectedIds)) {
    errors.push('Line 9 must reuse Line 7 Dahisar East, followed by three unique Line 9 station entities.');
  }
  if (JSON.stringify(stations.map((s) => s.name)) !== JSON.stringify(expectedNames)) {
    errors.push('Line 9 phase-I station sequence/names do not match current operator order.');
  }
  if (stations[0]?.sharedPhysicalStation !== true || stations.slice(1).some((s) => s.sharedPhysicalStation !== false)) {
    errors.push('Line 9 shared Dahisar East identity must be explicit; downstream stops must remain line-owned.');
  }
  if (ctm?.scheduleStatus !== 'BLOCKED_SOURCE_REQUIRED' || ctm?.commercialRuntimeSeconds !== null) {
    errors.push('Line 9 must not invent an unsupported current schedule/runtime.');
  }
  if (ctm?.alignmentGeometry?.coordinates?.length !== ctm?.alignmentGeometry?.vertexCount || ctm?.alignmentGeometry?.coordinates?.length < 2) {
    errors.push('Line 9 phase-I alignment geometry count is invalid.');
  }
  if (!sources.some((s) => s.sourceId === 'SRC-USER-L9-KML')) errors.push('Supplied Line 9 KML source is not registered.');
  for (let i = 0; i < stations.length; i += 1) {
    const station = stations[i];
    const row = rows[i];
    if (row?.operationalStationId !== station.canonicalId || row?.operatorRouteSequence !== i + 1) {
      errors.push(`Line 9 station/crosswalk mismatch at route sequence ${i + 1}.`);
    }
    if (!Number.isFinite(row?.distanceToOfficialRouteMeters) || row.distanceToOfficialRouteMeters > 100) {
      errors.push(`Line 9 KML point is not adequately cross-checked to the ArcGIS route at ${station.name}.`);
    }
    if (station.physicalLayout?.currentLevelCount !== null || station.physicalLayout?.currentPlatformCount !== null || station.physicalLayout?.screenDoorsInstalled !== null) {
      errors.push(`Line 9 ${station.name} incorrectly promotes design evidence as current as-built P1.`);
    }
    if (station.physicalLayout?.platformNumberingStatus !== 'UNKNOWN_SOURCE_REQUIRED' || station.physicalLayout?.platformDirectionStatus !== 'UNKNOWN_SOURCE_REQUIRED') {
      errors.push(`Line 9 ${station.name} has unsupported current platform semantics.`);
    }
    if (row?.distanceToArcgisStationPointMeters > 200) warnings.push(`${station.name} ArcGIS station-point offset ${row.distanceToArcgisStationPointMeters} m is preserved for review.`);
  }
  if (ctm?.stationGraph?.edges?.some((edge) => edge.travelTimeSeconds !== null || edge.travelTimeStatus !== 'UNKNOWN_SOURCE_REQUIRED')) {
    errors.push('Line 9 topological edges must retain unknown travel times until supported by a current source.');
  }
  if (Math.abs((ctm?.totalDistanceMeters ?? 0) - 4700) > 250) {
    warnings.push(`Line 9 clipped geometry distance ${ctm?.totalDistanceMeters} m differs from MMRDA's published 4,700 m phase length; both source values are retained.`);
  }
  return { valid: errors.length === 0, errors, warnings };
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
  const evidenceA2a7Path = path.resolve('datasets/mumbai/evidence/A-network-l2a-line7-records.json');
  const evidenceB2a7Path = path.resolve('datasets/mumbai/evidence/B-station-infrastructure-l2a-line7-records.json');
  const evidenceA2bPath = path.resolve('datasets/mumbai/evidence/A-network-line2b-records.json');
  const evidenceB2bPath = path.resolve('datasets/mumbai/evidence/B-station-infrastructure-line2b-records.json');
  const evidenceA9Path = path.resolve('datasets/mumbai/evidence/A-network-red-extension-records.json');
  const evidenceB9Path = path.resolve('datasets/mumbai/evidence/B-station-infrastructure-red-extension-records.json');
  const evidenceP1L9Path = path.resolve('datasets/mumbai/evidence/P1-line9-operational-platform-evidence.json');
  const colorFamilyLines = ['line4', 'line4a', 'line5', 'line6', 'line10', 'line11', 'line12'];
  const colorFamilyEvidence = colorFamilyLines.map((line) => ({
    line,
    a: path.resolve(`datasets/mumbai/evidence/A-network-${line}-records.json`),
    b: path.resolve(`datasets/mumbai/evidence/B-station-infrastructure-${line}-records.json`),
  }));
  const gapsPath = path.resolve('datasets/mumbai/evidence/knowledge-gaps.json');
  const lineRegistryPath = path.resolve('datasets/mumbai/network/line-registry.json');
  const sharedEvidencePath = path.resolve('datasets/mumbai/network/shared-evidence.json');
  const networkSourceRegistryPath = path.resolve('datasets/mumbai/network/source-registry.json');
  const gisRegistryPath = path.resolve('datasets/mumbai/network/gis-evidence-registry.json');
  const line2bPhase1CtmPath = path.resolve('datasets/mumbai/normalized/ctm-line2b-phase1.json');
  const line2bPhase1CrosswalkPath = path.resolve('datasets/mumbai/evidence/dpr-operational-station-crosswalk-line2b-phase1.json');
  const line9Phase1CtmPath = path.resolve('datasets/mumbai/normalized/ctm-line9-phase1.json');
  const line9Phase1CrosswalkPath = path.resolve('datasets/mumbai/evidence/dpr-operational-station-crosswalk-line9-phase1.json');

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
  const recordsA2a7 = fs.existsSync(evidenceA2a7Path) ? JSON.parse(fs.readFileSync(evidenceA2a7Path, 'utf-8')) : [];
  const recordsB2a7 = fs.existsSync(evidenceB2a7Path) ? JSON.parse(fs.readFileSync(evidenceB2a7Path, 'utf-8')) : [];
  const recordsA2b = fs.existsSync(evidenceA2bPath) ? JSON.parse(fs.readFileSync(evidenceA2bPath, 'utf-8')) : [];
  const recordsB2b = fs.existsSync(evidenceB2bPath) ? JSON.parse(fs.readFileSync(evidenceB2bPath, 'utf-8')) : [];
  const recordsA9 = fs.existsSync(evidenceA9Path) ? JSON.parse(fs.readFileSync(evidenceA9Path, 'utf-8')) : [];
  const recordsB9 = fs.existsSync(evidenceB9Path) ? JSON.parse(fs.readFileSync(evidenceB9Path, 'utf-8')) : [];
  const recordsP1L9 = fs.existsSync(evidenceP1L9Path) ? JSON.parse(fs.readFileSync(evidenceP1L9Path, 'utf-8')) : [];
  for (const entry of colorFamilyEvidence) {
    entry.recordsA = fs.existsSync(entry.a) ? JSON.parse(fs.readFileSync(entry.a, 'utf-8')) : [];
    entry.recordsB = fs.existsSync(entry.b) ? JSON.parse(fs.readFileSync(entry.b, 'utf-8')) : [];
  }
  const sharedEvidence = fs.existsSync(sharedEvidencePath) ? JSON.parse(fs.readFileSync(sharedEvidencePath, 'utf-8')) : { sharedEvidence: [] };
  const allColorFamilyRecords = colorFamilyEvidence.flatMap((entry) => [...entry.recordsA, ...entry.recordsB]);
  const allEvidenceRecords = [...recordsA, ...recordsB, ...recordsC, ...recordsD, ...recordsA2a7, ...recordsB2a7, ...recordsA2b, ...recordsB2b, ...recordsA9, ...recordsB9, ...recordsP1L9, ...allColorFamilyRecords];
  const line3EvidenceRecords = allEvidenceRecords.filter((r) => r.systemCode === 'MMRDA_LINE3');
  const knowledgeGaps = fs.existsSync(gapsPath) ? JSON.parse(fs.readFileSync(gapsPath, 'utf-8')) : [];
  const lineRegistry = fs.existsSync(lineRegistryPath) ? JSON.parse(fs.readFileSync(lineRegistryPath, 'utf-8')) : null;
  const networkSources = fs.existsSync(networkSourceRegistryPath) ? JSON.parse(fs.readFileSync(networkSourceRegistryPath, 'utf-8')) : null;
  const gisRegistry = fs.existsSync(gisRegistryPath) ? JSON.parse(fs.readFileSync(gisRegistryPath, 'utf-8')) : null;
  const line2bPhase1Ctm = fs.existsSync(line2bPhase1CtmPath) ? JSON.parse(fs.readFileSync(line2bPhase1CtmPath, 'utf-8')) : null;
  const line2bPhase1Crosswalk = fs.existsSync(line2bPhase1CrosswalkPath) ? JSON.parse(fs.readFileSync(line2bPhase1CrosswalkPath, 'utf-8')) : null;
  const line9Phase1Ctm = fs.existsSync(line9Phase1CtmPath) ? JSON.parse(fs.readFileSync(line9Phase1CtmPath, 'utf-8')) : null;
  const line9Phase1Crosswalk = fs.existsSync(line9Phase1CrosswalkPath) ? JSON.parse(fs.readFileSync(line9Phase1CrosswalkPath, 'utf-8')) : null;

  console.log(`📋 Registered Source Catalog — Mumbai (${sourcesCatalog.sources.length} sources)`);
  for (const s of sourcesCatalog.sources) {
    console.log(`   [${s.sourceId}] ${s.shortName} (${s.authorityLevel}) — ${s.type}`);
  }

  const resAll = validateEvidence(allEvidenceRecords, sourcesCatalog.sources);
  const resGis = validateGisEvidence(recordsF);
  const resLine2bPhase1 = validateLine2bPhase1(line2bPhase1Ctm, line2bPhase1Crosswalk, sourcesCatalog.sources);
  const resLine9Phase1 = validateLine9Phase1(line9Phase1Ctm, line9Phase1Crosswalk, sourcesCatalog.sources);

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
  console.log(`  Line 2B phase-I P0/P1 errors: ${resLine2bPhase1.errors.length}`);
  console.log(`  Line 2B point-offset warnings: ${resLine2bPhase1.warnings.length}`);
  console.log(`  Line 9 phase-I P0/P1 errors: ${resLine9Phase1.errors.length}`);
  console.log(`  Line 9 ArcGIS point-offset/length warnings: ${resLine9Phase1.warnings.length}`);

  if (lineRegistry) {
    const net = networkReadinessSummary(lineRegistry);
    const readyLineIds = net.lines.filter((l) => l.ctmReady).map((l) => l.lineId);
    const sharedCount = sharedEvidence.sharedEvidence ? sharedEvidence.sharedEvidence.length : 0;
    const netSourceCount = networkSources && networkSources.sources ? networkSources.sources.length : 0;

    console.log('\n' + '─'.repeat(60));
    console.log('NETWORK REGISTRY SUMMARY (All Mumbai Metro Lines)');
    console.log('─'.repeat(60));
    console.log(`  Total lines registered    : ${net.total}`);
    console.log(`  Fully operational         : ${net.operational}`);
    console.log(`  Partially operational     : ${net.partiallyOperational}`);
    console.log(`  🎉 CTM-READY LINES       : ${net.ctmReady} (${readyLineIds.join(', ') || 'none'})`);
    console.log(`  CTM-blocked lines         : ${net.ctmBlocked}`);
    console.log(`\n  Network source registry   : ${netSourceCount} sources registered`);
    console.log(`  Shared system evidence    : ${sharedCount} records (multi-line applicability)`);
    console.log('\n  CTM Status per line:');
    net.lines.forEach(l => {
      if (l.ctmReady) {
        const lineKey = String(l.lineId || '').replace(/^MUMBAI_/, '').toLowerCase();
        const alignment = gisRegistry?.validationMatrix?.[lineKey]?.alignmentGeometry;
        const stationCount = Number.isFinite(l.stationCount) ? `${l.stationCount} registered stations` : 'station count not recorded';
        const vertexCount = Number.isFinite(alignment?.validatedVertexCount)
          ? `${alignment.validatedVertexCount.toLocaleString()} alignment vertices`
          : 'alignment vertex count not recorded';
        const alignmentStatus = alignment?.validationStatus || 'alignment validation not recorded';
        const coverage = Number.isFinite(alignment?.kmlCorridorCoveragePercent)
          ? `; ${alignment.kmlCorridorCoveragePercent}% KML coverage`
          : '';
        console.log(`    [${l.localDesignation.padEnd(8)}] ${(l.operationalStatus || '').padEnd(20)} 🎉 CTM_READY (${stationCount})`);
        console.log(`         • Spatial alignment       : ${alignmentStatus} (${vertexCount}${coverage})`);
        if (l.ctmStatusReason) console.log(`         • Readiness basis         : ${l.ctmStatusReason}`);
      } else {
        console.log(`    [${l.localDesignation.padEnd(8)}] ${(l.operationalStatus || '').padEnd(20)} BLOCKED: ${l.ctmBlocker || 'UNSPECIFIED'}`);
      }
    });
  }

  console.log('\n' + '─'.repeat(60));
  console.log('CATEGORY A + B — LINE-OWNED CORRIDOR DPR EVIDENCE');
  console.log('─'.repeat(60));
  for (const systemCode of ['MMRDA_LINE2A', 'MMRDA_LINE7']) {
    const a = recordsA2a7.filter((r) => r.systemCode === systemCode);
    const b = recordsB2a7.filter((r) => r.systemCode === systemCode);
    const entityCount = new Set([...a, ...b].map((r) => r.entityKey)).size;
    console.log(`  ${systemCode.padEnd(14)}: A ${a.length} records; B ${b.length} records; ${entityCount} DPR entities`);
  }
  const aLine2b = recordsA2b.filter((r) => r.systemCode === 'MMRDA_LINE2B');
  const bLine2b = recordsB2b.filter((r) => r.systemCode === 'MMRDA_LINE2B');
  const line2bDprEntities = new Set([...aLine2b, ...bLine2b].map((r) => r.entityKey)).size;
  console.log(`  ${'MMRDA_LINE2B'.padEnd(14)}: A ${aLine2b.length} records; B ${bLine2b.length} records; ${line2bDprEntities} DPR entities (proposed)`);
  console.log(`  Line 2B current P0 slice: ${line2bPhase1Ctm?.stations?.length ?? 0} stations; ${line2bPhase1Ctm?.alignmentGeometry?.vertexCount ?? 0} alignment vertices; database materialization pending`);
  for (const systemCode of ['MMRDA_LINE9', 'MMRDA_LINE7A']) {
    const a = recordsA9.filter((r) => r.systemCode === systemCode);
    const b = recordsB9.filter((r) => r.systemCode === systemCode);
    const entityCount = new Set([...a, ...b].map((r) => r.entityKey)).size;
    console.log(`  ${systemCode.padEnd(14)}: A ${a.length} records; B ${b.length} records; ${entityCount} DPR entities (proposed; crosswalk pending)`);
  }
  for (const entry of colorFamilyEvidence) {
    const systems = new Set([...entry.recordsA, ...entry.recordsB].map((r) => r.systemCode));
    for (const systemCode of systems) {
      const a = entry.recordsA.filter((r) => r.systemCode === systemCode);
      const b = entry.recordsB.filter((r) => r.systemCode === systemCode);
      const entityCount = new Set([...a, ...b].map((r) => r.entityKey)).size;
      console.log(`  ${systemCode.padEnd(14)}: A ${a.length} records; B ${b.length} records; ${entityCount} DPR entities (proposed; crosswalk pending)`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('OVERALL EVIDENCE LAYER SUMMARY — Line 3 (A + B + C + D + F)');
  console.log('─'.repeat(60));
  console.log(`  Category A (Network Topology)              : ${sumA.total} facts (${sumA.gapsCount} gaps)`);
  console.log(`  Category B (Station Infrastructure)        : ${sumB.total} facts (${sumB.gapsCount} gaps)`);
  console.log(`  Category C (Operations)                    : ${sumC.total} facts (${sumC.gapsCount} gaps)`);
  console.log(`  Category D (Rolling Stock)                 : ${sumD.total} facts (${sumD.gapsCount} gaps)`);
  console.log(`  Category F (GIS Evidence)                  : ${line3Gis.length} records (${l3Validated} VALIDATED)`);
  console.log(`  Total Line 3 Evidence Records              : ${line3EvidenceRecords.length + line3Gis.length} records`);
  console.log(`  Coverage Metric                            : NOT SCORED (Unweighted counts only)\n`);

  const totalErrors = resAll.errors.length + resGis.errors.length + resLine2bPhase1.errors.length + resLine9Phase1.errors.length;
  for (const error of [...resLine2bPhase1.errors, ...resLine9Phase1.errors]) console.error(`  ❌ ${error}`);
  for (const warning of [...resLine2bPhase1.warnings, ...resLine9Phase1.warnings]) console.warn(`  ⚠️ ${warning}`);
  if (totalErrors > 0) {
    console.error(`❌ ${totalErrors} validation error(s) found.`);
    process.exit(1);
  }
  console.log('✅ Sprint v0.6.5-F Validation passed — 0 errors.\n');
}

main();
