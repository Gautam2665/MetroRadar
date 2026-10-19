import json
import csv
import math
import os
import zipfile

def calibrate_gates_with_osm():
    osm_path = 'sources/osm_mumbai_transit_extract.json'
    if not os.path.exists(osm_path):
        osm_path = 'datasets/mumbai/sources/osm_mumbai_transit_extract.json'
    
    with open(osm_path, 'r', encoding='utf-8') as f:
        osm = json.load(f)

    osm_entrances = [e for e in osm.get('elements', []) if e.get('tags', {}).get('railway') == 'subway_entrance']
    osm_elevators = [e for e in osm.get('elements', []) if e.get('tags', {}).get('highway') == 'elevator']

    stops_path = 'stops.txt' if os.path.exists('stops.txt') else 'datasets/mumbai/stops.txt'
    with open(stops_path, 'r', encoding='utf-8') as f:
        stops = list(csv.DictReader(f))

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    calibrated_count = 0
    wheelchair_tagged = 0

    for s in stops:
        if s.get('location_type') == '2':
            s_lat = float(s['stop_lat'])
            s_lon = float(s['stop_lon'])

            best_dist = 999999
            best_osm = None
            for o in osm_entrances + osm_elevators:
                o_lat = o.get('lat')
                o_lon = o.get('lon')
                if o_lat and o_lon:
                    d = haversine(s_lat, s_lon, o_lat, o_lon)
                    if d < best_dist:
                        best_dist = d
                        best_osm = o

            # Snap gates within 60 meters to exact OSM ground-truth surveying
            if best_dist < 60:
                s['stop_lat'] = f"{best_osm['lat']:.7f}"
                s['stop_lon'] = f"{best_osm['lon']:.7f}"
                
                # Check accessibility tag
                tags = best_osm.get('tags', {})
                if tags.get('wheelchair') == 'yes' or tags.get('highway') == 'elevator':
                    s['wheelchair_boarding'] = '1'
                    wheelchair_tagged += 1
                calibrated_count += 1

    print(f"Calibrated {calibrated_count} gates to exact physical OSM coordinates (with {wheelchair_tagged} wheelchair-accessible tags).")

    # Save updated stops.txt
    fieldnames = list(stops[0].keys())
    with open(stops_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(stops)
    print(f"Updated {stops_path}")

    # Repackage zip
    gtfs_files = [
        'agency.txt', 'calendar.txt', 'feed_info.txt', 'levels.txt',
        'pathways.txt', 'routes.txt', 'shapes.txt', 'stop_times.txt',
        'stops.txt', 'transfers.txt', 'trips.txt'
    ]
    zip_target = 'mumbai_discrete_ready.zip'
    if os.path.exists(zip_target):
        os.remove(zip_target)

    with zipfile.ZipFile(zip_target, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fname in gtfs_files:
            if os.path.exists(fname):
                zf.write(fname, arcname=fname)
    print("Repackaged mumbai_discrete_ready.zip cleanly.")

if __name__ == '__main__':
    calibrate_gates_with_osm()
