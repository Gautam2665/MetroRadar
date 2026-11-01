"""
Mumbai Metro Line 7 & Line 9 CAD/PDF Wayfinding Extractor & Georeferencer
------------------------------------------------------------------------
Designed to run directly in the QGIS Python Console (Ctrl + Alt + P) or standalone in Python.
Extracts wayfinding assets (ticketing banks, retail kiosks, lifts, escalators, stairs, gates)
from tender PDF layout sheets, applies a Helmert/Affine transformation to WGS84 coordinates,
generates individual GeoJSONs, and automatically loads each layer into the active QGIS project.
"""

import json
import math
import re
from pathlib import Path

# Try importing QGIS modules (works inside QGIS Python Console)
try:
    from qgis.core import QgsProject, QgsVectorLayer
    HAS_QGIS = True
except ImportError:
    HAS_QGIS = False

try:
    import fitz  # PyMuPDF
except ImportError:
    raise ImportError("PyMuPDF (fitz) is required. Run 'pip install PyMuPDF' in your Python environment.")

# -------------------------------------------------------------------------
# 1. FILE PATHS & CONFIGURATION
# -------------------------------------------------------------------------
PDF_PATH = r"C:\Users\HP\OneDrive\Desktop\MetroRadar\datasets\mumbai\Annexure_C_Station_layout_with_kiosk_layout_of_Metro_Line_7.pdf"
OUTPUT_DIR = Path(r"C:\Users\HP\OneDrive\Desktop\MetroRadar\datasets\mumbai\line7_geojson")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# PostScript scale: 1 pt = 1/72 inch (~0.35m per point on 1:200 sheets)
SCALE_M_PER_PT = 0.35
CENTER_X = 1200.0  # Centroid of 2384x1684 pt layout sheet
CENTER_Y = 1000.0

# -------------------------------------------------------------------------
# 2. STATION SPATIAL ANCHORS (Centroid + Highway Heading)
# Line 7: Dahisar (North, Right) to Andheri/Gundavali (South, Left)
# Bearing deg is aligned with the CAD +X axis (pointing towards Dahisar North)
# -------------------------------------------------------------------------
STATION_LOOKUP = {
    # --- Line 7 (Red Line) Elevated Corridor along Western Express Highway ---
    "OVARIPADA": {
        "gps": (19.243411, 72.864248),
        "bearing_deg": 6.29,
        "keywords": ["OVARIPADA"]
    },
    "RASHTRIYA UDYAN": {
        "gps": (19.234671, 72.863161),
        "bearing_deg": -0.94,
        "keywords": ["RASHTRIYA UDYAN", "RASHTRIYA"]
    },
    "DEVIPADA": {
        "gps": (19.224332, 72.864220),
        "bearing_deg": -18.03,
        "keywords": ["DEVIPADA"]
    },
    "MAGATHANE": {
        "gps": (19.217203, 72.866728),
        "bearing_deg": -18.08,
        "keywords": ["MAGATHANE"]
    },
    "POISAR": {
        "gps": (19.203938, 72.863499),
        "bearing_deg": 0.0,
        "keywords": ["POISAR"]
    },
    "AKURLI": {
        "gps": (19.198115, 72.860646),
        "bearing_deg": 12.57,
        "keywords": ["AKURLI"]
    },
    "KURAR": {
        "gps": (19.187264, 72.858512),
        "bearing_deg": 0.0,
        "keywords": ["KURAR"]
    },
    "DINDOSHI": {
        "gps": (19.179720, 72.858300),
        "bearing_deg": -0.56,
        "keywords": ["DINDOSHI"]
    },
    "AAREY": {
        "gps": (19.169506, 72.858801),
        "bearing_deg": 6.53,
        "keywords": ["AAREY"]
    },
    "GOREGAON EAST": {
        "gps": (19.152442, 72.856573),
        "bearing_deg": 4.74,
        "keywords": ["GOREGAON EAST", "GOREGAON"]
    },
    "JOGESHWARI EAST": {
        "gps": (19.142928, 72.855166),
        "bearing_deg": 16.83,
        "keywords": ["JOGESHWARI EAST", "JOGESHWARI"]
    },
    "MOGRA": {
        "gps": (19.128677, 72.855452),
        "bearing_deg": 0.0,
        "keywords": ["MOGRA"]
    },
    "GUNDAVALI": {
        "gps": (19.114439, 72.855172),
        "bearing_deg": 7.18,
        "keywords": ["GUNDAVALI", "ANDHERI"]
    },
    # --- Line 9 Corridor Anchors (Available for Line 9 drawings) ---
    "DAHISAR EAST": {
        "gps": (19.251045, 72.867310),
        "bearing_deg": 57.1,
        "keywords": ["DAHISAR EAST"]
    },
    "PANDURANGWADI": {
        "gps": (19.263884, 72.873215),
        "bearing_deg": 42.0,
        "keywords": ["PANDURANGWADI", "PANDURANG WADI"]
    },
    "MIRAGAON": {
        "gps": (19.270956, 72.880622),
        "bearing_deg": 36.5,
        "keywords": ["MIRAGAON", "MIRA GAON"]
    },
    "KASHIGAON": {
        "gps": (19.277398, 72.880792),
        "bearing_deg": 24.5,
        "keywords": ["KASHIGAON", "KASHI GAON"]
    }
}

# -------------------------------------------------------------------------
# 3. HELMERT / AFFINE TRANSFORMATION (PDF Points -> WGS84 Lat/Lon)
# -------------------------------------------------------------------------
def pdf_pt_to_wgs84(x_pt, y_pt, cx, cy, target_lat, target_lon, bearing_deg, scale_m=SCALE_M_PER_PT):
    dx_m = (x_pt - cx) * scale_m
    dy_m = -(y_pt - cy) * scale_m  # PDF Y is inverted (0,0 is top-left)

    theta = math.radians(bearing_deg)
    # Rotate around highway tangent vector
    rot_east_m = dx_m * math.sin(theta) + dy_m * math.cos(theta)
    rot_north_m = dx_m * math.cos(theta) - dy_m * math.sin(theta)

    lat_deg_per_m = 1.0 / 111139.0
    lon_deg_per_m = 1.0 / (111139.0 * math.cos(math.radians(target_lat)))

    out_lat = target_lat + (rot_north_m * lat_deg_per_m)
    out_lon = target_lon + (rot_east_m * lon_deg_per_m)
    return out_lon, out_lat

# -------------------------------------------------------------------------
# 4. EXTRACTION & BATCH CONVERSION
# -------------------------------------------------------------------------
print(f"Loading PDF: {PDF_PATH}")
doc = fitz.open(PDF_PATH)
print(f"Loaded {len(doc)} pages successfully.")

station_features = {}

for page_idx in range(len(doc)):
    page = doc[page_idx]
    page_text = page.get_text().upper()

    # Match page to station (specific stations tested before generic header names)
    matched_station = None
    for stn_name, meta in STATION_LOOKUP.items():
        if any(kw in page_text for kw in meta["keywords"]):
            matched_station = stn_name
            break

    if not matched_station:
        print(f"Page {page_idx + 1}: No station keyword match found. Skipping.")
        continue

    meta = STATION_LOOKUP[matched_station]
    target_lat, target_lon = meta["gps"]
    bearing = meta["bearing_deg"]

    extracted_nodes = []
    blocks = page.get_text("blocks")

    for b in blocks:
        txt = b[4].strip().upper()
        cx = (b[0] + b[2]) / 2.0
        cy = (b[1] + b[3]) / 2.0

        elem_type, accessible = None, False
        if re.search(r"\bLIFT\b|\bELEV\b", txt):
            elem_type, accessible = "ELEVATOR", True
        elif re.search(r"\bESC\b|\bESCALATOR\b", txt):
            elem_type, accessible = "ESCALATOR", False
        elif re.search(r"\bSTAIR\b|\bSTR\b", txt):
            elem_type, accessible = "STAIRS", False
        elif re.search(r"\bGATE\b|\bENTRY\b|\bEXIT\b|\bAFC\b|\bTURNSTILE\b", txt):
            elem_type, accessible = "GATE", True
        elif re.search(r"PRINTER|TOKEN|BANK CARD|KEYBOARD|DISPENSER", txt):
            elem_type, accessible = "TICKETING", True
        elif re.search(r"\b(US|PM|UN)-K[LSM]|KIOSK", txt):
            elem_type, accessible = "KIOSK", True

        if elem_type:
            extracted_nodes.append((elem_type, accessible, txt.split("\n")[0], cx, cy))

    if not extracted_nodes:
        print(f"Page {page_idx + 1} ({matched_station}): No wayfinding annotations found.")
        continue

    # Cluster duplicate annotation labels belonging to the same device (within 25 pt)
    clustered = []
    visited = set()
    for i, n1 in enumerate(extracted_nodes):
        if i in visited:
            continue
        group = [n1]
        visited.add(i)
        for j, n2 in enumerate(extracted_nodes):
            if j in visited:
                continue
            if n1[0] == n2[0] and math.hypot(n1[3] - n2[3], n1[4] - n2[4]) < 25.0:
                group.append(n2)
                visited.add(j)
        avg_cx = sum(g[3] for g in group) / len(group)
        avg_cy = sum(g[4] for g in group) / len(group)
        labels = list(set(g[2] for g in group))
        clustered.append((group[0][0], group[0][1], " / ".join(labels), avg_cx, avg_cy))

    # Project to WGS84 and store as GeoJSON features
    feats = station_features.setdefault(matched_station, [])
    for elem_type, accessible, tag, cx, cy in clustered:
        lon, lat = pdf_pt_to_wgs84(cx, cy, CENTER_X, CENTER_Y, target_lat, target_lon, bearing)
        feats.append({
            "type": "Feature",
            "properties": {
                "station": matched_station,
                "element_type": elem_type,
                "tag": tag,
                "wheelchair_accessible": accessible,
                "source_page": page_idx + 1,
                "cad_x": round(cx, 2),
                "cad_y": round(cy, 2)
            },
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 7), round(lat, 7)]
            }
        })

# -------------------------------------------------------------------------
# 5. WRITE GEOJSON FILES & AUTO-LOAD INTO QGIS
# -------------------------------------------------------------------------
print("\n=== GENERATED GEOJSON LAYERS ===")
for stn, feats in station_features.items():
    slug = stn.lower().replace(" ", "_")
    out_file = OUTPUT_DIR / f"{slug}_cad_georeferenced.geojson"

    geojson_data = {
        "type": "FeatureCollection",
        "name": f"{stn}_Wayfinding",
        "features": feats
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(geojson_data, f, indent=2)

    print(f"[{stn}] Extracted {len(feats)} features -> {out_file.name}")

    # Add directly to QGIS Project canvas if running inside QGIS
    if HAS_QGIS:
        layer_name = f"L7_{stn.title()}_Wayfinding"
        layer = QgsVectorLayer(str(out_file), layer_name, "ogr")
        if layer.isValid():
            QgsProject.instance().addMapLayer(layer)
            print(f"  -> Added '{layer_name}' layer to QGIS canvas.")
        else:
            print(f"  -> Failed to load layer '{layer_name}' in QGIS.")

print("\nProcessing complete! All stations georeferenced and ready.")
