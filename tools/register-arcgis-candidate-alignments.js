const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const arcgisPath = path.join(root, 'datasets/mumbai/sources/gis/arcgis-mumbai.json');
const evidencePath = path.join(root, 'datasets/mumbai/evidence/F-gis-evidence.json');
const arcgis = JSON.parse(fs.readFileSync(arcgisPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

// Lines 4 and 4A are a single ArcGIS route feature and are intentionally not
// split here. Their line-owned geometry crosswalk needs an independently
// grounded station boundary.
const candidates = [
  { systemCode: 'MMRDA_LINE2B', featureId: 54, route: 'D.N. Nagar–Mandale', temporalStatus: 'PARTIAL', note: 'Current MMRDA station list, DPR, and ArcGIS route feature have station-count differences; geometry remains a candidate.' },
  { systemCode: 'MMRDA_LINE5', featureId: 59, route: 'Thane–Bhiwandi–Kalyan', temporalStatus: 'UNDER_CONSTRUCTION', note: 'ArcGIS reports 17 stations and 23.5 km; current MMRDA overview reports 15 stations and 24.9 km. Do not promote pending route/station reconciliation.' },
  { systemCode: 'MMRDA_LINE6', featureId: 56, route: 'Swami Samarth Nagar–Vikhroli (EEH)', temporalStatus: 'UNDER_CONSTRUCTION', note: 'ArcGIS reports 13 stations and 14.5 km; current MMRDA overview reports 13 stations and 15.31 km. Candidate geometry only.' },
  { systemCode: 'MMRDA_LINE9', featureId: 62, route: 'Dahisar East–Mira Bhayander', temporalStatus: 'PARTIAL', note: 'ArcGIS route feature is a candidate; full station crosswalk and separate CTM route entities remain incomplete.' },
  { systemCode: 'MMRDA_LINE10', featureId: 64, route: 'Gaimukh–Shivaji Chowk (Mira Road)', temporalStatus: 'PLANNED', note: 'ArcGIS reports eight stations, while the 2019 DPR lists four; candidate geometry requires route-branch and station reconciliation.' },
  { systemCode: 'MMRDA_LINE11', featureId: 63, route: 'Wadala–CSMT', temporalStatus: 'PLANNED', note: 'ArcGIS route is candidate design geometry for a planned corridor; no current operational station rows are implied.' },
  { systemCode: 'MMRDA_LINE12', featureId: 66, route: 'Kalyan–Taloja', temporalStatus: 'UNDER_CONSTRUCTION', note: 'ArcGIS reports 19 stations; MMRDA overview also lists 19, while the DPR and a 2026 MMRDA tender list 17. Preserve this conflict.' },
];

const lineFeatures = new Map(arcgis.lines.features.map((feature) => [feature.properties.objectid, feature]));
const next = evidence.filter((record) => !String(record.evidenceId || '').startsWith('E-ARCGIS-CANDIDATE-'));

for (const candidate of candidates) {
  const feature = lineFeatures.get(candidate.featureId);
  if (!feature) throw new Error(`ArcGIS line feature ${candidate.featureId} is missing`);
  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error(`ArcGIS line feature ${candidate.featureId} has no usable line coordinates`);
  const [startCoordinate, endCoordinate] = [coordinates[0], coordinates[coordinates.length - 1]];
  const props = feature.properties;
  next.push({
    evidenceId: `E-ARCGIS-CANDIDATE-${candidate.systemCode.replace('MMRDA_', '')}`,
    systemCode: candidate.systemCode,
    category: 'F_GIS',
    entityType: 'alignment_geometry',
    entityKey: `${candidate.systemCode}_ARCGIS_ALIGNMENT_CANDIDATE`,
    attribute: 'candidate_linestring_wgs84',
    value: {
      geometryType: 'LineString',
      featureDescription: candidate.route,
      arcgisFeatureId: candidate.featureId,
      reportedStationCount: props.no_stations,
      reportedLengthKm: props.length,
      vertexCount: coordinates.length,
      startCoordinate,
      endCoordinate,
      coordinateSystem: 'EPSG:4326',
      localPath: 'sources/gis/arcgis-mumbai.json',
    },
    source: {
      sourceId: 'SRC-ARCGIS-MOHUA-2025',
      document: 'arcgis-mumbai.json',
      featureId: candidate.featureId,
      coordinateSystem: 'EPSG:4326',
    },
    evidenceType: 'DIRECT',
    temporalStatus: candidate.temporalStatus,
    confidence: 0.65,
    validationStatus: 'CANDIDATE_UNVERIFIED',
    priority: 'P0',
    extractedAt: '2026-10-05',
    notes: candidate.note,
  });
}

fs.writeFileSync(evidencePath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Registered ${candidates.length} ArcGIS line geometries as candidate-only P0 evidence.`);
