"""Transcribe line-owned proposed Category A/B facts for Mumbai Lines 9 and 7A."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "datasets/mumbai/evidence"
SOURCE = "SRC-MMRDA-L7A-L9-DPR"
DOCUMENT = "mmrda-metro-line-7a-line-9-dpr.pdf"
DATE = "2026-10-05T00:00:00.000Z"

# Current MMRDA project inventory and the 2017 DPR inventory intentionally
# differ. This table stores the nine DPR-design stations, not current CTM rows.
L9 = [
    ("Pandurang Wadi", 17492.04, None, "ELEVATED", True),
    ("Amar Palace", 18292.871, 800.831, "ELEVATED", False),
    ("Zankar Company", 19212.872, 920.001, "ELEVATED", True),
    ("Sai Baba Nagar", 20512.872, 1300.0, "ELEVATED", True),
    ("Deepak Hospital", 21760.0, 1247.128, "ELEVATED_INTERCHANGE", True),
    ("Shahid Bhagat Singh Garden", 23191.818, 1431.818, "ELEVATED", True),
    ("Subhash Chandra Bose Stadium", 23830.46, 638.642, "ELEVATED_TERMINAL", True),
    ("MBMC Sports Complex", 22885.518, 1125.518, "ELEVATED_BRANCH", True),
    ("Indiralok", 23485.518, 600.0, "ELEVATED_BRANCH_TERMINAL", True),
]
L7A = [
    ("Airport Colony", 572.722, None, "ELEVATED"),
    ("CSIA", 2978.934, 2406.212, "UNDERGROUND_TERMINAL"),
]


def rec(eid, system, category, kind, key, attr, value, page, printed, section,
        unit=None, notes=None):
    d = {
        "evidenceId": eid, "systemCode": system, "category": category,
        "entityType": kind, "entityKey": key, "attribute": attr, "value": value,
        "source": {"sourceId": SOURCE, "document": DOCUMENT, "page": page,
                   "printedPage": printed, "section": section},
        "evidenceType": "DIRECT", "temporalStatus": "PROPOSED",
        "extractionMethod": "MANUAL_TABLE_AND_TEXT_TRANSCRIPTION",
        "confidence": 1.0, "status": "UNVALIDATED", "extractedAt": DATE,
    }
    if unit:
        d["unit"] = unit
    if notes:
        d["notes"] = notes
    return d


def main():
    a, b = [], []
    for i, (name, chain, distance, typ, two_levels) in enumerate(L9, 1):
        key = f"LINE9_DPR_STATION_{i:02d}"
        caution = "2017 DPR design entity; do not bind to current operating station IDs without a name and GIS crosswalk. Current MMRDA inventory and project changes differ from this design-era list."
        a += [
            rec(f"E-L9-A-{i:04d}", "MMRDA_LINE9", "A_NETWORK", "station", key,
                "name_in_dpr", name, 50, "25", "§0.5.2 Table 0.11", notes=caution),
            rec(f"E-L9-A-{i+20:04d}", "MMRDA_LINE9", "A_NETWORK", "station", key,
                "dpr_table_row", i, 50, "25", "§0.5.2 Table 0.11",
                notes="Table row order is not a single linear station sequence: Line 9 includes a branch. Preserve the published listing order without inferring adjacency."),
            rec(f"E-L9-A-{i+40:04d}", "MMRDA_LINE9", "A_NETWORK", "station", key,
                "proposed_chainage_m", chain, 50, "25", "§0.5.2 Table 0.11", "m"),
        ]
        if distance is not None:
            a.append(rec(f"E-L9-A-{i+60:04d}", "MMRDA_LINE9", "A_NETWORK", "station", key,
                         "proposed_interstation_distance_m", distance, 50, "25",
                         "§0.5.2 Table 0.11", "m"))
        b += [
            rec(f"E-L9-B-{i:04d}", "MMRDA_LINE9", "B_STATION_INFRASTRUCTURE", "station", key,
                "proposed_station_type", typ, 47, "22", "§0.5.2", notes=caution),
            rec(f"E-L9-B-{i+20:04d}", "MMRDA_LINE9", "B_STATION_INFRASTRUCTURE", "station", key,
                "proposed_level_inventory", ["CONCOURSE", "PLATFORM"] if two_levels else ["GROUND_CONCOURSE", "PLATFORM"],
                42, "17", "§0.4.3", notes="DPR identifies Amar Palace as a ground-side concourse exception; other elevated Mira-Bhayander stations are proposed with lower concourse and upper platforms."),
            rec(f"E-L9-B-{i+40:04d}", "MMRDA_LINE9", "B_STATION_INFRASTRUCTURE", "platform", key,
                "proposed_platform_configuration", "FOUR_TRACK_INTERCHANGE" if name == "Deepak Hospital" else "TWO_SIDE_PLATFORMS",
                47, "22", "§0.5", notes="The DPR calls Deepak Hospital a four-track interchange type. It does not itself establish current passenger platform numbering."),
        ]

    a += [
        rec("E-L9-A-0081", "MMRDA_LINE9", "A_NETWORK", "line", "MUMBAI_LINE9",
            "dpr_proposed_station_count", 9, 42, "17", "§0.4.3",
            notes="DPR-era extension design count, separate from current operator inventory and operating-phase count."),
        rec("E-L9-A-0082", "MMRDA_LINE9", "A_NETWORK", "line", "MUMBAI_LINE9",
            "dpr_proposed_length_km", 10.406, 42, "17", "§0.4.2 Table 0.7", "km"),
        rec("E-L9-A-0083", "MMRDA_LINE9", "A_NETWORK", "line", "MUMBAI_LINE9",
            "alignment_type", "ELEVATED", 42, "17", "§0.4.2 Table 0.7"),
        rec("E-L9-A-0084", "MMRDA_LINE9", "A_NETWORK", "line", "MUMBAI_LINE9",
            "proposed_terminals", ["Dahisar (East)", "Subhash Chandra Bose Stadium", "Indiralok"],
            42, "17", "§0.4.3", notes="Deepak Hospital is the branch point; the DPR identifies two terminal branches."),
    ]
    b += [
        rec("E-L9-B-0081", "MMRDA_LINE9", "B_STATION_INFRASTRUCTURE", "line_standard",
            "LINE9_STATION_STANDARDS", "proposed_typical_levels", ["CONCOURSE", "PLATFORM"],
            42, "17", "§0.4.3", notes="DPR exception: Amar Palace has a ground-side concourse. Apply only to proposed L9 designs."),
        rec("E-L9-B-0082", "MMRDA_LINE9", "B_STATION_INFRASTRUCTURE", "station",
            "LINE9_DPR_STATION_05", "proposed_interchange_track_count", 4,
            47, "22", "§0.5", notes="Deepak Hospital is identified as the interchange station type with four tracks; platform layout details beyond track count need drawings."),
    ]

    for i, (name, chain, distance, typ) in enumerate(L7A, 1):
        key = f"LINE7A_DPR_STATION_{i:02d}"
        a += [
            rec(f"E-L7A-A-{i:04d}", "MMRDA_LINE7A", "A_NETWORK", "station", key,
                "name_in_dpr", name, 42, "17", "§0.4.4"),
            rec(f"E-L7A-A-{i+10:04d}", "MMRDA_LINE7A", "A_NETWORK", "station", key,
                "dpr_sequence", i, 42, "17", "§0.4.4"),
            rec(f"E-L7A-A-{i+20:04d}", "MMRDA_LINE7A", "A_NETWORK", "station", key,
                "proposed_chainage_m", chain, 50, "25", "§0.5.2 Table 0.11", "m"),
        ]
        if distance is not None:
            a.append(rec(f"E-L7A-A-{i+30:04d}", "MMRDA_LINE7A", "A_NETWORK", "station", key,
                         "proposed_interstation_distance_m", distance, 50, "25",
                         "§0.5.2 Table 0.11", "m"))
        b += [
            rec(f"E-L7A-B-{i:04d}", "MMRDA_LINE7A", "B_STATION_INFRASTRUCTURE", "station", key,
                "proposed_station_type", typ, 43, "18", "§0.4.4", notes="DPR proposal; not current as-built certification."),
        ]
    a += [
        rec("E-L7A-A-0041", "MMRDA_LINE7A", "A_NETWORK", "line", "MUMBAI_LINE7A",
            "dpr_proposed_station_count", 2, 43, "18", "§0.4.4"),
        rec("E-L7A-A-0042", "MMRDA_LINE7A", "A_NETWORK", "line", "MUMBAI_LINE7A",
            "dpr_proposed_length_km", 3.175, 42, "17", "§0.4.2 Table 0.7", "km"),
        rec("E-L7A-A-0043", "MMRDA_LINE7A", "A_NETWORK", "line", "MUMBAI_LINE7A",
            "alignment_type", "MIXED_ELEVATED_UNDERGROUND", 42, "17", "§0.4.2 Table 0.7"),
    ]

    for name, array, path in [
        ("A", a, OUT / "A-network-red-extension-records.json"),
        ("B", b, OUT / "B-station-infrastructure-red-extension-records.json"),
    ]:
        path.write_text(json.dumps(array, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {len(array)} Category {name} Red-extension records to {path.name}.")


if __name__ == "__main__":
    main()
