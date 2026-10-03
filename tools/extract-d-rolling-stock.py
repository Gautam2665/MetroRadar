import json
from datetime import datetime

extracted_at = datetime.utcnow().isoformat() + "Z"

evidence_records = []
ev_counter = 1

def add_fact(entity_type, entity_key, attribute, value, unit=None, page=17, section="Section 0.3.6", table=None, notes=None):
    global ev_counter
    seq = f"{ev_counter:04d}"
    ev_counter += 1
    rec = {
        "evidenceId": f"E-L3-D-{seq}",
        "systemCode": "MMRDA_LINE3",
        "category": "D_ROLLING_STOCK",
        "entityType": entity_type,
        "entityKey": entity_key,
        "attribute": attribute,
        "value": value,
        "source": {
            "sourceId": "SOURCE-001",
            "document": "dpr-metro-line-III.pdf",
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
# D1 — Vehicle Configuration
# ==============================================================================
add_fact("vehicle_configuration", "LINE3_TRAIN_FORMATION", "train_formation_8car", "DTC-M-T-M-T-M-M-DTC", page=17, table="Table 0.4", notes="Proposed 8-car train set formation")
add_fact("vehicle_configuration", "LINE3_TRAIN_FORMATION", "car_types_in_formation", ["Driving Trailer Car (DTC)", "Motor Car (MC)", "Trailer Car (TC)"], page=91, table="Table 3.7")
add_fact("vehicle_configuration", "LINE3_TRAIN_FORMATION", "coach_body_construction", "Lightweight stainless steel body", page=17, table="Table 0.4")
add_fact("vehicle_configuration", "LINE3_TRAIN_FORMATION", "propulsion_drive_system", "3-phase drive system with VVVF control", page=17, table="Table 0.4")

# ==============================================================================
# D2 — Vehicle Dimensions
# ==============================================================================
add_fact("vehicle_dimension", "LINE3_8CAR_TRAIN", "overall_train_length_mm", 178360, "mm", page=17, table="Table 0.4", notes="178.36m total 8-car train length including couplers")
add_fact("vehicle_dimension", "LINE3_CAR", "coach_width_mm", 3200, "mm", page=17, table="Table 0.4", notes="3.20m car width")
add_fact("vehicle_dimension", "LINE3_CAR_DTC", "height_over_pantograph_down_mm", 4118, "mm", page=17, table="Table 0.4", notes="DTC coach height over pantograph in down position")
add_fact("vehicle_dimension", "LINE3_CAR_TC_MC", "height_over_ac_roof_mm", 3898, "mm", page=17, table="Table 0.4", notes="TC/MC coach height over AC portion of roof")
add_fact("vehicle_dimension", "LINE3_CAR_DOORS", "passenger_doors_per_side_count", 4, page=96, section="Section 3.6.5", notes="4 passenger access doors per side per coach")

# ==============================================================================
# D3 — Mass
# ==============================================================================
add_fact("vehicle_mass", "LINE3_AXLE", "max_permissible_axle_load_tonnes", 17.0, "tonnes", page=17, table="Table 0.4", notes="Designed for 17T axle load limit")
add_fact("vehicle_mass", "LINE3_CAR_DTC", "tare_mass_dtc_tonnes", 42.0, "tonnes", page=91, table="Table 3.7", notes="Tare weight of Driving Trailer Car")
add_fact("vehicle_mass", "LINE3_CAR_TC", "tare_mass_tc_tonnes", 42.0, "tonnes", page=91, table="Table 3.7", notes="Tare weight of Trailer Car")
add_fact("vehicle_mass", "LINE3_CAR_MC", "tare_mass_mc_tonnes", 42.0, "tonnes", page=91, table="Table 3.7", notes="Tare weight of Motor Car")

# Normal Load Mass (@ 3 pers/m²)
add_fact("vehicle_mass", "LINE3_CAR_DTC", "normal_passenger_mass_dtc_tonnes", 9.8, "tonnes", page=91, table="Table 3.7", notes="Normal passenger load mass for DTC @ 3 persons/m²")
add_fact("vehicle_mass", "LINE3_CAR_TC", "normal_passenger_mass_tc_tonnes", 10.7, "tonnes", page=91, table="Table 3.7", notes="Normal passenger load mass for TC @ 3 persons/m²")
add_fact("vehicle_mass", "LINE3_CAR_MC", "normal_passenger_mass_mc_tonnes", 10.7, "tonnes", page=91, table="Table 3.7", notes="Normal passenger load mass for MC @ 3 persons/m²")

# Crush Load Mass (@ 6 pers/m²)
add_fact("vehicle_mass", "LINE3_CAR_DTC", "crush_passenger_mass_dtc_tonnes", 16.9, "tonnes", page=91, table="Table 3.7", notes="Crush passenger load mass for DTC @ 6 persons/m²")
add_fact("vehicle_mass", "LINE3_CAR_TC", "crush_passenger_mass_tc_tonnes", 18.4, "tonnes", page=91, table="Table 3.7", notes="Crush passenger load mass for TC @ 6 persons/m²")
add_fact("vehicle_mass", "LINE3_CAR_MC", "crush_passenger_mass_mc_tonnes", 18.4, "tonnes", page=91, table="Table 3.7", notes="Crush passenger load mass for MC @ 6 persons/m²")

# Gross Mass (Normal vs Crush)
add_fact("vehicle_mass", "LINE3_CAR_DTC", "gross_mass_normal_dtc_tonnes", 51.8, "tonnes", page=91, table="Table 3.7")
add_fact("vehicle_mass", "LINE3_CAR_TC", "gross_mass_normal_tc_tonnes", 52.7, "tonnes", page=91, table="Table 3.7")
add_fact("vehicle_mass", "LINE3_CAR_MC", "gross_mass_normal_mc_tonnes", 52.7, "tonnes", page=91, table="Table 3.7")
add_fact("vehicle_mass", "LINE3_CAR_DTC", "gross_mass_crush_dtc_tonnes", 58.9, "tonnes", page=91, table="Table 3.7")
add_fact("vehicle_mass", "LINE3_CAR_TC", "gross_mass_crush_tc_tonnes", 60.4, "tonnes", page=91, table="Table 3.7")
add_fact("vehicle_mass", "LINE3_CAR_MC", "gross_mass_crush_mc_tonnes", 60.4, "tonnes", page=91, table="Table 3.7")

# Passenger Mass Assumption
add_fact("vehicle_mass", "LINE3_PASSENGER", "average_passenger_mass_kg", 60.0, "kg", page=91, section="Section 3.6.3", notes="Design assumption of 60 kg per passenger")

# ==============================================================================
# D4 — Passenger Capacity & Design Density
# ==============================================================================
add_fact("passenger_capacity", "CAPACITY_DENSITY", "normal_standee_density_persons_per_sqm", 3, "persons/m²", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_DENSITY", "crush_standee_density_persons_per_sqm", 6, "persons/m²", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_DENSITY", "overload_standee_density_persons_per_sqm", 10, "persons/m²", page=91, section="Section 3.6.3", notes="Extreme rush hour design overload strength target")

# DTC Capacity
add_fact("passenger_capacity", "CAPACITY_DTC", "seated_capacity_dtc", 43, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_DTC", "standing_capacity_normal_dtc", 120, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_DTC", "total_capacity_normal_dtc", 163, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_DTC", "standing_capacity_crush_dtc", 239, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_DTC", "total_capacity_crush_dtc", 282, "passengers", page=91, table="Table 3.6")

# TC/MC Capacity
add_fact("passenger_capacity", "CAPACITY_TC_MC", "seated_capacity_tc_mc", 50, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_TC_MC", "standing_capacity_normal_tc_mc", 129, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_TC_MC", "total_capacity_normal_tc_mc", 179, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_TC_MC", "standing_capacity_crush_tc_mc", 257, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_TC_MC", "total_capacity_crush_tc_mc", 307, "passengers", page=91, table="Table 3.6")

# Train Formation Total Capacities
add_fact("passenger_capacity", "CAPACITY_4CAR_TRAIN", "total_seated_capacity_4car", 186, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_4CAR_TRAIN", "total_crush_capacity_4car", 1178, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_6CAR_TRAIN", "total_seated_capacity_6car", 286, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_6CAR_TRAIN", "total_crush_capacity_6car", 1792, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_8CAR_TRAIN", "total_seated_capacity_8car", 386, "passengers", page=91, table="Table 3.6")
add_fact("passenger_capacity", "CAPACITY_8CAR_TRAIN", "total_crush_capacity_8car", 2406, "passengers", page=91, table="Table 3.6")

# ==============================================================================
# D5 — Speed Parameters
# ==============================================================================
add_fact("speed_parameter", "SPEED_LIMITS", "max_sectional_operating_speed_kmh", 80, "km/h", page=18, section="Section 0.4.3")
add_fact("speed_parameter", "SPEED_LIMITS", "safe_speed_on_curves_400m_radius_kmh", 80, "km/h", page=18, section="Section 0.4.3")

# ==============================================================================
# D6 — Acceleration
# ==============================================================================
add_fact("acceleration_parameter", "ACCELERATION_RATES", "max_design_acceleration_ms2", 1.1, "m/s²", page=17, table="Table 0.4")
add_fact("acceleration_parameter", "ACCELERATION_RATES", "normal_working_acceleration_ms2", 0.78, "m/s²", page=92, section="Section 3.6.5", notes="Normal working acceleration for scheduled speed calculations")

# ==============================================================================
# D7 — Braking
# ==============================================================================
add_fact("braking_parameter", "BRAKING_RATES", "max_design_deceleration_ms2", 1.3, "m/s²", page=17, table="Table 0.4")
add_fact("braking_parameter", "BRAKING_RATES", "normal_service_deceleration_ms2", 1.0, "m/s²", page=92, section="Section 3.6.5")
add_fact("braking_parameter", "BRAKING_RATES", "emergency_braking_deceleration_ms2", 1.3, "m/s²", page=92, section="Section 3.6.5", notes="Emergency brake deceleration threshold (> 1.3 m/s²)")
add_fact("braking_parameter", "BRAKING_RATES", "braking_system_type", "Electro-pneumatic (EP) with continuous blending of regenerative braking", page=95, section="Section 3.6.5")
add_fact("braking_parameter", "BRAKING_RATES", "primary_braking_mode", "Regenerative braking via VVVF inverter control", page=96, section="Section 3.6.5")

# ==============================================================================
# D8 — Traction & Power
# ==============================================================================
add_fact("traction_power", "LINE3_TRACTION_SUPPLY", "traction_system_type", "25kV AC Overhead Catenary", page=17, table="Table 0.4")
add_fact("traction_power", "LINE3_TRACTION_SUPPLY", "specific_energy_consumption_kwh_per_1000_gtkm", 70.0, "kWh/1000 GTKM", page=33, section="Section 0.8")

# ==============================================================================
# D9 — Train Performance Constraints
# ==============================================================================
add_fact("performance_constraint", "LINE3_ALIGNMENT_CONSTRAINTS", "max_mainline_gradient_pct", 3.0, "%", page=18, section="Section 0.4.3")
add_fact("performance_constraint", "LINE3_ALIGNMENT_CONSTRAINTS", "max_compensated_gradient_short_stretch_pct", 4.0, "%", page=18, section="Section 0.4.3")
add_fact("performance_constraint", "LINE3_ALIGNMENT_CONSTRAINTS", "min_mainline_horizontal_curve_radius_m", 300, "m", page=18, section="Section 0.4.3")
add_fact("performance_constraint", "LINE3_ALIGNMENT_CONSTRAINTS", "max_allowable_cant_mm", 125, "mm", page=18, section="Section 0.4.3")
add_fact("performance_constraint", "LINE3_ALIGNMENT_CONSTRAINTS", "cant_deficiency_mm", 100, "mm", page=18, section="Section 0.4.3")

with open('datasets/mumbai/evidence/D-rolling-stock-evidence.json', 'w', encoding='utf-8') as f:
    json.dump(evidence_records, f, indent=2)

print(f'✅ Wrote {len(evidence_records)} Category D Rolling Stock evidence records to datasets/mumbai/evidence/D-rolling-stock-evidence.json')
