"""Generate detailed DPR-backed Category A and B records for Mumbai L2A/L7.

Source station keys remain independent of operational CTM keys because the
2015 DPR schedules do not yet have a verified station-by-station crosswalk.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "datasets/mumbai/evidence/B-station-infrastructure-l2a-line7-dpr-evidence.json"
OUTPUT_A = ROOT / "datasets/mumbai/evidence/A-network-l2a-line7-records.json"
OUTPUT_B = ROOT / "datasets/mumbai/evidence/B-station-infrastructure-l2a-line7-records.json"

data = json.loads(INPUT.read_text(encoding="utf-8"))
extracted_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
records_by_category = {"A_NETWORK": [], "B_STATION_INFRASTRUCTURE": []}


def add(line, station, attribute, value, *, page, printed_page, section, table=None,
        unit=None, notes=None, entity_type="station", category="B_STATION_INFRASTRUCTURE"):
    source_id = "SRC-MMRDA-L2A-DPR" if line == "line2a" else "SRC-MMRDA-L7-DPR"
    prefix = "L2A" if line == "line2a" else "L7"
    rec = {
        "evidenceId": f"E-{prefix}-{'A' if category == 'A_NETWORK' else 'B'}-{len(records_by_category[category]) + 1:04d}",
        "systemCode": "MMRDA_LINE2A" if line == "line2a" else "MMRDA_LINE7",
        "category": category,
        "entityType": entity_type,
        "entityKey": station,
        "attribute": attribute,
        "value": value,
        "source": {
            "sourceId": source_id,
            "document": "mmrda-metro-line-2a-dpr.pdf" if line == "line2a" else "mmrda-metro-line-7-dpr.pdf",
            "page": page,
            "printedPage": printed_page,
            "section": section,
        },
        "evidenceType": "DIRECT",
        "temporalStatus": "PROPOSED",
        "extractionMethod": "MANUAL_TABLE_AND_TEXT_TRANSCRIPTION",
        "confidence": 1.0,
        "status": "UNVALIDATED",
        "extractedAt": extracted_at,
    }
    if table:
        rec["source"]["table"] = table
    if unit:
        rec["unit"] = unit
    if notes:
        rec["notes"] = notes
    records_by_category[category].append(rec)


for line in ("line2a", "line7"):
    stations = data["dprDesignStations"][line]
    code = "L2A" if line == "line2a" else "L7"
    platform_page = 146 if line == "line2a" else 127
    platform_printed_page = "14/97" if line == "line2a" else "15/92"
    platform_section = "§5.3.1.3" if line == "line2a" else "§5.3.1.3"
    for station in stations:
        key = station["key"]
        page = station["stationDetailPdfPage"]
        printed = station["printedPage"]
        notes = station.get("notes")
        seq = int(key.rsplit("_", 1)[1])
        if line == "line2a":
            schedule_page, schedule_print = (137, "5/97") if seq <= 9 else (138, "6/97")
        else:
            schedule_page, schedule_print = (117, "5/92") if seq <= 4 else ((118, "6/92") if seq <= 13 else (129, "17/92"))
        add(line, key, "name_in_dpr", station["name"], page=schedule_page,
            printed_page=schedule_print, section="§5.2.2.3", table="Table 5.2.1",
            notes="DPR-era proposed station name; not an automatic match to current CTM.", category="A_NETWORK")
        add(line, key, "proposed_station_sequence", seq, page=schedule_page,
            printed_page=schedule_print, section="§5.2.2.3", table="Table 5.2.1",
            notes="DPR station order; not a crosswalk to current CTM order.", category="A_NETWORK")
        add(line, key, "proposed_chainage_m", station["chainageM"], page=page,
            printed_page=printed, section="§5.3.2", unit="m", notes=notes, category="A_NETWORK")
        if station["interStationDistanceM"] is not None:
            add(line, key, "proposed_inter_station_distance_m", station["interStationDistanceM"],
                page=page, printed_page=printed, section="§5.3.2", unit="m", notes=notes, category="A_NETWORK")
        corridor_page = 137 if line == "line2a" else 117
        corridor_printed = "5/97" if line == "line2a" else "5/92"
        add(line, key, "station_type", "ELEVATED", page=corridor_page,
            printed_page=corridor_printed, section="§5.2.1.3",
            notes="The DPR proposes the entire corridor as elevated.", category="A_NETWORK")
        add(line, key, "proposed_rail_level_m_wgs84", station["railLevelM"], page=page,
            printed_page=printed, section="§5.3.2", unit="m", notes="DPR states rail levels are with respect to WGS-84 datum.")
        add(line, key, "proposed_rail_height_above_ground_m", station["railLevelAboveGroundM"],
            page=page, printed_page=printed, section="§5.3.2", unit="m")
        add(line, key, "proposed_platform_count", 2, page=platform_page,
            printed_page=platform_printed_page, section=platform_section,
            notes="Corridor-wide proposed count for elevated stations; not a claim about current platform numbers or arrangement.",
            entity_type="platform")

    standard_page = 166 if line == "line2a" else 147
    standard_print = "34/97" if line == "line2a" else "35/92"
    standard_section = "§5.3.3.1" if line == "line2a" else "§5.3.4.1"
    add(line, f"LINE{code}_STATION_STANDARDS", "standard_station_length_m", 185,
        page=standard_page, printed_page=standard_print, section=standard_section,
        unit="m", notes="DPR proposal; standard station length.", entity_type="line_standard")
    add(line, f"LINE{code}_STATION_STANDARDS", "usual_station_levels",
        ["CONCOURSE", "PLATFORM"], page=standard_page, printed_page=standard_print,
        section=standard_section, notes="DPR typical proposal; terminal exceptions and Line 2A wording conflict are documented in the source audit file.",
        entity_type="line_standard")

    forecast_page = 173 if line == "line2a" else 155
    forecast_print = "41/97" if line == "line2a" else "43/92"
    circulation = (
        {"liftsGroundToConcourse": 4, "liftsConcourseToPlatform": 2,
         "escalatorsGroundToConcourse": 4, "escalatorsConcourseToPlatform": 8}
        if line == "line2a" else
        {"liftsGroundToConcourse": 2, "liftsConcourseToPlatform": 2,
         "escalatorsGroundToConcourse": 2, "escalatorsConcourseToPlatform": 7}
    )
    add(line, f"LINE{code}_STATION_STANDARDS", "projected_2031_vertical_circulation_per_station",
        circulation, page=forecast_page, printed_page=forecast_print, section="Table 5.3.9",
        table="Table 5.3.9", notes="Forecast design quantities only; installed/current equipment not verified.",
        entity_type="line_standard")

    total_length_km = 18.589 if line == "line2a" else 16.475
    corridor_page = 137 if line == "line2a" else 117
    corridor_print = "5/97" if line == "line2a" else "5/92"
    add(line, f"LINE{code}", "proposed_corridor_length_dead_end_to_dead_end_km", total_length_km,
        page=corridor_page, printed_page=corridor_print, section="§5.2.1.3", unit="km",
        notes="DPR proposed dead-end-to-dead-end length; not current operational route length.",
        entity_type="line", category="A_NETWORK")

OUTPUT_A.write_text(json.dumps(records_by_category["A_NETWORK"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
OUTPUT_B.write_text(json.dumps(records_by_category["B_STATION_INFRASTRUCTURE"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(records_by_category['A_NETWORK'])} Category A and {len(records_by_category['B_STATION_INFRASTRUCTURE'])} Category B records")
