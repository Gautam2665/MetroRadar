"""Generate isolated DPR-era Category A/B evidence for Yellow Line 2B.

The records are not CTM operational station entities. They retain the 2016
design inventory under LINE2B_DPR_STATION_nn keys until the current name/GIS
crosswalk is resolved.
"""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "datasets" / "mumbai" / "evidence"
SOURCE_ID = "SRC-MMRDA-L2B-DPR"
DOCUMENT = "mmrda-metro-line-2b-dpr.pdf"
EXTRACTED_AT = "2026-10-05T00:00:00.000Z"

# (DPR name, chainage m, interstation distance m, platform side, ground m,
#  rail m, rail-to-ground m, platform-to-ground m)
STATIONS = [
    ("ESIC Nagar", 18637.6, None, "Side", 3.842, 17.300, 13.458, 14.548),
    ("Prem Nagar", 20302.6, 1665.0, "Side", 3.577, 16.700, 13.123, 14.213),
    ("Indira Nagar", 20829.2, 526.6, "Side", 3.236, 17.100, 13.864, 14.954),
    ("Nanavati Hospital", 21902.5, 1073.3, "Side", 4.042, 17.700, 13.658, 14.748),
    ("Khira Nagar", 23509.4, 1606.9, "Side", 3.653, 17.300, 13.647, 14.737),
    ("Saraswat Nagar", 24466.0, 956.6, "Side", 5.792, 19.600, 13.808, 14.898),
    ("National College", 25559.0, 1093.0, "Side", 4.122, 17.700, 13.578, 14.668),
    ("Bandra Metro", 26699.7, 1140.7, "Side", 5.887, 19.600, 13.713, 14.803),
    ("MMRDA Office", 28292.0, 1592.3, "Side", 4.431, 18.000, 13.569, 14.659),
    ("Income Tax Office", 28913.9, 621.9, "Side", 4.087, 17.700, 13.613, 14.703),
    ("ILFS", 30188.0, 1274.1, "Side", 4.625, 18.100, 13.475, 14.565),
    ("MTNL Metro", 30982.8, 794.8, "Side", 4.419, 18.100, 13.681, 14.771),
    ("SG Barve Marg", 32720.2, 1737.4, "Side", 7.624, 21.200, 13.576, 14.666),
    ("Kurla Terminal", 33194.7, 474.5, "Side", 4.801, 19.000, 14.199, 15.289),
    ("Kurla (E)", 34349.2, 1154.5, "Side", 4.884, 18.400, 13.516, 14.606),
    ("EEH", 35356.3, 1007.1, "Side", 3.973, 22.000, 18.027, 19.117),
    ("Chembur", 35996.7, 640.4, "Side", 8.772, 27.000, 18.228, 19.318),
    ("Diamond Garden", 36959.0, 962.3, "Side", 9.396, 31.000, 21.604, 22.694),
    ("Shivaji Chowk", 37819.0, 860.0, "Side", 20.517, 33.900, 13.383, 14.473),
    ("BSNL Metro", 38939.6, 1120.6, "Side", 16.231, 29.400, 13.169, 14.259),
    ("Mankhurd Metro", 40546.7, 1607.1, "Side", 4.249, 17.500, 13.251, 14.341),
    ("Mandala Metro", 41507.4, 960.7, "Side", 3.700, 14.200, 10.500, 11.590),
]


def record(evidence_id, category, entity_type, entity_key, attribute, value,
           page, printed_page, section, unit=None, notes=None, table=None):
    result = {
        "evidenceId": evidence_id,
        "systemCode": "MMRDA_LINE2B",
        "category": category,
        "entityType": entity_type,
        "entityKey": entity_key,
        "attribute": attribute,
        "value": value,
        "source": {
            "sourceId": SOURCE_ID,
            "document": DOCUMENT,
            "page": page,
            "printedPage": printed_page,
            "section": section,
        },
        "evidenceType": "DIRECT",
        "temporalStatus": "PROPOSED",
        "extractionMethod": "MANUAL_TABLE_AND_TEXT_TRANSCRIPTION",
        "confidence": 1.0,
        "status": "UNVALIDATED",
        "extractedAt": EXTRACTED_AT,
    }
    if unit:
        result["unit"] = unit
    if notes:
        result["notes"] = notes
    if table:
        result["source"]["table"] = table
    return result


def main():
    category_a = []
    category_b = []
    for index, station in enumerate(STATIONS, start=1):
        name, chainage, distance, side, ground, rail, rail_ground, platform_ground = station
        key = f"LINE2B_DPR_STATION_{index:02d}"
        sheet_page = 136 + index  # Table 5.7 station sheet, PDF pages 137–158.
        printed_page = f"{sheet_page - 12}/147"
        table_notes = "DPR-era design station. Do not bind to an operational CTM station without a verified name/coordinate crosswalk."

        category_a.extend([
            record(f"E-L2B-A-{index:04d}", "A_NETWORK", "station", key,
                   "name_in_dpr", name, 127, "115", "§5.2.1.4", notes=table_notes),
            record(f"E-L2B-A-{index + 22:04d}", "A_NETWORK", "station", key,
                   "sequence_in_line2b_dpr", index, 127, "115", "§5.2.1.4", notes=table_notes),
            record(f"E-L2B-A-{index + 44:04d}", "A_NETWORK", "station", key,
                   "proposed_chainage_m", chainage, 136, "124", "§5.3.2", "m",
                   table="Table 5.7", notes=table_notes),
        ])
        if distance is not None:
            category_a.append(record(
                f"E-L2B-A-{index + 66:04d}", "A_NETWORK", "station", key,
                "proposed_interstation_distance_m", distance, 136, "124", "§5.3.2", "m",
                table="Table 5.7", notes=table_notes,
            ))
        category_b.extend([
            record(f"E-L2B-B-{index:04d}", "B_STATION_INFRASTRUCTURE", "station", key,
                   "proposed_platform_configuration", side.upper(), 136, "124", "§5.3.2",
                   notes="Table 5.7 lists a side-platform design. This is proposed design evidence, not a current as-built/platform-number assertion.", table="Table 5.7"),
            record(f"E-L2B-B-{index + 22:04d}", "B_STATION_INFRASTRUCTURE", "station", key,
                   "proposed_ground_level_m", ground, 136, "124", "§5.3.2", "m", table="Table 5.7"),
            record(f"E-L2B-B-{index + 44:04d}", "B_STATION_INFRASTRUCTURE", "station", key,
                   "proposed_rail_level_m", rail, 136, "124", "§5.3.2", "m", table="Table 5.7"),
            record(f"E-L2B-B-{index + 66:04d}", "B_STATION_INFRASTRUCTURE", "station", key,
                   "proposed_rail_to_ground_m", rail_ground, 136, "124", "§5.3.2", "m", table="Table 5.7"),
            record(f"E-L2B-B-{index + 88:04d}", "B_STATION_INFRASTRUCTURE", "station", key,
                   "proposed_platform_to_ground_m", platform_ground, 136, "124", "§5.3.2", "m", table="Table 5.7"),
        ])

    category_a.extend([
        record("E-L2B-A-0090", "A_NETWORK", "line", "MUMBAI_LINE2B",
               "proposed_station_count", 22, 127, "115", "§5.2.1.4",
               notes="The section explicitly excludes D.N. Nagar; its first Line 2B station is ESIC Nagar. Do not confuse this DPR count with the current MMRDA overview's 20-name list and conflicting 19-station feature-table count."),
        record("E-L2B-A-0091", "A_NETWORK", "line", "MUMBAI_LINE2B",
               "proposed_alignment_length_km", 23.643, 127, "115", "§5.2.1.3", "km",
               notes="DPR dead-end-to-dead-end design length; source uses Dahisar (East) chainage as the reference while excluding D.N. Nagar from this station section."),
        record("E-L2B-A-0092", "A_NETWORK", "line", "MUMBAI_LINE2B",
               "alignment_type", "ELEVATED", 127, "115", "§5.2.1.3"),
        record("E-L2B-A-0093", "A_NETWORK", "station", "LINE2B_DPR_STATION_09",
               "proposed_chainage_m", 28252.0, 145, "133", "§5.2.2",
               "m", notes="Conflict requiring source review: station detail sheet gives 28,252 m, while Table 5.7 gives 28,292 m. Both source claims are retained.")
    ])
    category_b.extend([
        record("E-L2B-B-0200", "B_STATION_INFRASTRUCTURE", "line_standard",
               "LINE2B_STATION_STANDARDS", "proposed_typical_levels",
               ["CONCOURSE", "PLATFORM"], 127, "115", "§5.2.2.2",
               notes="DPR says the concourse is lower and platforms higher. This two-level design standard does not assert current/as-built station levels."),
        record("E-L2B-B-0201", "B_STATION_INFRASTRUCTURE", "station",
               "LINE2B_DPR_STATION_11", "proposed_layout_exception",
               "TWO_TOWER_STATION", 127, "115", "§5.2.2.2",
               notes="ILFS is the stated exception to the typical station layout."),
        record("E-L2B-B-0202", "B_STATION_INFRASTRUCTURE", "station",
               "LINE2B_DPR_STATION_22", "proposed_layout_exception",
               "GROUND_CONCOURSE_AT_SIDE_OF_ROAD", 127, "115", "§5.2.2.2",
               notes="Mandala terminal's concourse is proposed at ground level beside the road."),
    ])

    # Table 5.7 transcribes MMRDA Office as 28,292 m while the station sheet
    # gives 28,252 m. The table value already appears in the row; keep the
    # conflicting station-sheet value as a distinct lead for review.
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "A-network-line2b-records.json").write_text(
        json.dumps(category_a, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "B-station-infrastructure-line2b-records.json").write_text(
        json.dumps(category_b, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(category_a)} Category A and {len(category_b)} Category B records for 22 DPR-only Line 2B stations.")


if __name__ == "__main__":
    main()
