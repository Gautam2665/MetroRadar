const fs = require('fs');
const path = require('path');

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
// Coordinates from MoHUA / Esri India Living Atlas (EPSG:4326)
const rawLine2A = [
  { seq: 1, id: 'STN_L2A_001', code: 'L2A-01', name: 'Dahisar (East)', lat: 19.251263, lon: 72.867119, type: 'ELEVATED' },
  { seq: 2, id: 'STN_L2A_002', code: 'L2A-02', name: 'Anand Nagar', lat: 19.257219, lon: 72.866134, type: 'ELEVATED' },
  { seq: 3, id: 'STN_L2A_003', code: 'L2A-03', name: 'Kandarpada', lat: 19.256646, lon: 72.850678, type: 'ELEVATED' },
  { seq: 4, id: 'STN_L2A_004', code: 'L2A-04', name: 'Mandapeshwar', lat: 19.249261, lon: 72.845677, type: 'ELEVATED' },
  { seq: 5, id: 'STN_L2A_005', code: 'L2A-05', name: 'Eksar', lat: 19.240323, lon: 72.843438, type: 'ELEVATED' },
  { seq: 6, id: 'STN_L2A_006', code: 'L2A-06', name: 'Borivali (West)', lat: 19.231194, lon: 72.840865, type: 'ELEVATED' },
  { seq: 7, id: 'STN_L2A_007', code: 'L2A-07', name: 'Shimpoli', lat: 19.222769, lon: 72.840918, type: 'ELEVATED' },
  { seq: 8, id: 'STN_L2A_008', code: 'L2A-08', name: 'Kandivali (West)', lat: 19.214005, lon: 72.837355, type: 'ELEVATED' },
  { seq: 9, id: 'STN_L2A_009', code: 'L2A-09', name: 'Dahanukarwadi', lat: 19.205772, lon: 72.834717, type: 'ELEVATED' },
  { seq: 10, id: 'STN_L2A_010', code: 'L2A-10', name: 'Valnai - Meeth Chowky', lat: 19.196621, lon: 72.833786, type: 'ELEVATED' },
  { seq: 11, id: 'STN_L2A_011', code: 'L2A-11', name: 'Malad (West)', lat: 19.185200, lon: 72.835850, type: 'ELEVATED' },
  { seq: 12, id: 'STN_L2A_012', code: 'L2A-12', name: 'Lower Malad', lat: 19.172953, lon: 72.836423, type: 'ELEVATED' },
  { seq: 13, id: 'STN_L2A_013', code: 'L2A-13', name: 'Bangur Nagar', lat: 19.162259, lon: 72.834844, type: 'ELEVATED' },
  { seq: 14, id: 'STN_L2A_014', code: 'L2A-14', name: 'Goregaon (West)', lat: 19.153138, lon: 72.835685, type: 'ELEVATED' },
  { seq: 15, id: 'STN_L2A_015', code: 'L2A-15', name: 'Oshiwara', lat: 19.145979, lon: 72.833752, type: 'ELEVATED' },
  { seq: 16, id: 'STN_L2A_016', code: 'L2A-16', name: 'Lower Oshiwara', lat: 19.140455, lon: 72.831717, type: 'ELEVATED' },
  { seq: 17, id: 'STN_L2A_017', code: 'L2A-17', name: 'Andheri (West)', lat: 19.129089, lon: 72.831415, type: 'ELEVATED' }
];

// 2. Line 7 Stations (Red Line - 14 stations from Dahisar East to Gundavali)
// Coordinates from MoHUA / Esri India Living Atlas & MMRDA PIU KML (EPSG:4326)
const rawLine7 = [
  { seq: 1, id: 'STN_L7_001', code: 'L7-01', name: 'Dahisar (East)', lat: 19.251263, lon: 72.867119, type: 'ELEVATED' },
  { seq: 2, id: 'STN_L7_002', code: 'L7-02', name: 'Ovaripada', lat: 19.243411, lon: 72.864248, type: 'ELEVATED' },
  { seq: 3, id: 'STN_L7_003', code: 'L7-03', name: 'Rashtriya Udyan', lat: 19.234671, lon: 72.863161, type: 'ELEVATED' },
  { seq: 4, id: 'STN_L7_004', code: 'L7-04', name: 'Devipada', lat: 19.224332, lon: 72.864220, type: 'ELEVATED' },
  { seq: 5, id: 'STN_L7_005', code: 'L7-05', name: 'Magathane', lat: 19.217203, lon: 72.866728, type: 'ELEVATED' },
  { seq: 6, id: 'STN_L7_006', code: 'L7-06', name: 'Poisar', lat: 19.203938, lon: 72.863499, type: 'ELEVATED' },
  { seq: 7, id: 'STN_L7_007', code: 'L7-07', name: 'Akurli', lat: 19.198115, lon: 72.860646, type: 'ELEVATED' },
  { seq: 8, id: 'STN_L7_008', code: 'L7-08', name: 'Kurar', lat: 19.187264, lon: 72.858512, type: 'ELEVATED' },
  { seq: 9, id: 'STN_L7_009', code: 'L7-09', name: 'Dindoshi', lat: 19.179720, lon: 72.858300, type: 'ELEVATED' },
  { seq: 10, id: 'STN_L7_010', code: 'L7-10', name: 'Aarey', lat: 19.169506, lon: 72.858801, type: 'ELEVATED' },
  { seq: 11, id: 'STN_L7_011', code: 'L7-11', name: 'Goregaon (East)', lat: 19.152442, lon: 72.856573, type: 'ELEVATED' },
  { seq: 12, id: 'STN_L7_012', code: 'L7-12', name: 'Jogeshwari (East)', lat: 19.142928, lon: 72.855166, type: 'ELEVATED' },
  { seq: 13, id: 'STN_L7_013', code: 'L7-13', name: 'Mogra', lat: 19.128677, lon: 72.855452, type: 'ELEVATED' },
  { seq: 14, id: 'STN_L7_014', code: 'L7-14', name: 'Gundavali', lat: 19.114439, lon: 72.855172, type: 'ELEVATED' }
];

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
        platformCount: 2,
        platformType: "SIDE",
        screenDoorsInstalled: false
      },
      provenance: {
        gisSourceId: "SRC-ARCGIS-MOHUA-2025",
        authorityLevel: "OPERATOR_OFFICIAL",
        confidence: 0.95,
        validationStatus: "VALIDATED",
        validatedAt: "2026-10-05"
      }
    };
  });

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
        coordinates: [
          [u.longitude, u.latitude],
          [v.longitude, v.latitude]
        ]
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
    sourceRef: 'SRC-MMMOCL-OFFICIAL-2023'
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
    sourceRef: 'SRC-MMMOCL-OFFICIAL-2023'
  },
  rawLine7,
  1920
);

fs.writeFileSync(path.resolve('datasets/mumbai/normalized/ctm-line2a.json'), JSON.stringify(l2aCtm, null, 2), 'utf8');
fs.writeFileSync(path.resolve('datasets/mumbai/normalized/ctm-line7.json'), JSON.stringify(l7Ctm, null, 2), 'utf8');

console.log('✅ Generated ctm-line2a.json:', l2aCtm.stations.length, 'stations,', l2aCtm.stationGraph.edges.length, 'edges, distance:', l2aCtm.totalDistanceMeters, 'm');
console.log('✅ Generated ctm-line7.json:', l7Ctm.stations.length, 'stations,', l7Ctm.stationGraph.edges.length, 'edges, distance:', l7Ctm.totalDistanceMeters, 'm');
