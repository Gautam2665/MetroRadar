import csv
import os
import re
import zipfile
from datetime import datetime, timedelta

HOP_SECONDS = 110
DWELL_SECONDS = 25

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

    # Line 7 + Line 9 (North to South: L9 -> L7)
    l9_p1 = sorted([p for p in l7_platforms if "PF_STN_L9_" in p and p.endswith("_1")], key=natural_sort_key, reverse=True)
    l7_p1 = sorted([p for p in l7_platforms if "PF_STN_L7_" in p and p.endswith("_1")], key=natural_sort_key)
    l7_dir0 = l9_p1 + l7_p1

    l9_p2 = sorted([p for p in l7_platforms if "PF_STN_L9_" in p and p.endswith("_2")], key=natural_sort_key)
    l7_p2 = sorted([p for p in l7_platforms if "PF_STN_L7_" in p and p.endswith("_2")], key=natural_sort_key, reverse=True)
    l7_dir1 = l7_p2 + l9_p2
    if not l7_dir1:
        l7_dir1 = list(reversed(l7_dir0))
    route_platforms["LINE7"] = {0: l7_dir0, 1: l7_dir1}

    # Line 3 (Dir 0: Cuffe Parade -> Aarey; Dir 1: Aarey -> Cuffe Parade)
    l3_p1 = sorted([p for p in platforms_by_prefix["LINE3"] if p.endswith("_1")], key=natural_sort_key)
    l3_p2 = sorted([p for p in platforms_by_prefix["LINE3"] if p.endswith("_2")], key=natural_sort_key, reverse=True)
    route_platforms["LINE3"] = {0: l3_p1, 1: l3_p2}

    return route_platforms

# ========================================================
# 2. CALIBRATED CORRIDORS & TRIP QUOTAS
# ========================================================

CORRIDOR_METADATA = {
    "LINE1": {
        "headsigns": {0: "Ghatkopar", 1: "Versova"},
        "services": {
            "SVC_WEEKDAY":  {"total": 280, "span": ("05:30:00", "23:45:00"), "peak_ratio": 1.7},
            "SVC_SATURDAY": {"total": 230, "span": ("05:30:00", "23:45:00"), "peak_ratio": 1.4},
            "SVC_SUNDAY":   {"total": 190, "span": ("05:30:00", "23:45:00"), "peak_ratio": 1.2}
        }
    },
    "MONORAIL": {
        "headsigns": {0: "Jacob Circle", 1: "Chembur"},
        "services": {
            "SVC_WEEKDAY":  {"total": 142, "span": ("05:30:00", "23:30:00"), "peak_ratio": 1.4},
            "SVC_SATURDAY": {"total": 118, "span": ("05:30:00", "23:30:00"), "peak_ratio": 1.2},
            "SVC_SUNDAY":   {"total": 118, "span": ("05:30:00", "23:30:00"), "peak_ratio": 1.1}
        }
    },
    "LINE7": {
        "headsigns": {0: "Gundavali", 1: "Kashigaon"},
        "services": {
            "SVC_WEEKDAY":  {"total": 276, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.6},
            "SVC_SATURDAY": {"total": 223, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.3},
            "SVC_SUNDAY":   {"total": 205, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.2}
        }
    },
    "LINE2A": {
        "headsigns": {0: "Andheri (West)", 1: "Dahisar (East)"},
        "services": {
            "SVC_WEEKDAY":  {"total": 289, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.6},
            "SVC_SATURDAY": {"total": 231, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.3},
            "SVC_SUNDAY":   {"total": 213, "span": ("05:50:00", "23:00:00"), "peak_ratio": 1.2}
        }
    },
    "LINE2B": {
        "headsigns": {0: "Chembur", 1: "Mandale"},
        "services": {
            "SVC_WEEKDAY":  {"total": 209, "span": ("06:00:00", "22:30:00"), "peak_ratio": 1.0},
            "SVC_SATURDAY": {"total": 209, "span": ("06:00:00", "22:30:00"), "peak_ratio": 1.0},
            "SVC_SUNDAY":   {"total": 209, "span": ("06:00:00", "22:30:00"), "peak_ratio": 1.0}
        }
    },
    "LINE3": {
        "headsigns": {0: "Cuffe Parade", 1: "Aarey JVLR"},
        "services": {
            "SVC_WEEKDAY":  {"total": 292, "span": ("05:30:00", "23:42:00"), "peak_ratio": 1.5},
            "SVC_SATURDAY": {"total": 236, "span": ("05:30:00", "23:39:00"), "peak_ratio": 1.3},
            "SVC_SUNDAY":   {"total": 196, "span": ("05:30:00", "23:40:00"), "peak_ratio": 1.1}
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
    deps = []
    for i in range(target_count):
        target_w = (i / (target_count - 1)) * total_weight
        accum = 0.0
        chosen_m = 0
        for m_idx, w in enumerate(weights):
            accum += w
            if accum >= target_w:
                chosen_m = m_idx
                break
        deps.append(start_dt + timedelta(minutes=chosen_m))
    return deps

# ========================================================
# 4. MASTER BUILD PIPELINE
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

                    dep_delta = timedelta(hours=dep.hour, minutes=dep.minute, seconds=dep.second)
                    for seq, stop_id in enumerate(platforms, start=1):
                        if seq == 1:
                            arr_str = format_time(dep_delta)
                            dep_str = format_time(dep_delta)
                        elif seq == len(platforms):
                            cur_arr = dep_delta + timedelta(seconds=(seq - 1) * HOP_SECONDS)
                            arr_str = format_time(cur_arr)
                            dep_str = format_time(cur_arr)
                        else:
                            cur_arr = dep_delta + timedelta(seconds=(seq - 1) * HOP_SECONDS)
                            cur_dep = cur_arr + timedelta(seconds=DWELL_SECONDS)
                            arr_str = format_time(cur_arr)
                            dep_str = format_time(cur_dep)

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