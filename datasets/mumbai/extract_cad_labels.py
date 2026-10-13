import json
import math
import os

# Ground-truth coordinates for Line 9 stations
# (Anchors for Grid 6/7 Station Midpoint)
STATION_ANCHORS = {
    # Line 9 / North Extension
    "DAHISAR_EAST": {"lat": 19.2568, "lon": 72.8634, "bearing_deg": 10},
    "PANDURANGWADI": {"lat": 19.2680, "lon": 72.8655, "bearing_deg": 12},
    "MIRAGAON": {"lat": 19.2810, "lon": 72.8680, "bearing_deg": 15},
    "KASHIGAON": {"lat": 19.2940, "lon": 72.8710, "bearing_deg": 10},
}

PAGE_MAP = {
    1: "DAHISAR_EAST",
    2: "PANDURANGWADI",
    3: "MIRAGAON",
    4: "KASHIGAON",
}


def project_cad_pt_to_wgs84(
    pt_x, pt_y, origin_x, origin_y, scale_m_per_px, anchor_lat, anchor_lon, bearing_deg
):
    """Converts PDF pixel coordinates to real-world WGS84 (lon, lat)

    using affine scale, rotation, and translation.
    """
    # 1. Delta in meters relative to station center
    dx_m = (pt_x - origin_x) * scale_m_per_px
    dy_m = (origin_y - pt_y) * scale_m_per_px  # PDF Y is top-down

    # 2. Rotate by station viaduct bearing
    rad = math.radians(bearing_deg)
    # Along-track (East/North rotated components)
    rot_east_m = dx_m * math.cos(rad) - dy_m * math.sin(rad)
    rot_north_m = dx_m * math.sin(rad) + dy_m * math.cos(rad)

    # 3. Convert meters to latitude & longitude offsets
    # 1 deg lat ~ 111,139 meters; 1 deg lon at Mumbai (~19°N) ~ 105,000 meters
    delta_lat = rot_north_m / 111139.0
    delta_lon = rot_east_m / (111139.0 * math.cos(math.radians(anchor_lat)))

    final_lat = round(anchor_lat + delta_lat, 7)
    final_lon = round(anchor_lon + delta_lon, 7)

    return [final_lon, final_lat]  # GeoJSON standard: [lon, lat]


def generate_cad_geojson(extracted_json_path, output_geojson_path):
    if not os.path.exists(extracted_json_path):
        print(f"Error: Could not find {extracted_json_path}")
        return

    with open(extracted_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = []

    for page in data:
        page_idx = page.get("page_index")
        station_key = PAGE_MAP.get(page_idx)
        if not station_key:
            continue

        anchor = STATION_ANCHORS[station_key]
        features_dict = page.get("detected_features", {})

        # Find scale: distance between Grid 1 and Grid 12 (185 meters)
        grid_anchors = features_dict.get("grid_anchors", [])
        g1 = next(
            (g for g in grid_anchors if g["text"] == "1" and g["center_pt"][1] < 300),
            None,
        )
        g12 = next(
            (g for g in grid_anchors if g["text"] == "12" and g["center_pt"][1] < 300),
            None,
        )

        if g1 and g12:
            pixel_length = abs(g12["center_pt"][0] - g1["center_pt"][0])
            scale_m_per_px = (
                185.0 / pixel_length if pixel_length > 0 else 0.2
            )  # meters per pixel
            origin_x = (g1["center_pt"][0] + g12["center_pt"][0]) / 2.0
            origin_y = (g1["center_pt"][1] + g12["center_pt"][1]) / 2.0 + 80.0
        else:
            scale_m_per_px = 0.22  # Fallback default for 1191x842 page
            origin_x = page["page_bounds"]["width"] / 2.0
            origin_y = page["page_bounds"]["height"] / 2.0

        # Plot Gates / Entry-Exits
        for gate in features_dict.get("gates", []):
            pt = gate["center_pt"]
            geo_coords = project_cad_pt_to_wgs84(
                pt[0],
                pt[1],
                origin_x,
                origin_y,
                scale_m_per_px,
                anchor["lat"],
                anchor["lon"],
                anchor["bearing_deg"],
            )

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": geo_coords},
                "properties": {
                    "station": station_key,
                    "type": "GATE_ENTRY_EXIT",
                    "label": gate["text"],
                    "cad_px": pt,
                    "marker-color": "#22c55e",  # Green
                    "marker-symbol": "entrance",
                    "marker-size": "medium",
                },
            })

        # Plot Lifts / Elevators
        for lift in features_dict.get("lifts", []):
            pt = lift["center_pt"]
            geo_coords = project_cad_pt_to_wgs84(
                pt[0],
                pt[1],
                origin_x,
                origin_y,
                scale_m_per_px,
                anchor["lat"],
                anchor["lon"],
                anchor["bearing_deg"],
            )

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": geo_coords},
                "properties": {
                    "station": station_key,
                    "type": "ELEVATOR",
                    "label": lift["text"],
                    "cad_px": pt,
                    "marker-color": "#06b6d4",  # Cyan
                    "marker-symbol": "commercial",
                    "marker-size": "small",
                },
            })

        # Plot Stairs
        for stair in features_dict.get("stairs", []):
            pt = stair["center_pt"]
            geo_coords = project_cad_pt_to_wgs84(
                pt[0],
                pt[1],
                origin_x,
                origin_y,
                scale_m_per_px,
                anchor["lat"],
                anchor["lon"],
                anchor["bearing_deg"],
            )

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": geo_coords},
                "properties": {
                    "station": station_key,
                    "type": "STAIRS",
                    "label": stair["text"],
                    "cad_px": pt,
                    "marker-color": "#f97316",  # Orange
                    "marker-symbol": "pitch",
                    "marker-size": "small",
                },
            })

        # Plot Escalators
        for esc in features_dict.get("escalators", []):
            pt = esc["center_pt"]
            geo_coords = project_cad_pt_to_wgs84(
                pt[0],
                pt[1],
                origin_x,
                origin_y,
                scale_m_per_px,
                anchor["lat"],
                anchor["lon"],
                anchor["bearing_deg"],
            )

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": geo_coords},
                "properties": {
                    "station": station_key,
                    "type": "ESCALATOR",
                    "label": esc["text"],
                    "cad_px": pt,
                    "marker-color": "#a855f7",  # Purple
                    "marker-symbol": "fast-food",
                    "marker-size": "small",
                },
            })

    geojson_doc = {"type": "FeatureCollection", "features": features}

    with open(output_geojson_path, "w", encoding="utf-8") as out:
        json.dump(geojson_doc, out, indent=2)

    print(
        f"Exported {len(features)} real-world CAD entities to {output_geojson_path}"
    )


if __name__ == "__main__":
    generate_cad_geojson(
        "Annexure_D_Station_layout_with_kiosk_layout_of_Metro_Line_9_cad_extracted.json",
        "mumbai_line9_cad_verified.geojson",
    )