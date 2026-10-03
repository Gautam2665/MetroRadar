import json
from datetime import datetime

extracted_at = datetime.utcnow().isoformat() + "Z"

evidence_records = [
  # System Metadata
  {
    "evidenceId": "E-L3-A-0001",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "name",
    "value": "Mumbai Metro Line 3 (Colaba - Bandra - SEEPZ)",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 118,
      "section": "Header",
      "table": "Table 4.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Official corridor title in 2011 DPR Chapter 4"
  },
  {
    "evidenceId": "E-L3-A-0002",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "total_length",
    "value": 32546,
    "unit": "m",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 118,
      "section": "Section 4.4",
      "table": "Table 4.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed terminal chainage at SEEPZ station (32,546 meters / 32.546 km)"
  },
  {
    "evidenceId": "E-L3-A-0003",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "total_stations",
    "value": 27,
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 118,
      "table": "Table 4.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "27 proposed stations listed in DPR Table 4.3"
  },
  {
    "evidenceId": "E-L3-A-0004",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "alignment_type",
    "value": "UNDERGROUND",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 119,
      "section": "Section 4.4.1"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "DPR Section 4.4.1 states: Complete metro corridor is proposed to be underground."
  },
  {
    "evidenceId": "E-L3-A-0005",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "zero_reference_point",
    "value": "Centre line of Cuffe Parade Station",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 119,
      "section": "Section 4.4.2"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Zero point of the corridor is considered at the centre line of proposed Cuffe Parade station."
  },
  {
    "evidenceId": "E-L3-A-0006",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "track_gauge",
    "value": 1435,
    "unit": "mm",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 117,
      "section": "Section 4.3.1"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Standard Gauge (1435 mm)"
  },
  {
    "evidenceId": "E-L3-A-0007",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "design_speed_max",
    "value": 80,
    "unit": "km/h",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 117,
      "section": "Section 4.3.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Maximum sectional design speed is 80 km/h."
  },
  {
    "evidenceId": "E-L3-A-0008",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "line",
    "entityKey": "LINE3",
    "attribute": "min_horizontal_curve_radius",
    "value": 300,
    "unit": "m",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 117,
      "table": "Table 4.2"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Minimum horizontal curve radius on mainline is 300m."
  },
  {
    "evidenceId": "E-L3-A-0009",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "depot",
    "entityKey": "AAREY_DEPOT",
    "attribute": "location",
    "value": "Aarey Milk Colony",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 119,
      "section": "Section 4.4.3.iii"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed depot entry ramp located north of Jogeshwari – Vikhroli Link Road leading to Aarey Milk Colony."
  },

  # Terminals
  {
    "evidenceId": "E-L3-A-0010",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "terminal",
    "entityKey": "SOUTH_TERMINAL",
    "attribute": "station",
    "value": "Cuffe Parade",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 119,
      "section": "Section 4.4.3.i"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed Southernmost station with reversal and stabling facilities."
  },
  {
    "evidenceId": "E-L3-A-0011",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "terminal",
    "entityKey": "MID_TERMINAL",
    "attribute": "station",
    "value": "Bandra Metro (ITO)",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 119,
      "section": "Section 4.4.3.ii"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed Mid-terminal station with 1 island + 1 side platform and reversal facilities."
  },
  {
    "evidenceId": "E-L3-A-0012",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "terminal",
    "entityKey": "NORTH_TERMINAL",
    "attribute": "station",
    "value": "SEEPZ",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 119,
      "section": "Section 4.4.3.iii"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TEXT_PARSING",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed Northernmost terminal station with reversal, stabling, and depot ramp connection."
  }
]

# Stations Table Extraction (Table 4.3)
stations_data = [
  (1, "Cuffe Parade", 0, 0, 3.43, -12.30, -15.73),
  (2, "Badhwar Park", 1000, 1000, 3.44, -12.00, -15.44),
  (3, "Vidhan Bhavan", 1600, 600, 5.14, -16.50, -21.64),
  (4, "Churchgate Metro", 2285, 685, 4.00, -19.50, -23.50),
  (5, "Hutatma Chowk", 3102, 817, 6.65, -14.35, -21.00),
  (6, "CST Metro", 3956, 854, 6.68, -10.00, -16.68),
  (7, "Kalbadevi", 4891, 935, 5.15, -15.00, -20.15),
  (8, "Girgaon", 5616, 725, 5.50, -15.10, -20.60),
  (9, "Grant Road Metro", 7156, 1540, 2.41, -17.90, -20.31),
  (10, "Mumbai Central Metro", 8067, 911, 1.95, -13.20, -15.15),
  (11, "Mahalakshmi Metro", 9216, 1149, 2.35, -13.00, -15.35),
  (12, "Science Museum", 10316, 1100, 2.16, -13.10, -15.26),
  (13, "Acharya Atrey Chowk", 11516, 1200, 5.89, -11.00, -16.89),
  (14, "Worli", 12924, 1408, 4.52, -11.40, -15.92),
  (15, "Siddhi Vinayak", 14479, 1555, 4.70, -10.70, -15.40),
  (16, "Dadar Metro", 15756, 1277, 4.85, -10.50, -15.35),
  (17, "Shitla Devi Temple", 17525, 1769, 5.71, -9.60, -15.31),
  (18, "Dharavi", 19306, 1781, 4.46, -10.60, -15.06),
  (19, "Bandra Metro (ITO)", 21271, 1965, 3.56, -11.60, -15.16),
  (20, "Mumbai University, Kalina", 22812, 1541, 3.31, -9.00, -12.31),
  (21, "Santacruz", 24027, 1215, 2.74, -12.30, -15.04),
  (22, "CSIA (Domestic)", 26299, 2272, 5.35, -9.70, -15.05),
  (23, "Sahar Road", 27906, 1607, 13.15, -2.15, -15.30),
  (24, "CSIA (International)", 28958, 1052, 10.37, -5.00, -15.37),
  (25, "Marol Naka", 29829, 871, 11.35, -5.00, -16.35),
  (26, "MIDC", 31225, 1396, 25.72, 8.50, -17.22),
  (27, "SEEPZ", 32546, 1321, 29.81, 14.00, -15.81)
]

ev_idx = 13
for sr, name, chainage, inter_dist, gl, rl, level_diff in stations_data:
  key = f"LINE3_STATION_{sr:02d}"
  
  # Station Name
  evidence_records.append({
    "evidenceId": f"E-L3-A-{ev_idx:04d}",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "station",
    "entityKey": key,
    "attribute": "name",
    "value": name,
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 118 if sr <= 24 else 119,
      "table": "Table 4.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": f"Proposed station name for station #{sr} in DPR Table 4.3"
  })
  ev_idx += 1

  # Station Chainage
  evidence_records.append({
    "evidenceId": f"E-L3-A-{ev_idx:04d}",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "station",
    "entityKey": key,
    "attribute": "chainage_m",
    "value": chainage,
    "unit": "m",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 118 if sr <= 24 else 119,
      "table": "Table 4.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at
  })
  ev_idx += 1

  # Inter-station distance
  if inter_dist > 0:
    evidence_records.append({
      "evidenceId": f"E-L3-A-{ev_idx:04d}",
      "systemCode": "MMRDA_LINE3",
      "category": "A_NETWORK",
      "entityType": "station",
      "entityKey": key,
      "attribute": "inter_station_distance_m",
      "value": inter_dist,
      "unit": "m",
      "source": {
        "sourceId": "SOURCE-001",
        "document": "dpr-metro-line-III.pdf",
        "page": 118 if sr <= 24 else 119,
        "table": "Table 4.3"
      },
      "evidenceType": "DIRECT",
      "temporalStatus": "PROPOSED",
      "extractionMethod": "TABLE_EXTRACTION",
      "confidence": 1.0,
      "status": "UNVALIDATED",
      "extractedAt": extracted_at
    })
    ev_idx += 1

  # Proposed Rail Level
  evidence_records.append({
    "evidenceId": f"E-L3-A-{ev_idx:04d}",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "station",
    "entityKey": key,
    "attribute": "proposed_rail_level_m",
    "value": rl,
    "unit": "m MSL",
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 118 if sr <= 24 else 119,
      "table": "Table 4.3"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed rail level elevation above Mean Sea Level (MSL)"
  })
  ev_idx += 1

# Interchanges (Table 4.4)
interchanges_data = [
  ("Cuffe Parade", "Bus System", "Backbay Bus Depot"),
  ("Churchgate Metro", "Western Railways & Proposed Elevated Suburban", "Churchgate Railway Station & Oval Maidan Station"),
  ("CST Metro", "Central Railways", "CSTM Railway Station"),
  ("Mumbai Central Metro", "Western Railways", "Mumbai Central Railway Station & Bus Stand"),
  ("Mahalakshmi Metro", "Western Railways & Monorail", "Mahalaxmi Railway Station & Jacob Circle Monorail"),
  ("Siddhi Vinayak", "Metro Rail (Proposed)", "Siddhivinayak - Sewri MTHL Metro Corridor"),
  ("Shitla Devi Temple", "Western Railways & Harbour Line", "Mahim Station"),
  ("Bandra Metro (ITO)", "Metro Rail Line 2", "Charkop - Bandra - Mankhurd Metro Corridor"),
  ("Marol Naka", "Metro Rail Line 1", "Versova - Andheri - Ghatkopar Metro Corridor"),
  ("SEEPZ", "Bus System", "SEEPZ Bus Stand")
]

for st_name, mode, inter_with in interchanges_data:
  evidence_records.append({
    "evidenceId": f"E-L3-A-{ev_idx:04d}",
    "systemCode": "MMRDA_LINE3",
    "category": "A_NETWORK",
    "entityType": "interchange",
    "entityKey": f"INTERCHANGE_{st_name.upper().replace(' ', '_').replace('(', '').replace(')', '')}",
    "attribute": "interchange_connection",
    "value": {
      "station": st_name,
      "mode": mode,
      "interchangeWith": inter_with
    },
    "source": {
      "sourceId": "SOURCE-001",
      "document": "dpr-metro-line-III.pdf",
      "page": 120,
      "table": "Table 4.4"
    },
    "evidenceType": "DIRECT",
    "temporalStatus": "PROPOSED",
    "extractionMethod": "TABLE_EXTRACTION",
    "confidence": 1.0,
    "status": "UNVALIDATED",
    "extractedAt": extracted_at,
    "notes": "Proposed interchange connection in DPR Table 4.4"
  })
  ev_idx += 1

with open('datasets/mumbai/evidence/A-network-evidence.json', 'w', encoding='utf-8') as f:
  json.dump(evidence_records, f, indent=2)

print(f'✅ Wrote {len(evidence_records)} Category A evidence records with temporalStatus="PROPOSED" to datasets/mumbai/evidence/A-network-evidence.json')
