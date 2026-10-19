import json
import math
import csv
import os

def match_osm_gates():
    osm_path = 'datasets/mumbai/sources/osm_mumbai_transit_extract.json'
    if not os.path.exists(osm_path):
        osm_path = os.path.join(os.path.dirname(__file__), 'datasets', 'mumbai', 'sources', 'osm_mumbai_transit_extract.json')
    with open(osm_path, 'r', encoding='utf-8') as f:
        osm = json.load(f)

    stops_path = 'stops.txt' if os.path.exists('stops.txt') else 'datasets/mumbai/stops.txt'
    with open(stops_path, 'r', encoding='utf-8') as f:
        gtfs_stops = list(csv.DictReader(f))

    osm_entrances = [e for e in osm.get('elements', []) if e.get('tags', {}).get('railway') == 'subway_entrance']
    osm_elevators = [e for e in osm.get('elements', []) if e.get('tags', {}).get('highway') == 'elevator']
    gtfs_gates = [s for s in gtfs_stops if s.get('location_type') == '2']

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    by_line_matches = {}
    for g in gtfs_gates:
        gid = g['stop_id']
        line = gid.split('_')[2] if len(gid.split('_')) > 2 else 'OTHER'
        g_lat = float(g['stop_lat'])
        g_lon = float(g['stop_lon'])

        best_dist = 999999
        best_osm = None
        for o in osm_entrances + osm_elevators:
            o_lat = o.get('lat')
            o_lon = o.get('lon')
            if o_lat and o_lon:
                d = haversine(g_lat, g_lon, o_lat, o_lon)
                if d < best_dist:
                    best_dist = d
                    best_osm = o

        if line not in by_line_matches:
            by_line_matches[line] = {'total': 0, 'matched': [], 'unmatched': 0}
        by_line_matches[line]['total'] += 1

        if best_dist < 60:  # within 60 meters
            by_line_matches[line]['matched'].append((gid, g['stop_name'], best_osm, best_dist))
        else:
            by_line_matches[line]['unmatched'] += 1

    print("=== OSM CORRELATION AUDIT FOR GATES ===")
    for line, res in sorted(by_line_matches.items()):
        total = res['total']
        matched = len(res['matched'])
        pct = (matched / total * 100) if total else 0
        print(f"Line {line:5s}: {matched:2d} / {total:2d} gates precisely matched with OSM physical GPS pins ({pct:.1f}%)")

if __name__ == '__main__':
    match_osm_gates()
