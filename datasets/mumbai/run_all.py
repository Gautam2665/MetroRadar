import csv
import os
import re
import zipfile
from datetime import datetime, timedelta

def format_time(td):
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

# ========================================================
# 1. DYNAMIC PLATFORM EXTRACTION FROM STOPS.TXT
# ========================================================

def load_route_platforms():
    """
    Scans stops.txt directly and extracts platform IDs that actually exist.
    """
    prefix_map = {
        "LINE1": "PF_STN_L1_",
        "MONORAIL": "PF_STN_MONO_",
        "LINE2A": "PF_STN_L2A_",
        "LINE2B": "PF_STN_L2B_",
        "LINE3": "PF_STN_L3_",
    }
    
    platforms_by_prefix = {k: [] for k in prefix_map}
    l7_platforms = []
    
    if not os.path.exists("stops.txt"):
        raise FileNotFoundError("stops.txt not found in current directory! Please make sure stops.txt is extracted here.")

    with open("stops.txt", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row.get("stop_id", "").strip()
            if not sid:
                continue
            if sid.startswith("PF_STN_L9_") or sid.startswith("PF_STN_L7_"):
                l7_platforms.append(sid)
            else:
                for r_key, pfx in prefix_map.items():
                    if sid.startswith(pfx):
                        platforms_by_prefix[r_key].append(sid)
                        break

    def natural_sort_key(s):
        return [int(n) for n in re.findall(r'\d+', s)]

    route_platforms = {}

    # LINE1, MONORAIL, LINE2A, LINE2B
    for r_key, p_list in platforms_by_prefix.items():
        p1 = sorted([p for p in p_list if p.endswith("_1")], key=natural_sort_key)
        p2 = sorted([p for p in p_list if p.endswith("_2")], key=natural_sort_key)
        
        if not p2:
            p2 = list(reversed(p1))
        else:
            p2 = list(reversed(p2))
            
        route_platforms[r_key] = {0: p1, 1: p2}

    # Line 7 + Line 9 (North to South: L9 -> L7: Kashigaon -> Gundavali)
    l9_p1 = sorted([p for p in l7_platforms if "PF_STN_L9_" in p and p.endswith("_1")], key=natural_sort_key, reverse=True)
    l7_p1 = sorted([p for p in l7_platforms if "PF_STN_L7_" in p and p.endswith("_1")], key=natural_sort_key)
    l7_dir0 = l9_p1 + l7_p1

    l9_p2 = sorted([p for p in l7_platforms if "PF_STN_L9_" in p and p.endswith("_2")], key=natural_sort_key)
    l7_p2 = sorted([p for p in l7_platforms if "PF_STN_L7_" in p and p.endswith("_2")], key=natural_sort_key, reverse=True)
    l7_dir1 = l7_p2 + l9_p2
    if not l7_dir1:
        l7_dir1 = list(reversed(l7_dir0))
    route_platforms["LINE7"] = {0: l7_dir0, 1: l7_dir1}

    # Line 3 (Dir 0: Aarey -> Cuffe Parade; Dir 1: Cuffe Parade -> Aarey)
    l3_p1 = sorted([p for p in platforms_by_prefix["LINE3"] if p.endswith("_1")], key=natural_sort_key)
    l3_p2 = sorted([p for p in platforms_by_prefix["LINE3"] if p.endswith("_2")], key=natural_sort_key, reverse=True)
    route_platforms["LINE3"] = {0: l3_p1, 1: l3_p2}

    return route_platforms

# ========================================================
# 2. CALIBRATED CORRIDORS, TRIP QUOTAS & RUNTIME PROFILES
# ========================================================

# Specific interchange hubs / high-volume stations with calibrated dwell times (seconds)
HUB_DWELLS = {
    # Line 7 / 9
    "PF_STN_L7_001_1": 45, "PF_STN_L7_001_2": 45,  # Dahisar East (Interchange with Line 2A)
    "PF_STN_L7_014_1": 45, "PF_STN_L7_014_2": 45,  # Gundavali (Interchange with Line 1)
    # Line 2A
    "PF_STN_L2A_001_1": 45, "PF_STN_L2A_001_2": 45, # Dahisar East (Interchange with Line 7)
    "PF_STN_L2A_017_1": 45, "PF_STN_L2A_017_2": 45, # Andheri West (Interchange with Line 1)
    # Line 1
    "PF_STN_L1_004_1": 40, "PF_STN_L1_004_2": 40,  # Andheri (Western Railway Interchange)
    "PF_STN_L1_008_1": 40, "PF_STN_L1_008_2": 40,  # Marol Naka (Line 3 Interchange)
    "PF_STN_L1_012_1": 40, "PF_STN_L1_012_2": 40,  # Ghatkopar (Central Railway Interchange)
    # Line 3 (Full underground with Platform Screen Doors sync)
    "PF_STN_L3_004_1": 45, "PF_STN_L3_004_2": 45,  # Marol Naka (Line 1 Interchange)
    "PF_STN_L3_005_1": 50, "PF_STN_L3_005_2": 50,  # CSMIA T2 Airport Hub
    "PF_STN_L3_007_1": 45, "PF_STN_L3_007_2": 45,  # CSMIA T1 Airport Hub
    "PF_STN_L3_010_1": 50, "PF_STN_L3_010_2": 50,  # BKC Commercial Hub
    "PF_STN_L3_013_1": 50, "PF_STN_L3_013_2": 50,  # Dadar Metro (Central & Western Rail Hub)
    "PF_STN_L3_019_1": 45, "PF_STN_L3_019_2": 45,  # Mumbai Central Metro (National Rail)
    "PF_STN_L3_023_1": 50, "PF_STN_L3_023_2": 50,  # CSMT Metro (Suburban & Intercity Rail)
    "PF_STN_L3_025_1": 45, "PF_STN_L3_025_2": 45,  # Churchgate (Western Railway Terminal)
    "PF_STN_L3_026_1": 45, "PF_STN_L3_026_2": 45,  # Vidhan Bhawan (State Legislature & Nariman Point)
    # Monorail
    "PF_STN_MONO_007_1": 45, "PF_STN_MONO_007_2": 45, # Wadala Depot
}

CORRIDOR_METADATA = {
    "LINE1": {
        "headsigns": {0: "Ghatkopar", 1: "Versova"},
        # 12 stations, 11 hops: 11 * 85s rolling + 10 intermediate dwells (8*30s + 2*40s = 320s) = 935s + 320s = 1,255s (~21 min)
        # Weekday: 420 trips -> Peak 4.0 min headway, Off-peak 6.3 min headway
        "default_hop_seconds": 85,
        "default_dwell_seconds": 30,
        "services": {
            "SVC_WEEKDAY":  {"total": 436, "span": ("05:30:00", "23:45:00"), "peak_ratio": 1.50},
            "SVC_SATURDAY": {"total": 330, "span": ("05:30:00", "23:45:00"), "peak_ratio": 1.35},
            "SVC_SUNDAY":   {"total": 270, "span": ("05:30:00", "23:45:00"), "peak_ratio": 1.20}
        }
    },
    "MONORAIL": {
        "headsigns": {0: "Jacob Circle", 1: "Chembur"},
        # 17 stations, 16 hops: 16 * 115s + 15 intermediate dwells (~35-45s) = 1,840s + 535s = 2,375s (~39.5 min)
        # Clamped to 22:30:00 terminal departure so trips clear by 23:10 PM
        "default_hop_seconds": 115,
        "default_dwell_seconds": 35,
        "services": {
            "SVC_WEEKDAY":  {"total": 136, "span": ("05:30:00", "22:30:00"), "peak_ratio": 1.4},
            "SVC_SATURDAY": {"total": 112, "span": ("05:30:00", "22:30:00"), "peak_ratio": 1.2},
            "SVC_SUNDAY":   {"total": 112, "span": ("05:30:00", "22:30:00"), "peak_ratio": 1.1}
        }
    },
    "LINE7": {
        "headsigns": {0: "Gundavali", 1: "Kashigaon"},
        # Combined L9 + L7 single corridor: 17 stations (Kashigaon <-> Gundavali)
        # 16 hops * 120s rolling + 15 intermediate dwells (14*35s + 1*45s = 535s) = 1,920s + 535s + 5s = 2,460s = EXACTLY 41 min (41:00)
        # Weekday: 276 trips -> Peak 6.0 min headway, Off-peak 8.7 min headway
        "default_hop_seconds": 120,
        "default_dwell_seconds": 35,
        "services": {
            "SVC_WEEKDAY":  {"total": 294, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.34},
            "SVC_SATURDAY": {"total": 223, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.3},
            "SVC_SUNDAY":   {"total": 205, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.2}
        }
    },
    "LINE2A": {
        "headsigns": {0: "Andheri (West)", 1: "Dahisar (East)"},
        # 17 stations: 16 hops * 98s + 15 intermediate dwells (14*35s + 1*45s = 535s) = 1,568s + 535s = 2,103s (~35 min)
        # Weekday: 276 trips -> Peak 6.0 min headway, Off-peak 8.7 min headway
        "default_hop_seconds": 98,
        "default_dwell_seconds": 35,
        "services": {
            "SVC_WEEKDAY":  {"total": 294, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.34},
            "SVC_SATURDAY": {"total": 223, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.3},
            "SVC_SUNDAY":   {"total": 205, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.2}
        }
    },
    "LINE2B": {
        "headsigns": {0: "Chembur", 1: "Mandale"},
        # 6 stations: 5 hops * 90s + 4 dwells * 30s = 450s + 120s = 570s (~9.5 min)
        "default_hop_seconds": 90,
        "default_dwell_seconds": 30,
        "services": {
            "SVC_WEEKDAY":  {"total": 209, "span": ("06:00:00", "22:30:00"), "peak_ratio": 1.0},
            "SVC_SATURDAY": {"total": 209, "span": ("06:00:00", "22:30:00"), "peak_ratio": 1.0},
            "SVC_SUNDAY":   {"total": 209, "span": ("06:00:00", "22:30:00"), "peak_ratio": 1.0}
        }
    },
    "LINE3": {
        "headsigns": {0: "Cuffe Parade", 1: "Aarey JVLR"},
        # 27 stations (Aarey JVLR <-> Cuffe Parade, via Vidhan Bhawan)
        # 26 hops * 96s rolling + 25 intermediate dwells (17*35s + 8*48s = 979s) = 2,496s + 979s = 3,475s (~58 min)
        # Clamped to 22:30:00 terminal departure so trips clear by 23:28 PM (no post-midnight runs)
        "default_hop_seconds": 96,
        "default_dwell_seconds": 35,
        "services": {
            "SVC_WEEKDAY":  {"total": 284, "span": ("05:55:00", "22:30:00"), "peak_ratio": 1.34},
            "SVC_SATURDAY": {"total": 216, "span": ("05:55:00", "22:30:00"), "peak_ratio": 1.35},
            "SVC_SUNDAY":   {"total": 172, "span": ("06:30:00", "22:30:00"), "peak_ratio": 1.15}
        }
    }
}

# ========================================================
# 3. SPAN-PRESERVING DEPARTURE ENGINE
# ========================================================

def generate_full_day_departures(start_s, end_s, peak_ratio, target_count):
    start_dt = datetime.strptime(start_s, "%H:%M:%S")
    end_dt = datetime.strptime(end_s, "%H:%M:%S")
    total_seconds = (end_dt - start_dt).total_seconds()

    minutes = int(total_seconds // 60)
    weights = []
    for m in range(minutes):
        cur_t = start_dt + timedelta(minutes=m)
        h = cur_t.hour
        # Peak hours: 08:00 - 11:30 and 17:00 - 20:30
        is_peak = (8 <= h < 11) or (h == 11 and cur_t.minute <= 30) or (17 <= h < 20) or (h == 20 and cur_t.minute <= 30)
        weights.append(peak_ratio if is_peak else 1.0)

    total_weight = sum(weights)
    departures = []

    for i in range(target_count):
        target_w = (i / max(1, target_count - 1)) * total_weight
        running = 0.0
        chosen_m = 0
        for m_idx, w in enumerate(weights):
            running += w
            if running >= target_w:
                chosen_m = m_idx
                break
        dep_time = start_dt + timedelta(minutes=chosen_m)
        departures.append(dep_time)

    # Guarantee uniqueness while maintaining order
    unique_deps = []
    last_t = None
    for d in departures:
        if last_t is None:
            unique_deps.append(d)
            last_t = d
        else:
            if d <= last_t:
                d = last_t + timedelta(seconds=60)
            unique_deps.append(d)
            last_t = d

    return unique_deps

# ========================================================
# 4. EXECUTION
# ========================================================

def main():
    route_platforms = load_route_platforms()
    trips_rows = []
    stop_times_rows = []

    for route_id, route_cfg in CORRIDOR_METADATA.items():
        platforms_by_dir = route_platforms.get(route_id)
        if not platforms_by_dir or not platforms_by_dir[0]:
            print(f"Warning: No valid platforms found for {route_id}!")
            continue

        hop_sec = route_cfg["default_hop_seconds"]
        def_dwell = route_cfg["default_dwell_seconds"]

        route_trip_count = 0
        for svc_id, svc_cfg in route_cfg["services"].items():
            svc_tag = "WD" if "WEEKDAY" in svc_id else ("SAT" if "SATURDAY" in svc_id else "SUN")
            total = svc_cfg["total"]
            dir0_target = (total + 1) // 2
            dir1_target = total // 2

            for dir_id, target in [(0, dir0_target), (1, dir1_target)]:
                deps = generate_full_day_departures(
                    svc_cfg["span"][0], svc_cfg["span"][1],
                    svc_cfg["peak_ratio"], target
                )
                platforms = platforms_by_dir[dir_id]
                headsign = route_cfg["headsigns"][dir_id]
                shape_id = f"SHP_{route_id}_DIR{dir_id}"

                for idx, dep in enumerate(deps):
                    hhmm = dep.strftime("%H%M")
                    trip_id = f"TRIP_{route_id}_{dir_id}_{svc_tag}_{hhmm}_{idx}"

                    trips_rows.append({
                        "route_id": route_id,
                        "service_id": svc_id,
                        "trip_headsign": headsign,
                        "direction_id": dir_id,
                        "shape_id": shape_id,
                        "trip_id": trip_id
                    })
                    route_trip_count += 1

                    # Cumulative timeline calculation:
                    # Departs origin stop at departure_time
                    # Rolls to next stop (+ hop_sec)
                    # Dwells at intermediate stop (+ dwell_time)
                    # Departs intermediate stop at departure_time
                    curr_time = timedelta(hours=dep.hour, minutes=dep.minute, seconds=dep.second)

                    for seq, stop_id in enumerate(platforms, start=1):
                        is_first = (seq == 1)
                        is_last = (seq == len(platforms))
                        dwell_time = HUB_DWELLS.get(stop_id, def_dwell)

                        if is_first:
                            arr_str = format_time(curr_time)
                            dep_str = format_time(curr_time)
                        elif is_last:
                            curr_time += timedelta(seconds=hop_sec)
                            arr_str = format_time(curr_time)
                            dep_str = format_time(curr_time)
                        else:
                            curr_time += timedelta(seconds=hop_sec)
                            arr_str = format_time(curr_time)
                            curr_time += timedelta(seconds=dwell_time)
                            dep_str = format_time(curr_time)

                        stop_times_rows.append({
                            "trip_id": trip_id,
                            "arrival_time": arr_str,
                            "departure_time": dep_str,
                            "stop_id": stop_id,
                            "stop_sequence": seq
                        })

        print(f"Generated {route_id}: {route_trip_count} trips across {len(platforms_by_dir[0])} stops.")

    # 1. Write text files directly
    with open("trips.txt", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["route_id","service_id","trip_headsign","direction_id","shape_id","trip_id"])
        writer.writeheader()
        writer.writerows(trips_rows)

    with open("stop_times.txt", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["trip_id","arrival_time","departure_time","stop_id","stop_sequence"])
        writer.writeheader()
        writer.writerows(stop_times_rows)

    print(f"\nWritten {len(trips_rows)} trips to trips.txt and {len(stop_times_rows)} rows to stop_times.txt.")

    # 2. Package directly into a clean zip (overwriting cleanly)
    gtfs_files = [
        "agency.txt", "calendar.txt", "feed_info.txt", "levels.txt",
        "pathways.txt", "routes.txt", "shapes.txt", "stop_times.txt",
        "stops.txt", "transfers.txt", "trips.txt"
    ]
    zip_target = "mumbai_discrete_ready.zip"
    if os.path.exists(zip_target):
        os.remove(zip_target)

    with zipfile.ZipFile(zip_target, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in gtfs_files:
            if os.path.exists(fname):
                zf.write(fname, arcname=fname)
            else:
                print(f"Notice: Optional file {fname} not present on disk, skipping.")

    print(f"Clean archive successfully created at {zip_target}.")

if __name__ == "__main__":
    main()