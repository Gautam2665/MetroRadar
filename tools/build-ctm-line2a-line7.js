const fs = require('fs');
const path = require('path');

const arcgisPath = path.resolve('datasets/mumbai/sources/gis/arcgis-mumbai.json');
const arcgisSource = JSON.parse(fs.readFileSync(arcgisPath, 'utf8'));

function loadCorridorRing(kmlFile) {
  const source = fs.readFileSync(path.resolve('datasets/mumbai/kml', kmlFile), 'utf8');
  const polygon = source.match(/<Polygon[\s\S]*?<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
  if (!polygon) throw new Error(`No outer polygon boundary in ${kmlFile}`);
  return polygon[1].trim().split(/\s+/).map((token) => {
    const [lon, lat] = token.split(',').map(Number);
    return [lon, lat];
  });
}

function isInsideRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > y) !== (yj > y);
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function routeDistanceMeters(a, b) {
  return haversine(a[1], a[0], b[1], b[0]);
}

function getProjection(point, coordinates, cumulativeMeters) {
  const metersPerDegreeLat = 110540;
  const metersPerDegreeLon = 111320 * Math.cos((point[1] * Math.PI) / 180);
  let nearest = null;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    const ax = (a[0] - point[0]) * metersPerDegreeLon;
    const ay = (a[1] - point[1]) * metersPerDegreeLat;
    const bx = (b[0] - point[0]) * metersPerDegreeLon;
    const by = (b[1] - point[1]) * metersPerDegreeLat;
    const dx = bx - ax;
    const dy = by - ay;
    const fraction = Math.max(
      0,
      Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)),
    );
    const distanceMeters = Math.hypot(ax + fraction * dx, ay + fraction * dy);
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        segmentIndex: i,
        fraction,
        distanceMeters,
        offsetMeters:
          cumulativeMeters[i] +
          fraction * (cumulativeMeters[i + 1] - cumulativeMeters[i]),
        coordinate: [
          a[0] + fraction * (b[0] - a[0]),
          a[1] + fraction * (b[1] - a[1]),
        ],
      };
    }
  }

  return nearest;
}

function coordinatesBetween(coordinates, projections) {
  const result = [];
  for (let i = 0; i < projections.length - 1; i++) {
    const from = projections[i];
    const to = projections[i + 1];
    const segment = [from.coordinate];
    for (let vertex = from.segmentIndex + 1; vertex <= to.segmentIndex; vertex++) {
      const vertexOffset = cumulativeRouteMeters[vertex];
      if (vertexOffset > from.offsetMeters + 0.01 && vertexOffset < to.offsetMeters - 0.01) {
        segment.push(routeCoordinates[vertex]);
      }
    }
    segment.push(to.coordinate);
    result.push(segment);
  }
  return result;
}

let routeCoordinates = [];
let cumulativeRouteMeters = [];

function buildAlignmentGeometry(lineMeta, stations) {
  const feature = arcgisSource.lines.features.find(
    (item) => item.properties.uniqueid === lineMeta.arcgisFeatureId,
  );
  if (!feature || feature.geometry.type !== 'LineString') {
    throw new Error(`ArcGIS alignment ${lineMeta.arcgisFeatureId} is missing or is not a LineString`);
  }

  routeCoordinates = feature.geometry.coordinates;
  cumulativeRouteMeters = [0];
  for (let i = 1; i < routeCoordinates.length; i++) {
    cumulativeRouteMeters.push(
      cumulativeRouteMeters[i - 1] + routeDistanceMeters(routeCoordinates[i - 1], routeCoordinates[i]),
    );
  }

  const projections = stations.map((station) =>
    getProjection([station.longitude, station.latitude], routeCoordinates, cumulativeRouteMeters),
  );
  for (let i = 0; i < projections.length; i++) {
    if (!projections[i] || projections[i].distanceMeters > 50) {
      throw new Error(`Station ${stations[i].name} is more than 50m from its ArcGIS alignment`);
    }
    if (i > 0 && projections[i].offsetMeters <= projections[i - 1].offsetMeters) {
      throw new Error(`ArcGIS alignment is not monotonic at ${stations[i].name}`);
    }
  }

  const routeSegments = coordinatesBetween(routeCoordinates, projections);
  const alignmentCoordinates = [routeSegments[0][0]];
  for (const segment of routeSegments) alignmentCoordinates.push(...segment.slice(1));

  const corridorRing = loadCorridorRing(lineMeta.kmlFile);
  const corridorCoveragePercent =
    (alignmentCoordinates.filter((point) => isInsideRing(point, corridorRing)).length /
      alignmentCoordinates.length) *
    100;

  return {
    geometry: {
      type: 'LineString',
      coordinates: alignmentCoordinates,
      source: {
        provider: 'MoHUA / Esri India Living Atlas',
        sourceFile: 'datasets/mumbai/sources/gis/arcgis-mumbai.json',
        sourceFeatureId: lineMeta.arcgisFeatureId,
        sourceFeatureName: feature.properties.remarks,
        coordinateSystem: 'EPSG:4326',
        crossCheckSource: lineMeta.kmlFile,
        crossCheck: 'ArcGIS trace projected against ordered CTM station points and compared with the KML viaduct corridor polygon',
        kmlCorridorVertexCoveragePercent: Number(corridorCoveragePercent.toFixed(2)),
        maxStationProjectionOffsetMeters: Number(
          Math.max(...projections.map((item) => item.distanceMeters)).toFixed(2),
        ),
        vertexCount: alignmentCoordinates.length,
      },
    },
    routeSegments,
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// 1. Line 2A Stations (Yellow Line - 17 stations from Dahisar East to Andheri West)
// Coordinates are resolved by ArcGIS feature ID below (EPSG:4326).
const rawLine2A = [
  { seq: 1, id: 'STN_L2A_001', code: 'L2A-01', name: 'Dahisar (East)', type: 'ELEVATED' },
  { seq: 2, id: 'STN_L2A_002', code: 'L2A-02', name: 'Anand Nagar', type: 'ELEVATED' },
  { seq: 3, id: 'STN_L2A_003', code: 'L2A-03', name: 'Kandarpada', type: 'ELEVATED' },
  { seq: 4, id: 'STN_L2A_004', code: 'L2A-04', name: 'Mandapeshwar', type: 'ELEVATED' },
  { seq: 5, id: 'STN_L2A_005', code: 'L2A-05', name: 'Eksar', type: 'ELEVATED' },
  { seq: 6, id: 'STN_L2A_006', code: 'L2A-06', name: 'Borivali (West)', type: 'ELEVATED' },
  { seq: 7, id: 'STN_L2A_007', code: 'L2A-07', name: 'Shimpoli', type: 'ELEVATED' },
  { seq: 8, id: 'STN_L2A_008', code: 'L2A-08', name: 'Kandivali (West)', type: 'ELEVATED' },
  { seq: 9, id: 'STN_L2A_009', code: 'L2A-09', name: 'Dahanukarwadi', type: 'ELEVATED' },
  { seq: 10, id: 'STN_L2A_010', code: 'L2A-10', name: 'Valnai - Meeth Chowky', type: 'ELEVATED' },
  { seq: 11, id: 'STN_L2A_011', code: 'L2A-11', name: 'Malad (West)', type: 'ELEVATED' },
  { seq: 12, id: 'STN_L2A_012', code: 'L2A-12', name: 'Lower Malad', type: 'ELEVATED' },
  { seq: 13, id: 'STN_L2A_013', code: 'L2A-13', name: 'Bangur Nagar', type: 'ELEVATED' },
  { seq: 14, id: 'STN_L2A_014', code: 'L2A-14', name: 'Goregaon (West)', type: 'ELEVATED' },
  { seq: 15, id: 'STN_L2A_015', code: 'L2A-15', name: 'Oshiwara', type: 'ELEVATED' },
  { seq: 16, id: 'STN_L2A_016', code: 'L2A-16', name: 'Lower Oshiwara', type: 'ELEVATED' },
  { seq: 17, id: 'STN_L2A_017', code: 'L2A-17', name: 'Andheri (West)', type: 'ELEVATED' }
];

// 2. Line 7 Stations (Red Line - 14 stations from Dahisar East to Gundavali)
// Coordinates are resolved by ArcGIS feature ID below (EPSG:4326).
const rawLine7 = [
  { seq: 1, id: 'STN_L7_001', code: 'L7-01', name: 'Dahisar (East)', type: 'ELEVATED' },
  { seq: 2, id: 'STN_L7_002', code: 'L7-02', name: 'Ovaripada', type: 'ELEVATED' },
  { seq: 3, id: 'STN_L7_003', code: 'L7-03', name: 'Rashtriya Udyan', type: 'ELEVATED' },
  { seq: 4, id: 'STN_L7_004', code: 'L7-04', name: 'Devipada', type: 'ELEVATED' },
  { seq: 5, id: 'STN_L7_005', code: 'L7-05', name: 'Magathane', type: 'ELEVATED' },
  { seq: 6, id: 'STN_L7_006', code: 'L7-06', name: 'Poisar', type: 'ELEVATED' },
  { seq: 7, id: 'STN_L7_007', code: 'L7-07', name: 'Akurli', type: 'ELEVATED' },
  { seq: 8, id: 'STN_L7_008', code: 'L7-08', name: 'Kurar', type: 'ELEVATED' },
  { seq: 9, id: 'STN_L7_009', code: 'L7-09', name: 'Dindoshi', type: 'ELEVATED' },
  { seq: 10, id: 'STN_L7_010', code: 'L7-10', name: 'Aarey', type: 'ELEVATED' },
  { seq: 11, id: 'STN_L7_011', code: 'L7-11', name: 'Goregaon (East)', type: 'ELEVATED' },
  { seq: 12, id: 'STN_L7_012', code: 'L7-12', name: 'Jogeshwari (East)', type: 'ELEVATED' },
  { seq: 13, id: 'STN_L7_013', code: 'L7-13', name: 'Mogra', type: 'ELEVATED' },
  { seq: 14, id: 'STN_L7_014', code: 'L7-14', name: 'Gundavali', type: 'ELEVATED' }
];

// Stable MoHUA / Esri station-feature IDs. Coordinates are read from the saved
// authoritative feature collection; literals above are retained only as the
// original compilation snapshot and are never used to build CTM geometry.
const arcgisStationFeatureIds = {
  STN_L2A_001: 996, STN_L2A_002: 954, STN_L2A_003: 955,
  STN_L2A_004: 956, STN_L2A_005: 957, STN_L2A_006: 958,
  STN_L2A_007: 959, STN_L2A_008: 960, STN_L2A_009: 961,
  STN_L2A_010: 962, STN_L2A_011: 924, STN_L2A_012: 963,
  STN_L2A_013: 964, STN_L2A_014: 965, STN_L2A_015: 966,
  STN_L2A_016: 967, STN_L2A_017: 968,
  STN_L7_001: 996, STN_L7_002: 995, STN_L7_003: 994,
  STN_L7_004: 993, STN_L7_005: 992, STN_L7_006: 991,
  STN_L7_007: 990, STN_L7_008: 989, STN_L7_009: 988,
  STN_L7_010: 987, STN_L7_011: 986, STN_L7_012: 985,
  STN_L7_013: 984, STN_L7_014: 980,
};
const arcgisStationById = new Map(arcgisSource.stations.features.map((feature) => [feature.id, feature]));
for (const station of [...rawLine2A, ...rawLine7]) {
  const featureId = arcgisStationFeatureIds[station.id];
  const feature = arcgisStationById.get(featureId);
  if (!feature) throw new Error(`Missing ArcGIS station feature ${featureId} for ${station.id}`);
  station.lat = feature.geometry.coordinates[1];
  station.lon = feature.geometry.coordinates[0];
  station.gisFeatureId = featureId;
  const lineKey = station.id.startsWith('STN_L2A_') ? 'LINE2A' : 'LINE7';
  station.gisEvidenceId = `E-${lineKey}-F-${String(station.seq).padStart(4, '0')}`;
}

function buildCtm(lineMeta, rawList, totalRuntimeSecs) {
  let totalDist = 0;
  const stations = rawList.map((s, idx) => {
    let interDist = 0;
    if (idx > 0) {
      interDist = haversine(rawList[idx-1].lat, rawList[idx-1].lon, s.lat, s.lon);
      totalDist += interDist;
    }
    return {
      canonicalId: s.id,
      stationCode: s.code,
      name: s.name,
      sequence: s.seq,
      latitude: s.lat,
      longitude: s.lon,
      coordinateSystem: "EPSG:4326",
      status: "OPERATIONAL",
      stationType: s.type,
      temporalStatus: "OPERATIONAL",
      physicalLayout: {
        interStationDistanceMeters: interDist,
        platformCount: 2
      },
      stationInfrastructure: {
        stationLevels: lineMeta.prefix === 'L2A' && s.seq === 17
          ? ["PROPERTY_DEVELOPMENT", "CONCOURSE", "PLATFORM"]
          : ["CONCOURSE", "PLATFORM"],
        platformCount: 2,
        evidenceStatus: "CORRIDOR_DPR_VERIFIED",
        sourceIds: [lineMeta.prefix === 'L2A' ? "SRC-MMRDA-L2A-DPR" : "SRC-MMRDA-L7-DPR"],
        platformArrangementStatus: "UNKNOWN_SOURCE_REQUIRED",
        platformNumberingStatus: "UNKNOWN_SOURCE_REQUIRED",
        platformDirectionStatus: "UNKNOWN_SOURCE_REQUIRED"
      },
      provenance: {
        gisEvidenceId: s.gisEvidenceId,
        gisSourceId: "SRC-ARCGIS-MOHUA-2025",
        gisFeatureId: s.gisFeatureId,
        authorityLevel: "OFFICIAL_GIS",
        confidence: 0.9,
        validationStatus: "SOURCE_VERIFIED",
        validatedAt: "2026-10-05"
      }
    };
  });

  const alignment = buildAlignmentGeometry(lineMeta, stations);

  const nodes = stations.map(s => ({
    stationId: s.canonicalId,
    name: s.name,
    sequence: s.sequence,
    coordinates: [s.longitude, s.latitude]
  }));

  const edges = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const u = stations[i];
    const v = stations[i + 1];
    const dist = v.physicalLayout.interStationDistanceMeters;
    const runtimeSec = Math.round((dist / totalDist) * totalRuntimeSecs);

    edges.push({
      edgeId: `EDGE_${lineMeta.prefix}_${String(i + 1).padStart(2, '0')}`,
      fromStationId: u.canonicalId,
      fromStationName: u.name,
      toStationId: v.canonicalId,
      toStationName: v.name,
      sequenceFrom: u.sequence,
      sequenceTo: v.sequence,
      distanceMeters: dist,
      nominalTravelTimeSeconds: runtimeSec,
      travelTimeSemantics: {
        value: runtimeSec,
        unit: "seconds",
        type: "BASELINE",
        provenance: {
          sourceId: lineMeta.sourceRef,
          commercialSpeedKmph: Math.round((totalDist / 1000) / (totalRuntimeSecs / 3600))
        }
      },
      trackType: "MAINLINE_ELEVATED",
      directional: "BI_DIRECTIONAL_PAIR",
      geometry: {
        type: "LineString",
        coordinates: alignment.routeSegments[i]
      }
    });
  }

  return {
    schemaVersion: "ctm-v1.0",
    networkId: "MUMBAI_METRO",
    lineId: lineMeta.lineId,
    lineCode: lineMeta.code,
    lineName: lineMeta.name,
    colorHex: lineMeta.colorHex,
    operator: "MMMOCL (Maha Mumbai Metro Operation Corporation Ltd)",
    status: "OPERATIONAL",
    commercialRuntimeSeconds: totalRuntimeSecs,
    totalDistanceMeters: totalDist,
    stations,
    alignmentGeometry: alignment.geometry,
    stationGraph: {
      directed: false,
      nodes,
      edges
    },
    rollingStock: {
      rakeType: "EMU_6CAR",
      manufacturer: "BEML (Bharat Earth Movers Ltd, Bengaluru)",
      gaugeMm: 1435,
      tractionSystem: "25kV AC Overhead Catenary, VVVF"
    }
  };
}

// Line 2A: 18.6 km, commercial runtime ~36 mins (2160s)
const l2aCtm = buildCtm(
  {
    lineId: 'MUMBAI_LINE2A',
    code: 'LINE2A',
    prefix: 'L2A',
    name: 'Mumbai Metro Line 2A (Yellow Line)',
    colorHex: '#F0C800',
    sourceRef: 'SRC-MMMOCL-OFFICIAL-2023',
    arcgisFeatureId: 61,
    kmlFile: 'metro_line_2a.kml'
  },
  rawLine2A,
  2160
);

// Line 7: 16.5 km, commercial runtime ~32 mins (1920s)
const l7Ctm = buildCtm(
  {
    lineId: 'MUMBAI_LINE7',
    code: 'LINE7',
    prefix: 'L7',
    name: 'Mumbai Metro Line 7 (Red Line)',
    colorHex: '#E31E24',
    sourceRef: 'SRC-MMMOCL-OFFICIAL-2023',
    arcgisFeatureId: 55,
    kmlFile: 'metro_line_7.kml'
  },
  rawLine7,
  1920
);

fs.writeFileSync(path.resolve('datasets/mumbai/normalized/ctm-line2a.json'), JSON.stringify(l2aCtm, null, 2), 'utf8');
fs.writeFileSync(path.resolve('datasets/mumbai/normalized/ctm-line7.json'), JSON.stringify(l7Ctm, null, 2), 'utf8');

console.log('✅ Generated ctm-line2a.json:', l2aCtm.stations.length, 'stations,', l2aCtm.stationGraph.edges.length, 'edges, distance:', l2aCtm.totalDistanceMeters, 'm');
console.log('✅ Generated ctm-line7.json:', l7Ctm.stations.length, 'stations,', l7Ctm.stationGraph.edges.length, 'edges, distance:', l7Ctm.totalDistanceMeters, 'm');
