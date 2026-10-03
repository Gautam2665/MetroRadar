import json
from datetime import datetime

extracted_at = datetime.utcnow().isoformat() + "Z"

evidence_records = []
ev_counter = 1

def add_fact(entity_type, entity_key, attribute, value, unit=None, source_id="SOURCE-001", doc="dpr-metro-line-III.pdf", page=32, section="Section 0.6", table=None, notes=None):
    global ev_counter
    seq = f"{ev_counter:04d}"
    ev_counter += 1
    rec = {
        "evidenceId": f"E-L3-C-{seq}",
        "systemCode": "MMRDA_LINE3",
        "category": "C_OPERATIONS",
        "entityType": entity_type,
        "entityKey": entity_key,
        "attribute": attribute,
        "value": value,
        "source": {
            "sourceId": source_id,
            "document": doc,
            "page": page,
            "section": section,
        },
        "evidenceType": "DIRECT",
        "temporalStatus": "PROPOSED",
        "extractionMethod": "TEXT_PARSING" if not table else "TABLE_EXTRACTION",
        "confidence": 1.0,
        "status": "UNVALIDATED",
        "extractedAt": extracted_at
    }
    if table:
        rec["source"]["table"] = table
    if unit:
        rec["unit"] = unit
    if notes:
        rec["notes"] = notes
    evidence_records.append(rec)

# ==============================================================================
# C1 — Service Span
# ==============================================================================
add_fact("service_span", "LINE3_SERVICE_SPAN", "proposed_operating_window_hours", 19, "hours", page=32, section="Section 0.6", notes="Daily operating window from 05:00 to 24:00 (19 hours)")
add_fact("service_span", "LINE3_SERVICE_SPAN", "proposed_service_start_time", "05:00", page=32, section="Section 0.6", notes="Proposed daily service launch time at terminal stations")
add_fact("service_span", "LINE3_SERVICE_SPAN", "proposed_service_end_time", "24:00", page=32, section="Section 0.6", notes="Proposed daily service shutdown time at terminal stations")
add_fact("service_span", "LINE3_SERVICE_SPAN", "peak_hours_morning", "08:00 - 11:00", page=32, section="Section 0.6", notes="Morning peak demand window")
add_fact("service_span", "LINE3_SERVICE_SPAN", "peak_hours_evening", "17:00 - 20:00", page=32, section="Section 0.6", notes="Evening peak demand window")

# ==============================================================================
# C2 — Service Patterns
# ==============================================================================
add_fact("service_pattern", "PATTERN_THROUGH_COLABA_SEEPZ", "pattern_name", "Through Service (Colaba - SEEPZ)", page=32, section="Section 0.6", notes="Full corridor operation covering all 27 stations (32.546 km)")
add_fact("service_pattern", "PATTERN_THROUGH_COLABA_SEEPZ", "origin_terminal", "Cuffe Parade", page=32, section="Section 0.6")
add_fact("service_pattern", "PATTERN_THROUGH_COLABA_SEEPZ", "destination_terminal", "SEEPZ", page=32, section="Section 0.6")
add_fact("service_pattern", "PATTERN_THROUGH_COLABA_SEEPZ", "stations_served_count", 27, page=32, section="Section 0.6")

add_fact("service_pattern", "PATTERN_SHORT_TURN_COLABA_BANDRA", "pattern_name", "Short-Turn Mid-Terminal Service (Colaba - Bandra)", page=32, section="Section 0.6", notes="Short-turn operation terminating at Bandra Metro (ITO) to serve high-density southern corridor")
add_fact("service_pattern", "PATTERN_SHORT_TURN_COLABA_BANDRA", "origin_terminal", "Cuffe Parade", page=32, section="Section 0.6")
add_fact("service_pattern", "PATTERN_SHORT_TURN_COLABA_BANDRA", "destination_terminal", "Bandra Metro (ITO)", page=32, section="Section 0.6")
add_fact("service_pattern", "PATTERN_SHORT_TURN_COLABA_BANDRA", "stations_served_count", 19, page=32, section="Section 0.6")
add_fact("service_pattern", "PATTERN_SHORT_TURN_COLABA_BANDRA", "operating_rationale", "Colaba-Bandra peak demand (42,000 PHPDT) is double Bandra-SEEPZ demand (20,000 PHPDT)", page=32, section="Section 0.6")

# ==============================================================================
# C3 — Headways / Frequencies
# ==============================================================================
# 2016 Horizon
add_fact("headway", "HEADWAY_2016_COLABA_BANDRA_PEAK", "headway_seconds", 260, "seconds", page=32, table="Table 0.11", notes="Colaba-Bandra 2016 peak headway (4.33 min / 14 trains per hour)")
add_fact("headway", "HEADWAY_2016_COLABA_BANDRA_OFFPEAK", "headway_seconds", 360, "seconds", page=32, table="Table 0.11", notes="Colaba-Bandra 2016 off-peak headway (6.0 min / 10 trains per hour)")
add_fact("headway", "HEADWAY_2016_BANDRA_SEEPZ_PEAK", "headway_seconds", 400, "seconds", page=32, table="Table 0.11", notes="Bandra-SEEPZ 2016 peak headway (6.67 min / 9 trains per hour)")
add_fact("headway", "HEADWAY_2016_BANDRA_SEEPZ_OFFPEAK", "headway_seconds", 600, "seconds", page=32, table="Table 0.11", notes="Bandra-SEEPZ 2016 off-peak headway (10.0 min / 6 trains per hour)")

# 2025 Horizon
add_fact("headway", "HEADWAY_2025_COLABA_BANDRA_PEAK", "headway_seconds", 180, "seconds", page=32, table="Table 0.11", notes="Colaba-Bandra 2025 peak headway (3.0 min / 20 trains per hour)")
add_fact("headway", "HEADWAY_2025_COLABA_BANDRA_OFFPEAK", "headway_seconds", 300, "seconds", page=32, table="Table 0.11", notes="Colaba-Bandra 2025 off-peak headway (5.0 min / 12 trains per hour)")
add_fact("headway", "HEADWAY_2025_BANDRA_SEEPZ_PEAK", "headway_seconds", 360, "seconds", page=32, table="Table 0.11", notes="Bandra-SEEPZ 2025 peak headway (6.0 min / 10 trains per hour)")
add_fact("headway", "HEADWAY_2025_BANDRA_SEEPZ_OFFPEAK", "headway_seconds", 450, "seconds", page=32, table="Table 0.11", notes="Bandra-SEEPZ 2025 off-peak headway (7.5 min / 8 trains per hour)")

# 2031 Horizon
add_fact("headway", "HEADWAY_2031_COLABA_BANDRA_PEAK", "headway_seconds", 150, "seconds", page=32, table="Table 0.11", notes="Colaba-Bandra 2031 peak headway (2.5 min / 24 trains per hour)")
add_fact("headway", "HEADWAY_2031_COLABA_BANDRA_OFFPEAK", "headway_seconds", 240, "seconds", page=32, table="Table 0.11", notes="Colaba-Bandra 2031 off-peak headway (4.0 min / 15 trains per hour)")
add_fact("headway", "HEADWAY_2031_BANDRA_SEEPZ_PEAK", "headway_seconds", 300, "seconds", page=32, table="Table 0.11", notes="Bandra-SEEPZ 2031 peak headway (5.0 min / 12 trains per hour)")
add_fact("headway", "HEADWAY_2031_BANDRA_SEEPZ_OFFPEAK", "headway_seconds", 400, "seconds", page=32, table="Table 0.11", notes="Bandra-SEEPZ 2031 off-peak headway (6.67 min / 9 trains per hour)")

# Ultimate Designed Headway
add_fact("headway", "HEADWAY_DESIGNED_COLABA_BANDRA", "headway_seconds", 150, "seconds", page=33, section="Section 0.8", notes="Ultimate designed headway Colaba-Bandra (2.5 min)")
add_fact("headway", "HEADWAY_DESIGNED_BANDRA_SEEPZ", "headway_seconds", 300, "seconds", page=33, section="Section 0.8", notes="Ultimate designed headway Bandra-SEEPZ (5.0 min)")

# ==============================================================================
# C4 — First / Last Train
# ==============================================================================
add_fact("first_last_train", "FIRST_TRAIN_TERMINALS", "first_train_departure_proposed", "05:00", page=33, section="Section 0.7", notes="First train departure from Cuffe Parade, SEEPZ, and Aarey Depot stabling lines")
add_fact("first_last_train", "LAST_TRAIN_TERMINALS", "last_train_departure_proposed", "24:00", page=32, section="Section 0.6", notes="Last train departure from terminal stations")

# ==============================================================================
# C5 — Fleet Deployment
# ==============================================================================
# 2016 Horizon
add_fact("fleet_deployment", "FLEET_2016", "colaba_bandra_bare_rakes", 22, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2016", "bandra_seepz_bare_rakes", 8, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2016", "total_bare_rakes_required", 30, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2016", "maintenance_spare_rakes", 3, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2016", "traffic_spare_rakes", 2, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2016", "total_rakes_required", 35, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2016", "cars_per_train", 6, "cars", page=32, section="Section 0.6")
add_fact("fleet_deployment", "FLEET_2016", "total_coaches_required", 210, "coaches", page=33, table="Table 0.12")

# 2025 Horizon
add_fact("fleet_deployment", "FLEET_2025", "colaba_bandra_bare_rakes", 31, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2025", "bandra_seepz_bare_rakes", 9, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2025", "total_bare_rakes_required", 40, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2025", "maintenance_spare_rakes", 4, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2025", "traffic_spare_rakes", 3, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2025", "total_rakes_required", 47, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2025", "total_coaches_required", 282, "coaches", page=33, table="Table 0.12")

# 2031 Horizon
add_fact("fleet_deployment", "FLEET_2031", "colaba_bandra_bare_rakes", 35, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2031", "bandra_seepz_bare_rakes", 11, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2031", "total_bare_rakes_required", 46, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2031", "maintenance_spare_rakes", 5, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2031", "traffic_spare_rakes", 4, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2031", "total_rakes_required", 55, "rakes", page=33, table="Table 0.12")
add_fact("fleet_deployment", "FLEET_2031", "total_coaches_required", 330, "coaches", page=33, table="Table 0.12")

# ==============================================================================
# C6 — Turnaround / Reversal
# ==============================================================================
add_fact("turnaround", "REVERSAL_CUFFE_PARADE", "south_reversal_arrangement", "Stabling and reversal tracks south of Cuffe Parade station", page=119, section="Section 4.4.3.i")
add_fact("turnaround", "REVERSAL_BANDRA_ITO", "mid_reversal_arrangement", "1 island + 1 side platform with reversal crossover facilities", page=119, section="Section 4.4.3.ii")
add_fact("turnaround", "REVERSAL_SEEPZ", "north_reversal_arrangement", "Reversal/stabling tracks north of SEEPZ station leading to Aarey Depot ramp", page=119, section="Section 4.4.3.iii")
add_fact("turnaround", "REVERSAL_JICA_OANDM", "jica_reversal_office_location", "Turn-around operation offices installed at terminal stations", source_id="SOURCE-003", doc="jica-line-3-om-study-2015.pdf", page=278, section="Chapter 4", notes="JICA 2015 O&M study specifies field offices for terminal turnaround management")

# ==============================================================================
# C7 — Dwell / Station Operation
# ==============================================================================
add_fact("dwell", "DWELL_STANDARD_INTERMEDIATE", "average_station_dwell_seconds", 30, "seconds", page=32, section="Section 0.6", notes="Nominal station dwell design standard = 30 seconds")
add_fact("dwell", "DWELL_TERMINAL_DRIVER_CHANGE", "terminal_dwell_driver_change_sec", 120, "seconds", source_id="SOURCE-003", doc="jica-line-3-om-study-2015.pdf", page=200, section="Chapter 4", notes="Standard terminal reversal and driver changeover window")

# ==============================================================================
# C8 — Operating Rules
# ==============================================================================
add_fact("operating_rule", "RULE_STABLING_ALLOCATION", "stabling_locations", "Terminal stations (Cuffe Parade, SEEPZ) and Aarey Depot", page=33, section="Section 0.7", notes="For morning 05:00 launch, rakes are stabled at terminal stations and main Aarey Depot")
add_fact("operating_rule", "RULE_SECONDARY_DEPOT_2025", "minor_stabling_depot_capacity", 20, "rakes", page=33, section="Section 0.7", notes="Minor stabling depot for ~20 rakes required for 2025 horizon expansion")

# ==============================================================================
# C9 — Operational Performance Targets
# ==============================================================================
add_fact("performance_target", "TARGET_COMMERCIAL_SPEED", "commercial_speed_target", 32, "km/h", page=32, section="Section 0.6", notes="Target average commercial operating speed including 30s station dwells")
add_fact("performance_target", "TARGET_MAX_SECTIONAL_SPEED", "max_sectional_speed", 80, "km/h", page=117, section="Section 4.3.3")
add_fact("performance_target", "TARGET_PHPDT_CAPACITY_2031", "phpdt_capacity_2031", 54720, "passengers/hour/direction", page=32, section="Section 0.6", notes="Peak Hour Peak Direction Capacity with 6-car trains at 150s headway (@ 8 persons/m² crush density)")
add_fact("performance_target", "TARGET_ENERGY_CONSUMPTION", "specific_energy_consumption_target", 70, "kWh/1000 GTKM", page=33, section="Section 0.8", notes="Traction specific energy consumption assumption")

with open('datasets/mumbai/evidence/C-operations-evidence.json', 'w', encoding='utf-8') as f:
    json.dump(evidence_records, f, indent=2)

print(f'✅ Wrote {len(evidence_records)} Category C Operations evidence records to datasets/mumbai/evidence/C-operations-evidence.json')
