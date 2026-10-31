const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OUT_DIR = 'datasets/mumbai/exports';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function exportL2A_L7() {
  console.log("=================================================================");
  console.log("=== EXPORTING LINE 2A & LINE 7 GEODATA FOR JOSM / QGIS ===");
  console.log("=================================================================\n");

  // 1. Export Stations
  console.log("1. Exporting Stations (Line 2A & Line 7)...");
  const stations = await prisma.$queryRawUnsafe(`
    SELECT 
      id, code, name, latitude, longitude,
      CASE 
        WHEN code LIKE 'STN_L2A_%' THEN 'Line 2A (Yellow Line)'
        WHEN code LIKE 'STN_L7_%' THEN 'Line 7 (Red Line)'
        ELSE 'Metro'
      END as line_name,
      CASE 
        WHEN code LIKE 'STN_L2A_%' THEN 'L2A'
        WHEN code LIKE 'STN_L7_%' THEN 'L7'
        ELSE 'Metro'
      END as line_code,
      ST_AsGeoJSON(geom) as geojson
    FROM stations
    WHERE code LIKE 'STN_L2A_%' OR code LIKE 'STN_L7_%'
    ORDER BY code ASC;
  `);

  const stationFeatures = stations.map(s => ({
    type: "Feature",
    id: s.id,
    properties: {
      id: s.id,
      ref: s.code,
      name: s.name,
      "railway": "station",
      "station": "subway",
      "subway": "yes",
      "network": "Mumbai Metro",
      "line": s.line_name,
      "operator": "MMMOCL",
      "layer": "1" // Elevated
    },
    geometry: JSON.parse(s.geojson)
  }));

  const stationsGeoJSON = { type: "FeatureCollection", features: stationFeatures };
  const stnPath = path.join(OUT_DIR, 'l2a_l7_stations.geojson');
  fs.writeFileSync(stnPath, JSON.stringify(stationsGeoJSON, null, 2), 'utf-8');
  console.log(`   ✓ Exported ${stationFeatures.length} stations to ${stnPath}`);

  // 2. Export Entrances / Gates
  console.log("2. Exporting Entrances / Gates...");
  const entrances = await prisma.$queryRawUnsafe(`
    SELECT 
      e.id, e.name, e."stationId", s.code as stn_code, s.name as stn_name,
      e.latitude, e.longitude,
      CASE 
        WHEN s.code LIKE 'STN_L2A_%' THEN 'Line 2A'
        ELSE 'Line 7'
      END as line_name,
      ST_AsGeoJSON(e.geom) as geojson
    FROM entrances e
    JOIN stations s ON s.id = e."stationId"
    WHERE s.code LIKE 'STN_L2A_%' OR s.code LIKE 'STN_L7_%'
    ORDER BY s.code, e.name;
  `);

  const entranceFeatures = entrances.map(e => ({
    type: "Feature",
    id: e.id,
    properties: {
      id: e.id,
      name: e.name,
      station_code: e.stn_code,
      station_name: e.stn_name,
      line: e.line_name,
      "railway": "subway_entrance",
      "entrance": "yes",
      "operator": "MMMOCL",
      "layer": "0" // Street ground level
    },
    geometry: JSON.parse(e.geojson)
  }));

  const entPath = path.join(OUT_DIR, 'l2a_l7_entrances.geojson');
  fs.writeFileSync(entPath, JSON.stringify({ type: "FeatureCollection", features: entranceFeatures }, null, 2), 'utf-8');
  console.log(`   ✓ Exported ${entranceFeatures.length} entrances to ${entPath}`);

  // 3. Export Alignments / Centerline Shapes
  console.log("3. Exporting Track Alignment Centerlines...");
  const shapes = await prisma.$queryRawUnsafe(`
    SELECT "shapeId", sequence, latitude, longitude
    FROM shapes
    WHERE "shapeId" IN ('SHP_LINE2A_DIR0', 'SHP_LINE7_DIR0')
    ORDER BY "shapeId", sequence ASC;
  `);

  const shapeMap = new Map();
  for (const pt of shapes) {
    if (!shapeMap.has(pt.shapeId)) shapeMap.set(pt.shapeId, []);
    shapeMap.get(pt.shapeId).push([pt.longitude, pt.latitude]);
  }

  const alignmentFeatures = [];
  for (const [shapeId, coords] of shapeMap.entries()) {
    const isL2A = shapeId.includes('2A');
    alignmentFeatures.push({
      type: "Feature",
      id: shapeId,
      properties: {
        id: shapeId,
        name: isL2A ? "Mumbai Metro Line 2A (Yellow Line)" : "Mumbai Metro Line 7 (Red Line)",
        ref: isL2A ? "Line 2A" : "Line 7",
        "railway": "subway",
        "bridge": "viaduct",
        "layer": "1",
        "gauge": "1435",
        "electrified": "contact_line",
        "voltage": "25000",
        "operator": "MMMOCL",
        "colour": isL2A ? "#FACC15" : "#E31E24"
      },
      geometry: {
        type: "LineString",
        coordinates: coords
      }
    });
  }

  const alignPath = path.join(OUT_DIR, 'l2a_l7_alignments.geojson');
  fs.writeFileSync(alignPath, JSON.stringify({ type: "FeatureCollection", features: alignmentFeatures }, null, 2), 'utf-8');
  console.log(`   ✓ Exported ${alignmentFeatures.length} alignment tracks to ${alignPath}`);

  // 4. Export Combined All-In-One GeoJSON (JOSM Ready)
  console.log("4. Building Combined All-In-One JOSM GeoJSON...");
  const combinedFeatures = [
    ...alignmentFeatures,
    ...stationFeatures,
    ...entranceFeatures
  ];

  const combinedGeoJSON = {
    type: "FeatureCollection",
    generator: "MetroRadar-Spatial-Engine",
    features: combinedFeatures
  };

  const combinedPath = path.join(OUT_DIR, 'l2a_l7_db_export.geojson');
  fs.writeFileSync(combinedPath, JSON.stringify(combinedGeoJSON, null, 2), 'utf-8');
  console.log(`\n🎉 SUCCESS! Combined file exported to: ${combinedPath}`);
  console.log(`   Total features: ${combinedFeatures.length} (2 Alignments, ${stationFeatures.length} Stations, ${entranceFeatures.length} Entrances)`);

  // 5. Export Pedestrian Corridors & FOBs for Line 2A & Line 7
  console.log("5. Exporting Walkable Pedestrian Network for Line 2A & 7...");
  const pedEdges = await prisma.$queryRawUnsafe(`
    SELECT id, highway_type, is_crossing, is_elevated_fob, study_area, length_meters, ST_AsGeoJSON(geom) as geojson
    FROM pedestrian_network
    WHERE study_area LIKE 'STN_L2A_%' OR study_area LIKE 'STN_L7_%' OR study_area = 'DN_NAGAR_ANDHERI_WEST'
    ORDER BY study_area ASC;
  `);

  const pedFeatures = pedEdges.map(p => ({
    type: "Feature",
    id: p.id,
    properties: {
      id: p.id,
      highway: p.highway_type,
      crossing: p.is_crossing ? "zebra" : undefined,
      bridge: p.is_elevated_fob ? "yes" : undefined,
      layer: p.is_elevated_fob ? "1" : "0",
      study_area: p.study_area,
      length_meters: p.length_meters
    },
    geometry: JSON.parse(p.geojson)
  }));

  const pedPath = path.join(OUT_DIR, 'l2a_l7_pedestrian_network.geojson');
  fs.writeFileSync(pedPath, JSON.stringify({ type: "FeatureCollection", features: pedFeatures }, null, 2), 'utf-8');
  console.log(`   ✓ Exported ${pedFeatures.length} pedestrian street & FOB edges to ${pedPath}`);

  await prisma.$disconnect();
}

exportL2A_L7().catch(err => {
  console.error("Export failed:", err);
  process.exit(1);
});
