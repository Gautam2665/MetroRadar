import csv
import json
import os
import zipfile

# Targets: (folder_name, zip_file_name, output_geojson_name)
targets = [
    ("pune", "pune/pune_discrete_ready.zip", "pune_stops.geojson"),
    ("navi_mumbai", "navi_mumbai/navi_mumbai_final.zip", "navi_mumbai_stops.geojson"),
    ("nagpur", "nagpur/nagpur_final.zip", "nagpur_stops.geojson"),
]

for city, zip_path, out_geojson in targets:
    # Check both subfolder and root paths
    if not os.path.exists(zip_path):
        fallback = os.path.basename(zip_path)
        if os.path.exists(fallback):
            zip_path = fallback
        else:
            print(f"[-] Skipped {city}: File not found ({zip_path})")
            continue

    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            if "stops.txt" not in z.namelist():
                print(f"[-] {city}: stops.txt missing in {zip_path}")
                continue

            content = z.open("stops.txt").read().decode("utf-8-sig").splitlines()
            reader = csv.DictReader(content)
            features = []

            for r in reader:
                lat = r.get("stop_lat")
                lon = r.get("stop_lon")
                if lat and lon:
                    try:
                        features.append({
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": [float(lon), float(lat)]
                            },
                            "properties": {
                                "name": r.get("stop_name", ""),
                                "id": r.get("stop_id", ""),
                                "location_type": r.get("location_type", "0")
                            }
                        })
                    except ValueError:
                        continue

            with open(out_geojson, "w", encoding="utf-8") as f:
                json.dump({"type": "FeatureCollection", "features": features}, f, indent=2)

            print(f"[+] Exported {out_geojson} ({len(features)} stops)")

    except Exception as e:
        print(f"[-] {city} error: {e}")