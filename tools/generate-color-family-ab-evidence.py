"""Transcribe line-owned, DPR-era Category A/B records for Mumbai colour families."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "datasets/mumbai/evidence"
DATE = "2026-10-05T00:00:00.000Z"

# These are transcriptions of the named DPR station tables, not current CTM
# station rows. Each corridor gets independent evidence files and entity keys.
LINES = {
    "line4": {
        "code": "MMRDA_LINE4", "src": "SRC-MMRDA-L4-DPR", "prefix": "L4",
        "doc": "mmrda-metro-line-4-dpr.pdf", "count": 32,
        "station_page": 23, "printed": "20", "section": "§0.5.2 Table 0.10",
        "platform_page": 23, "platform_printed": "20", "platform_section": "§0.5.2 Station Types",
        "station_type": "ELEVATED", "platform_type": "SIDE_PLATFORMS",
        "level_inventory": ["CONCOURSE", "PLATFORM"], "level_page": 230,
        "level_printed": "228", "level_section": "§5.3.1 Proposed Station Configuration",
        "level_notes": "The DPR states all 32 proposed stations are two levels, with facilities in the lower concourse and platforms above.",
        "stations": [
            ("Bhakti Park Metro", 0, None), ("Wadala TT", 1000, 1000),
            ("Anik Nagar Bus Depot", 1861.61, 861.61), ("Suman Nagar", 2939.997, 1078.387),
            ("Siddharth Colony", 3994.43, 1054.433), ("Amar Mahal Junction", 5338.012, 1343.582),
            ("Garodia Nagar", 5936.538, 598.526), ("Pant Nagar", 7569.215, 1632.677),
            ("Laxmi Nagar", 8646.73, 1077.515), ("Shreyes Cinema", 9267.54, 620.81),
            ("Godrej Company", 10430.356, 1162.816), ("Vikhroli Metro", 11153.477, 723.121),
            ("Surya Nagar", 12158.246, 1004.769), ("Gandhi Nagar", 13160.357, 1002.111),
            ("Naval Housing", 13852.242, 691.885), ("Bhandup Mahapalika", 14631.584, 779.342),
            ("Bhandup Metro", 15680.41, 1048.826), ("Shangrila", 16524.058, 843.648),
            ("Sonapur", 17914.818, 1390.76), ("Mulund Fire Station", 19027.799, 1112.981),
            ("Mulund Naka", 20375.897, 1348.098), ("Teen Haath Naka (Thane)", 21612.245, 1236.348),
            ("RTO Thane", 22290.786, 678.541), ("Mahapalika Marg", 23326.751, 1035.965),
            ("Cadbury Junction", 24119.463, 792.712), ("Majiwada", 24943.751, 824.288),
            ("Kapur bawdi", 26333.014, 1389.263), ("Manpada", 27198.395, 865.381),
            ("Tikuji-ni-wadi", 27974.044, 775.649), ("Dongari Pada", 29439.645, 1465.601),
            ("Vijay Garden", 30348.515, 908.87), ("Kasarvadavali", 31422.088, 1073.573),
        ],
        "note": "The 2016 DPR proposes 32 stations. MMRDA's current Line 4 overview lists 30; preserve this design-era list separately pending the station-name/count crosswalk.",
    },
    "line4a": {
        "code": "MMRDA_LINE4A", "src": "SRC-MMRDA-L4A-DPR", "prefix": "L4A",
        "doc": "mmrda-metro-line-4a-dpr.pdf", "count": 2,
        "station_page": 44, "printed": "20", "section": "§0.5.2 Table 0.9",
        "platform_page": 44, "platform_printed": "20", "platform_section": "§0.5.2 Station Types",
        "station_type": "ELEVATED", "platform_type": "SIDE_PLATFORMS",
        "level_inventory": ["CONCOURSE", "PLATFORM"], "level_page": 166,
        "level_printed": "142", "level_section": "§5.3.1",
        "level_notes": "Both Line 4A stations are explicitly proposed as two-level stations, with passenger/operating facilities at the lower concourse and platforms above.",
        "stations": [("Gowniwada", 32807.032, 1384.944), ("Gaimukh", 34090.120, 1283.088)],
        "note": "The DPR uses corridor chainages continuous with Line 4. These are Line 4A design records; do not append them to Line 4 station entities.",
    },
    "line5": {
        "code": "MMRDA_LINE5", "src": "SRC-MMRDA-L5-DPR", "prefix": "L5",
        "doc": "mmrda-metro-line-5-dpr.pdf", "count": 17,
        "station_page": 122, "printed": "103", "section": "§7.1.1 Table 7.1",
        "platform_page": 122, "platform_printed": "103", "platform_section": "§7.1.3 Platforms",
        "station_type": "ELEVATED", "platform_type": "SIDE_PLATFORMS",
        "level_inventory": ["CONCOURSE", "PLATFORM"], "level_page": 123,
        "level_printed": "104", "level_section": "§7.2 Planning and Design Criteria for Stations",
        "level_notes": "The DPR describes elevated platforms, a concourse containing AFC and public areas, and a typical elevated station layout. The two-level record reflects that proposed design; it does not certify current as-built levels.",
        "stations": [
            ("Kalyan APMC", None, None), ("Kalyan Station", None, None),
            ("Sahajanand Chowk", None, None), ("Durgadi Fort", None, None),
            ("Kon Gaon", None, None), ("Gove Gaon MIDC", None, None),
            ("Rajnouli Village", None, None), ("Temghar", None, None),
            ("Gopal Nagar", None, None), ("Bhiwandi", None, None),
            ("Dhamankar Naka", None, None), ("Anjurphata", None, None),
            ("Purna", None, None), ("Kalher", None, None),
            ("Kasheli", None, None), ("Balkum Naka", None, None),
            ("Kapurbawadi", None, None),
        ],
        "note": "The DPR table extraction has an ambiguous stationing-column alignment in the first rows. Station names and order are transcribed; numeric values are deliberately omitted until the original table layout is checked.",
        "platform_standard": {"attribute": "average_platform_length_m", "value": 180, "page": 74, "printed": "56", "section": "Table 5.1 Basic Requirements", "unit": "m", "notes": "Corridor design parameter only; not a measured/as-built platform length at every station."},
    },
    "line6": {
        "code": "MMRDA_LINE6", "src": "SRC-MMRDA-L6-DPR", "prefix": "L6",
        "doc": "mmrda-metro-line-6-dpr.pdf", "count": 13,
        "station_page": 187, "printed": "163", "section": "§5.2 Table SP1",
        "platform_page": 187, "platform_printed": "163", "platform_section": "§5.2 Station Types / Table SP1",
        "station_type": "ELEVATED", "platform_type": "SIDE_PLATFORMS",
        "stations": [
            ("Swami Samarth Nagar", 0.0, None), ("Adarsh Nagar", 729.1, 729.1),
            ("Jogeshwari (W)", 1718.1, 989.0), ("JVLR", 2882.3, 1164.2),
            ("Shyam Nagar", 3844.0, 961.7), ("Maha Kali Caves", 5392.2, 1548.2),
            ("SEEPZ Village", 6515.0, 1122.8), ("Saki Vihar Road", 7651.3, 1136.3),
            ("Rambaug", 8663.5, 1012.2), ("Powai Lake", 9512.8, 849.3),
            ("IIT, Powai", 10577.2, 1064.4), ("Kanjur Marg (W)", 12235.2, 1658.0),
            ("Vikhroli (EEH)", 13208.8, 973.6),
        ],
        "station_levels": {
            "Swami Samarth Nagar": (18.0, 14.385), "Adarsh Nagar": (25.6, 22.168),
            "Jogeshwari (W)": (33.5, 20.161), "JVLR": (33.4, 18.481),
            "Shyam Nagar": (44.4, 17.693), "Maha Kali Caves": (73.742, 14.117),
            "SEEPZ Village": (47.647, 22.336), "Saki Vihar Road": (42.95, 14.21),
            "Rambaug": (51.5, 14.192), "Powai Lake": (51.4, 14.194),
            "IIT, Powai": (53.4, 14.191), "Kanjur Marg (W)": (34.975, 27.052),
            "Vikhroli (EEH)": (20.0, 15.394),
        },
        "station_level_page": 187, "station_level_printed": "163",
        "station_level_section": "§5.2 Table SP1",
        "station_level_notes": "The DPR table provides highest ground level, rail level and platform height from ground. Values are proposed design elevations, not current as-built survey.",
    },
    "line10": {
        "code": "MMRDA_LINE10", "src": "SRC-MMRDA-L10-DPR", "prefix": "L10",
        "doc": "mmrda-metro-line-10-dpr.pdf", "count": 4,
        "station_page": 46, "printed": "21", "section": "§0.5.1 Table 0.12",
        "platform_page": 46, "platform_printed": "21", "platform_section": "§0.5.1 Station Type",
        "station_type": "ELEVATED", "platform_type": "SIDE_PLATFORMS",
        "level_inventory": ["CONCOURSE", "PLATFORM"], "level_page": 208,
        "level_printed": "183", "level_section": "§5.2 Rail Levels and Alignment",
        "level_notes": "The DPR explicitly proposes a two-level station design. Proposed design only; not as-built certification.",
        "stations": [
            ("Gaimukh Reti Bundar", 35561.281, None),
            ("Varsova Char Phata", 39903.626, 4342.345),
            ("Kashimira", 42588.267, 2684.641),
            ("Shivaji Chowk (Mira Road)", 43461.208, 872.941),
        ],
        "note": "The DPR describes Line 10 as a four-station elevated corridor; some alignment sections run below a hill. Its chainages are continuous with the adjoining Green Line project and remain separate line records.",
    },
    "line11": {
        "code": "MMRDA_LINE11", "src": "SRC-MMRDA-L11-DPR", "prefix": "L11",
        "doc": "mmrda-metro-line-11-dpr.pdf", "count": 10,
        "station_page": 50, "printed": "23", "section": "§0.5 Table 0.11",
        "station_type": None, "platform_type": None,
        "stations": [
            ("Chhatrapati Shivaji Maharaj Terminus", 0.0, None, "UNDERGROUND"),
            ("Carnac Bunder", 1584.597, 1584.597, "UNDERGROUND"),
            ("Clock Tower", 2473.963, 889.366, "UNDERGROUND"),
            ("Wadi Bundar", 3620.461, 1146.498, "UNDERGROUND"),
            ("Darukhana", 4598.000, 977.539, "UNDERGROUND"),
            ("Coal Bunder", 5780.570, 1182.570, "UNDERGROUND"),
            ("Hay Bunder", 6805.016, 1024.446, "UNDERGROUND"),
            ("Sewri Metro", 7656.128, 851.112, "UNDERGROUND"),
            ("BPT Hospital", 9754.193, 2098.065, "ELEVATED"),
            ("Ganesh Nagar", 10722.095, 967.902, "ELEVATED"),
        ],
        "station_levels": {
            "Chhatrapati Shivaji Maharaj Terminus": (-12.2, 17.742),
            "Carnac Bunder": (-17.5, 19.145), "Clock Tower": (-18.0, 20.123),
            "Wadi Bundar": (-16.0, 18.966), "Darukhana": (-17.0, 19.91),
            "Coal Bunder": (-17.0, 18.935), "Hay Bunder": (-17.0, 19.061),
            "Sewri Metro": (-11.0, 14.219), "BPT Hospital": (16.1, 14.884),
            "Ganesh Nagar": (16.0, 14.702),
        },
        "station_level_page_start": 263, "station_level_printed_start": 186,
        "station_level_section": "§5.4 station descriptions",
        "station_level_notes": "DPR proposed rail level and platform depth/height relative to ground; not a current as-built survey.",
        "note": "The DPR proposes ten Line 11 extension stations, eight underground and two elevated. Wadala (Bhakti Park) is described after the numbered station list as the connection to the existing network; it is not counted as an eleventh Line 11 DPR station.",
    },
    "line12": {
        "code": "MMRDA_LINE12", "src": "SRC-MMRDA-L12-DPR", "prefix": "L12",
        "doc": "mmrda-metro-line-12-dpr.pdf", "count": 17,
        "station_page": 45, "printed": "20", "section": "§0.5 Table 0.10",
        "platform_page": 45, "platform_printed": "20", "platform_section": "Table 0.10",
        "station_type": "ELEVATED", "platform_type": "SIDE_PLATFORM",
        "level_inventory": ["CONCOURSE", "PLATFORM"], "level_page": 210,
        "level_printed": "185", "level_section": "§5.2 Rail Levels and Alignment",
        "level_notes": "DPR says a two-level station design is proposed. Apply to corridor design only.",
        "stations": [
            ("Ganesh Nagar", 843.771, 954.1), ("Pisavali Gaon", 2320.000, 1476.2),
            ("Golavli", 3400.000, 1080.0), ("Dombivli MIDC", 4567.083, 1167.1),
            ("Sagaon", 5573.311, 1006.2), ("Sonarpada", 6700.000, 1126.7),
            ("Manpada", 7689.746, 989.7), ("Hedutane", 8947.974, 1258.2),
            ("Kolegaon", 9978.357, 1030.4), ("Nilje Gaon", 11093.376, 1115.0),
            ("Vadavli (Khu.)", 12553.400, 1460.0), ("Bale", 13974.564, 1421.2),
            ("Waklan", 15478.984, 1504.4), ("Turbhe", 16326.986, 848.002),
            ("Pisarve Depot", 17176.971, 849.985), ("Pisarve", 18981.937, 1804.966),
            ("Taloja", 20525.676, 1543.7),
        ],
        "note": "These are the 2019 proposed design station names. The DPR's executive summary Table 0.10 differs slightly in stationing from its Table 0.12 (detailed stations); the values here are transcribed from Table 0.10, without silently reconciling that conflict.",
        "station_levels": {
            "Ganesh Nagar": (14.054, 15.144), "Pisavali Gaon": (16.262, 17.352),
            "Golavli": (12.41, 13.5), "Dombivli MIDC": (13.5, 14.59),
            "Sagaon": (13.627, 14.717), "Sonarpada": (14.638, 15.728),
            "Manpada": (14.774, 15.864), "Hedutane": (13.5, 14.59),
            "Kolegaon": (13.6, 14.69), "Nilje Gaon": (14.668, 15.758),
            "Vadavli (Khu.)": (15.965, 17.055), "Bale": (13.97, 15.06),
            "Waklan": (13.5, 14.59), "Turbhe": (14.2, 15.29),
            "Pisarve Depot": (13.6, 14.69), "Pisarve": (15.6, 16.69),
            "Taloja": (15.0, 16.09),
        },
        "station_level_page_start": 216, "station_level_printed_start": 191,
        "station_level_section": "§5.4 individual station descriptions",
        "station_level_notes": "DPR proposed rail level and platform height above ground; not current as-built survey.",
        "line_standard": {"attribute": "public_concourse_level_proposed", "value": True, "page": 45, "printed": "20", "section": "§0.5.2 Salient Features", "notes": "The DPR states that passenger facilities such as ticketing and information, and operational areas, are provided at concourse level. This is a proposed corridor design statement, not current as-built evidence."},
    },
}


def record(eid, line, category, entity_type, key, attr, value, page, printed, section,
           unit=None, notes=None):
    result = {
        "evidenceId": eid, "systemCode": line["code"], "category": category,
        "entityType": entity_type, "entityKey": key, "attribute": attr, "value": value,
        "source": {"sourceId": line["src"], "document": line["doc"], "page": page,
                   "printedPage": printed, "section": section},
        "evidenceType": "DIRECT", "temporalStatus": "PROPOSED",
        "extractionMethod": "MANUAL_DPR_TABLE_TRANSCRIPTION", "confidence": 1.0,
        "status": "UNVALIDATED", "extractedAt": DATE,
    }
    if unit:
        result["unit"] = unit
    if notes:
        result["notes"] = notes
    return result


def main():
    for key, line in LINES.items():
        a, b = [], []
        prefix = line["prefix"]
        for i, station in enumerate(line["stations"], 1):
            name, chainage, distance, *extra = station
            entity = f"LINE{prefix.removeprefix('L')}_DPR_STATION_{i:02d}"
            station_notes = line.get("note")
            a.extend([
                record(f"E-{prefix}-A-{i:04d}", line, "A_NETWORK", "station", entity,
                       "name_in_dpr", name, line["station_page"], line["printed"], line["section"],
                       notes=station_notes),
                record(f"E-{prefix}-A-{i+100:04d}", line, "A_NETWORK", "station", entity,
                       "dpr_sequence", i, line["station_page"], line["printed"], line["section"]),
            ])
            if chainage is not None:
                a.append(record(f"E-{prefix}-A-{i+200:04d}", line, "A_NETWORK", "station", entity,
                                "proposed_chainage_m", chainage, line["station_page"], line["printed"],
                                line["section"], "m"))
            if distance is not None:
                a.append(record(f"E-{prefix}-A-{i+300:04d}", line, "A_NETWORK", "station", entity,
                                "proposed_interstation_distance_m", distance, line["station_page"],
                                line["printed"], line["section"], "m"))
            station_type = extra[0] if extra else line.get("station_type")
            if station_type:
                b.append(record(f"E-{prefix}-B-{i:04d}", line, "B_STATION_INFRASTRUCTURE",
                                "station", entity, "proposed_station_type", station_type,
                                line["station_page"], line["printed"], line["section"], notes=station_notes))
            if line.get("platform_type"):
                b.append(record(f"E-{prefix}-B-{i+100:04d}", line, "B_STATION_INFRASTRUCTURE",
                                "platform", entity, "proposed_platform_configuration", line["platform_type"],
                                line["platform_page"], line["platform_printed"], line["platform_section"],
                                notes="Proposed DPR configuration. This does not establish platform numbering, travel direction, screen doors, or as-built condition."))
            if line.get("level_inventory"):
                b.append(record(f"E-{prefix}-B-{i+200:04d}", line, "B_STATION_INFRASTRUCTURE",
                                "station", entity, "proposed_level_inventory", line["level_inventory"],
                                line["level_page"], line["level_printed"], line["level_section"],
                                notes=line["level_notes"]))
            if prefix == "L11":
                levels = ["PLATFORM", "CONCOURSE"] if station_type == "UNDERGROUND" else ["GROUND", "CONCOURSE", "PLATFORM"]
                level_page = 216 if station_type == "UNDERGROUND" else 275
                level_printed = "139" if station_type == "UNDERGROUND" else "198"
                level_section = "§4.3.7 Construction of Stations" if station_type == "UNDERGROUND" else "§5.4 Typical Elevated Station"
                b.append(record(f"E-{prefix}-B-{i+200:04d}", line, "B_STATION_INFRASTRUCTURE",
                                "station", entity, "proposed_level_inventory", levels, level_page, level_printed,
                                level_section,
                                notes="DPR design: underground platform below concourse; elevated station is a three-level structure (ground, concourse, platform). Proposed design, not as-built."))
            station_levels = line.get("station_levels", {}).get(name)
            if station_levels:
                page = line.get("station_level_page", line.get("station_level_page_start", 0) + i - 1)
                printed = line.get("station_level_printed", str(int(line.get("station_level_printed_start", 0)) + i - 1))
                rail_level, platform_height = station_levels
                platform_attr = "proposed_platform_depth_below_ground_m" if station_type == "UNDERGROUND" else "proposed_platform_height_from_ground_m"
                b.extend([
                    record(f"E-{prefix}-B-{i+300:04d}", line, "B_STATION_INFRASTRUCTURE", "station",
                           entity, "proposed_rail_level_m", rail_level, page, printed,
                           line["station_level_section"], "m", line["station_level_notes"]),
                    record(f"E-{prefix}-B-{i+400:04d}", line, "B_STATION_INFRASTRUCTURE", "station",
                           entity, platform_attr, platform_height, page,
                           printed, line["station_level_section"], "m", line["station_level_notes"]),
                ])

        a.append(record(f"E-{prefix}-A-0900", line, "A_NETWORK", "line", line["code"],
                        "dpr_proposed_station_count", line["count"], line["station_page"],
                        line["printed"], line["section"], notes=line.get("note")))
        if line.get("platform_standard"):
            s = line["platform_standard"]
            b.append(record(f"E-{prefix}-B-0900", line, "B_STATION_INFRASTRUCTURE", "line_standard",
                            f"{line['code']}_DPR_STANDARDS", s["attribute"], s["value"], s["page"],
                            s["printed"], s["section"], s.get("unit"), s.get("notes")))
        if line.get("line_standard"):
            s = line["line_standard"]
            b.append(record(f"E-{prefix}-B-0900", line, "B_STATION_INFRASTRUCTURE", "line_standard",
                            f"{line['code']}_DPR_STANDARDS", s["attribute"], s["value"], s["page"],
                            s["printed"], s["section"], notes=s.get("notes")))

        for category, records in (("A", a), ("B", b)):
            path = OUT / f"{'A-network' if category == 'A' else 'B-station-infrastructure'}-{key}-records.json"
            path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"{line['code']}: wrote {len(records)} Category {category} proposed records to {path.name}")


if __name__ == "__main__":
    main()
