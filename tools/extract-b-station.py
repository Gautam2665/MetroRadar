import json
from datetime import datetime

extracted_at = datetime.utcnow().isoformat() + "Z"

evidence_records = []
ev_counter = 1

def add_fact(entity_type, entity_key, attribute, value, unit=None, page=278, section="Section 5.3", table="Table 5.4", notes=None):
    global ev_counter
    seq = f"{ev_counter:04d}"
    ev_counter += 1
    rec = {
        "evidenceId": f"E-L3-B-{seq}",
        "systemCode": "MMRDA_LINE3",
        "category": "B_STATION_INFRASTRUCTURE",
        "entityType": entity_type,
        "entityKey": entity_key,
        "attribute": attribute,
        "value": value,
        "source": {
            "sourceId": "SOURCE-001",
            "document": "dpr-metro-line-III.pdf",
            "page": page,
            "section": section,
            "table": table
        },
        "evidenceType": "DIRECT",
        "temporalStatus": "PROPOSED",
        "extractionMethod": "TABLE_EXTRACTION",
        "confidence": 1.0,
        "status": "UNVALIDATED",
        "extractedAt": extracted_at
    }
    if unit:
        rec["unit"] = unit
    if notes:
        rec["notes"] = notes
    evidence_records.append(rec)

# ==============================================================================
# 1. Global Station Infrastructure Standards (Chapter 5 General Specifications)
# ==============================================================================
add_fact("line_standard", "LINE3_STATION_STANDARDS", "standard_platform_length_m", 250, "m", page=27, section="Section 0.5.2", table="Table 0.8", notes="Designed to accommodate 8-car trains")
add_fact("line_standard", "LINE3_STATION_STANDARDS", "standard_station_box_length_m", 290, "m", page=26, section="Section 0.5.2", notes="Standard cut-and-cover underground station box length")
add_fact("line_standard", "LINE3_STATION_STANDARDS", "min_lift_speed_m_per_s", 1.0, "m/s", page=272, section="Section 5.3", notes="Minimum lift travel speed")
add_fact("line_standard", "LINE3_STATION_STANDARDS", "scada_monitoring_enabled", True, page=272, section="Section 5.3", notes="SCADA monitoring for elevators and escalators")
add_fact("line_standard", "LINE3_STATION_STANDARDS", "accessibility_provisions_mandatory", True, page=272, section="Section 5.3", notes="Lifts and station areas equipped for physically challenged passengers per standards")

# ==============================================================================
# 2. Station-by-Station Infrastructure Data (27 Stations)
# ==============================================================================

# Detailed data extracted from Table 4.3 (Pages 118-119), Table 4.39 (Pages 177-189), Table 5.4 (Pages 278-285)
stations_b_data = [
    # (sr, name, gl, rl, level_diff, platform_type, platform_count, stairs_count, lifts_count, land_plots_count, page_439)
    (1, "Cuffe Parade", 3.43, -12.30, -15.73, "ISLAND", 2, 2, 1, 10, 177),
    (2, "Badhwar Park", 3.44, -12.00, -15.44, "ISLAND", 2, 2, 1, 8, 177),
    (3, "Vidhan Bhavan", 5.14, -16.50, -21.64, "ISLAND", 2, 1, 1, 6, 178),
    (4, "Churchgate Metro", 4.00, -19.50, -23.50, "ISLAND", 2, 2, 1, 9, 178),
    (5, "Hutatma Chowk", 6.65, -14.35, -21.00, "ISLAND", 2, 2, 1, 12, 178),
    (6, "CST Metro", 6.68, -10.00, -16.68, "ISLAND", 2, 3, 1, 11, 178),
    (7, "Kalbadevi", 5.15, -15.00, -20.15, "ISLAND", 2, 2, 1, 7, 179),
    (8, "Girgaon", 5.50, -15.10, -20.60, "ISLAND", 2, 2, 1, 7, 179),
    (9, "Grant Road Metro", 2.41, -17.90, -20.31, "ISLAND", 2, 2, 1, 10, 179),
    (10, "Mumbai Central Metro", 1.95, -13.20, -15.15, "ISLAND", 2, 3, 1, 9, 180),
    (11, "Mahalakshmi Metro", 2.35, -13.00, -15.35, "ISLAND", 2, 3, 1, 8, 180),
    (12, "Science Museum", 2.16, -13.10, -15.26, "ISLAND", 2, 1, 1, 6, 181),
    (13, "Acharya Atrey Chowk", 5.89, -11.00, -16.89, "ISLAND", 2, 3, 1, 8, 181),
    (14, "Worli", 4.52, -11.40, -15.92, "ISLAND", 2, 2, 1, 7, 182),
    (15, "Siddhi Vinayak", 4.70, -10.70, -15.40, "ISLAND", 2, 3, 1, 8, 182),
    (16, "Dadar Metro", 4.85, -10.50, -15.35, "ISLAND", 2, 5, 1, 12, 183),
    (17, "Shitla Devi Temple", 5.71, -9.60, -15.31, "ISLAND", 2, 3, 1, 8, 183),
    (18, "Dharavi", 4.46, -10.60, -15.06, "ISLAND", 2, 3, 1, 8, 184),
    (19, "Bandra Metro (ITO)", 3.56, -11.60, -15.16, "ISLAND_PLUS_SIDE", 3, 5, 1, 14, 184),
    (20, "Mumbai University, Kalina", 3.31, -9.00, -12.31, "ISLAND", 2, 1, 1, 6, 185),
    (21, "Santacruz", 2.74, -12.30, -15.04, "ISLAND", 2, 2, 1, 7, 185),
    (22, "CSIA (Domestic)", 5.35, -9.70, -15.05, "ISLAND", 2, 1, 1, 8, 186),
    (23, "Sahar Road", 13.15, -2.15, -15.30, "ISLAND", 2, 2, 1, 6, 186),
    (24, "CSIA (International)", 10.37, -5.00, -15.37, "ISLAND", 2, 1, 1, 8, 187),
    (25, "Marol Naka", 11.35, -5.00, -16.35, "ISLAND", 2, 3, 1, 9, 187),
    (26, "MIDC", 25.72, 8.50, -17.22, "ISLAND", 2, 2, 1, 7, 188),
    (27, "SEEPZ", 29.81, 14.00, -15.81, "ISLAND", 2, 3, 1, 10, 188),
]

for sr, name, gl, rl, diff, plt_type, plt_cnt, stairs_cnt, lifts_cnt, plots_cnt, page_land in stations_b_data:
    key = f"LINE3_STATION_{sr:02d}"
    p_num = 118 if sr <= 24 else 119

    # B1: Identity & Type
    add_fact("station", key, "name_in_dpr", name, page=p_num, section="Section 4.4", table="Table 4.3", notes="Station name as written in DPR")
    add_fact("station", key, "station_type", "UNDERGROUND", page=p_num, section="Section 4.4.1", notes="100% Underground cut-and-cover/NATM station")
    
    # B2 & B3: Physical Configuration & Levels
    add_fact("platform", f"{key}_PLATFORM", "platform_type", plt_type, page=273 if sr != 19 else 119, section="Section 4.4.3.ii" if sr == 19 else "Section 5.3", notes="Island platform design; Bandra Metro (ITO) has 1 island + 1 side platform for mid-terminal reversals")
    add_fact("platform", f"{key}_PLATFORM", "platform_count", plt_cnt, page=273 if sr != 19 else 119, notes="Number of platform faces")
    add_fact("platform", f"{key}_PLATFORM", "platform_length_m", 250, "m", page=27, section="Section 0.5.2", notes="250m platform length for 8-car train operations")
    
    add_fact("level", f"{key}_LEVEL_GL", "ground_level_m_msl", gl, "m MSL", page=p_num, table="Table 4.3", notes="Ground level elevation above Mean Sea Level")
    add_fact("level", f"{key}_LEVEL_RL", "proposed_rail_level_m_msl", rl, "m MSL", page=p_num, table="Table 4.3", notes="Proposed rail level elevation above Mean Sea Level")
    add_fact("station", key, "rail_level_depth_m", abs(diff), "m", page=p_num, table="Table 4.3", notes="Depth of rail level below ground surface")

    # B4: Vertical Circulation
    add_fact("vertical_circulation", f"{key}_STAIRS", "staircase_count_concourse_to_platform", stairs_cnt, page=279, table="Table 5.4", notes="Calculated staircase count from concourse to platform based on peak load")
    add_fact("vertical_circulation", f"{key}_LIFTS", "min_lift_count_platform_to_concourse", lifts_cnt, page=279, table="Table 5.4", notes="Minimum 8-passenger capacity lift requirement platform-to-concourse")

    # B5: Entrances / Exits (Land plots documented)
    add_fact("entrance_exit", f"{key}_ACCESS", "documented_land_plots_count", plots_cnt, page=page_land, table="Table 4.39", notes=f"Number of distinct land plots allocated for Entry/Exit, Lifts, Escalators, and Ventilation shafts in Table 4.39")

# ==============================================================================
# 3. B7 — Intermodal Integration Evidence Records (Table 4.4, Page 120)
# ==============================================================================
intermodal_connections = [
    ("LINE3_STATION_01", "Cuffe Parade", "Bus System", "Backbay Bus Depot", "BUS_DEPOT", "Bus dispersal facilities to Backbay Bus Depot"),
    ("LINE3_STATION_04", "Churchgate Metro", "Western Railways & Proposed Elevated Suburban", "Churchgate Railway Station & Oval Maidan Station", "SUBURBAN_RAIL", "Pedestrian connection to Churchgate WR Station and Oval Maidan Elevated Station"),
    ("LINE3_STATION_06", "CST Metro", "Central Railways", "CSTM Railway Station", "SUBURBAN_RAIL", "Direct interchange connection to CSTM Railway Station"),
    ("LINE3_STATION_10", "Mumbai Central Metro", "Western Railways & MSRTC", "Mumbai Central Railway Station & Bus Stand", "SUBURBAN_RAIL", "Interchange connection to Mumbai Central Railway Station and Bus Stand"),
    ("LINE3_STATION_11", "Mahalakshmi Metro", "Western Railways & Monorail", "Mahalaxmi Railway Station & Jacob Circle Monorail", "MONORAIL_AND_RAIL", "Connection to Mahalaxmi WR Station and Jacob Circle Monorail"),
    ("LINE3_STATION_15", "Siddhi Vinayak", "Metro Rail (Proposed)", "Siddhivinayak - Sewri MTHL Metro Corridor", "METRO_LINE", "Proposed interchange with Siddhivinayak-Sewri MTHL Metro"),
    ("LINE3_STATION_17", "Shitla Devi Temple", "Western Railways & Harbour Line", "Mahim Station", "SUBURBAN_RAIL", "Interchange at Mahim station with WR and Harbour Lines"),
    ("LINE3_STATION_19", "Bandra Metro (ITO)", "Metro Rail Line 2", "Charkop - Bandra - Mankhurd Metro Corridor", "METRO_LINE", "Passenger interchange with Metro Line 2 (BKC/ITO)"),
    ("LINE3_STATION_22", "CSIA (Domestic)", "Air Transport", "Mumbai Domestic Airport Terminal (T1)", "AIRPORT_TERMINAL", "Direct passenger access to Domestic Airport Terminal T1"),
    ("LINE3_STATION_24", "CSIA (International)", "Air Transport", "Mumbai International Airport Terminal (T2)", "AIRPORT_TERMINAL", "Direct passenger access to International Airport Terminal T2"),
    ("LINE3_STATION_25", "Marol Naka", "Metro Rail Line 1", "Versova - Andheri - Ghatkopar Metro Corridor", "METRO_LINE", "Interchange with Line 1 (Versova-Andheri-Ghatkopar) at Marol Naka"),
    ("LINE3_STATION_27", "SEEPZ", "Bus System", "SEEPZ Bus Stand", "BUS_TERMINAL", "Dispersal connection to SEEPZ Bus Stand")
]

for st_key, st_name, conn_sys, conn_fac, conn_type, desc in intermodal_connections:
    add_fact(
        "intermodal_connection",
        f"INTERMODAL_{st_name.upper().replace(' ', '_').replace('(', '').replace(')', '')}",
        "intermodal_relationship",
        {
            "stationKey": st_key,
            "stationName": st_name,
            "connectedSystem": conn_sys,
            "connectedFacility": conn_fac,
            "connectionType": conn_type,
            "description": desc
        },
        page=120,
        section="Section 4.4.3.iv",
        table="Table 4.4",
        notes="Documented intermodal connection in DPR Table 4.4. No walking times or GTFS transfer penalties assigned."
    )

with open('datasets/mumbai/evidence/B-station-infrastructure-evidence.json', 'w', encoding='utf-8') as f:
    json.dump(evidence_records, f, indent=2)

print(f'✅ Wrote {len(evidence_records)} Category B Station Infrastructure evidence records to datasets/mumbai/evidence/B-station-infrastructure-evidence.json')
