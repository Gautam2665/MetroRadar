import csv
import io
import json
import os
import zipfile

ZIP_FILE_PATH = "mumbai_discrete_ready.zip"
OUTPUT_GEOJSON_PATH = "mumbai_discrete_network.geojson"

# Pathway mode styling map
PATHWAY_MODE_CONFIG = {
    "1": {"label": "Walkway / FOB", "color": "#06b6d4", "width": 3},  # Cyan
    "2": {"label": "Stairs", "color": "#f97316", "width": 2},  # Orange
    "4": {"label": "Escalator", "color": "#a855f7", "width": 3},  # Purple
    "5": {"label": "Elevator / Lift", "color": "#22c55e", "width": 4},  # Green
    "6": {"label": "Fare Gates / AFC", "color": "#eab308", "width": 2},  # Yellow
    "7": {"label": "Exit Gate", "color": "#ef4444", "width": 2},  # Red
}


def read_csv_from_zip(zip_archive, filename):
    try:
        with zip_archive.open(filename) as f:
            # Decode using utf-8 with fallback for BOM
            text_data = io.TextIOWrapper(f, encoding="utf-8-sig")
            reader = csv.DictReader(text_data)
            return list(reader)
    except KeyError:
        print(f"Warning: '{filename}' not found inside archive.")
        return []


def export_discrete_gtfs_to_geojson(zip_path, output_path):
    if not os.path.exists(zip_path):
        print(f"Error: Archive '{zip_path}' not found.")
        return

    features = []
    nodes_lookup = {}

    with zipfile.ZipFile(zip_path, "r") as z:
        stops_rows = read_csv_from_zip(z, "stops.txt")
        pathways_rows = read_csv_from_zip(z, "pathways.txt")

    print(
        f"Read {len(stops_rows)} stops/nodes and {len(pathways_rows)} pathways."
    )

    # 1. Parse and index all Stops / Entry-Exits / Lifts
    for row in stops_rows:
        stop_id = row.get("stop_id")
        try:
            lat = float(row.get("stop_lat", 0))
            lon = float(row.get("stop_lon", 0))
        except (ValueError, TypeError):
            continue

        loc_type = str(row.get("location_type", "0")).strip()
        stop_name = row.get("stop_name", stop_id)
        parent_station = row.get("parent_station", "")
        level_id = row.get("level_id", "0")
        wheelchair = row.get("wheelchair_boarding", "0").strip() == "1"

        nodes_lookup[stop_id] = (lon, lat)

        # Visual styling based on location_type
        if loc_type == "2":
            node_type = "Entrance / Exit Gate"
            marker_color = "#10b981" if wheelchair else "#f59e0b"
            marker_size = "medium"
            marker_symbol = "entrance"
        elif loc_type == "1":
            node_type = "Parent Station Hub"
            marker_color = "#3b82f6"
            marker_size = "large"
            marker_symbol = "rail-metro"
        else:
            node_type = "Platform / Internal Node"
            marker_color = "#64748b"
            marker_size = "small"
            marker_symbol = "circle"

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": stop_id,
                "name": stop_name,
                "node_type": node_type,
                "parent_station": parent_station,
                "level_id": level_id,
                "wheelchair_accessible": wheelchair,
                "marker-color": marker_color,
                "marker-size": marker_size,
                "marker-symbol": marker_symbol,
            },
        })

    # 2. Reconstruct LineStrings for Pathways (Stairs, Lifts, Escalators, FOBs)
    pathways_plotted = 0
    for p in pathways_rows:
        from_id = p.get("from_stop_id")
        to_id = p.get("to_stop_id")
        mode = str(p.get("pathway_mode", "1")).strip()

        if from_id in nodes_lookup and to_id in nodes_lookup:
            coord_from = nodes_lookup[from_id]
            coord_to = nodes_lookup[to_id]

            cfg = PATHWAY_MODE_CONFIG.get(
                mode,
                {
                    "label": f"Pathway Mode {mode}",
                    "color": "#94a3b8",
                    "width": 2,
                },
            )

            # Check if this is an explicit FOB or Skywalk
            pathway_id = p.get("pathway_id", "")
            label = (
                "FOB / Skywalk"
                if "FOB" in pathway_id.upper()
                else cfg["label"]
            )
            color = "#0ea5e9" if "FOB" in pathway_id.upper() else cfg["color"]

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [coord_from, coord_to],
                },
                "properties": {
                    "pathway_id": pathway_id,
                    "type": label,
                    "mode_code": mode,
                    "from_stop": from_id,
                    "to_stop": to_id,
                    "traversal_time_sec": p.get("traversal_time", "N/A"),
                    "wheelchair_traversal": (
                        "yes" if p.get("wheelchair_traversal") == "1" else "no"
                    ),
                    # geojson.io line styling
                    "stroke": color,
                    "stroke-width": cfg["width"],
                    "stroke-opacity": 0.85,
                },
            })
            pathways_plotted += 1

    # 3. Export to GeoJSON
    geojson_data = {"type": "FeatureCollection", "features": features}

    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(geojson_data, out, indent=2)

    print(f"\nGenerated GeoJSON: {output_path}")
    print(
        f"Total: {len(nodes_lookup)} Nodes and {pathways_plotted} Pathways/Stairs/Lifts plotted."
    )
    print("Drag and drop this file onto https://geojson.io")


if __name__ == "__main__":
    export_discrete_gtfs_to_geojson(ZIP_FILE_PATH, OUTPUT_GEOJSON_PATH)