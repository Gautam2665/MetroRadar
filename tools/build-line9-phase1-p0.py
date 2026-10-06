"""Build a source-audited P0 slice for the four operational Line 9 stops.

MMRDA describes Line 9 as continuing through the existing Line 7 Dahisar East
station. The CTM therefore reuses STN_L7_001 at sequence 1 and creates only
three separate Line 9 station entities. DPR P1 values remain proposed and no
platform numbering, direction, or as-built count is invented.
"""

import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "datasets/mumbai"
GIS_PATH = DATA / "sources/gis/arcgis-mumbai.json"
KML_PATH = DATA / "kml/line-9_2.kml"
F_PATH = DATA / "evidence/F-gis-evidence.json"
CTM_PATH = DATA / "normalized/ctm-line9-phase1.json"
CROSSWALK_PATH = DATA / "evidence/dpr-operational-station-crosswalk-line9-phase1.json"
CATALOG_PATH = DATA / "sources/catalog.json"
GIS_REGISTRY_PATH = DATA / "network/gis-evidence-registry.json"
AUDIT_PATH = DATA / "evidence/I-color-family-p0-p1-audit.json"
LINE_REGISTRY_PATH = DATA / "network/line-registry.json"
DATE = "2026-10-05"
ROUTE_FEATURE_ID = 62
MAX_ROUTE_OFFSET_M = 100

STATIONS = [
    {
        "sequence": 1,
        "id": "STN_L7_001",
        "name": "Dahisar (East)",
        "aliases": ["Dahisar East", "Dahisar(E)"],
        "kml": "Dahisar(E) (M) Station",
        "arcgisId": 996,
        "arcgisName": "Dahisar (East)",
        "sharedExistingStation": True,
    },
    {
        "sequence": 2,
        "id": "STN_L9_001",
        "name": "Pandhurang Wadi",
        "aliases": ["Pandurang Wadi", "Pandurang Wadi Station"],
        "kml": "Pandurang Wadi(M) Station",
        "arcgisId": 1094,
        "arcgisName": "Pandurang Wadi Station",
        "sharedExistingStation": False,
    },
    {
        "sequence": 3,
        "id": "STN_L9_002",
        "name": "Miragaon",
        "aliases": ["Amar Palace (KML placemark)"],
        "kml": "Amar Palace(M) Station",
        "arcgisId": 981,
        "arcgisName": "Miragaon",
        "sharedExistingStation": False,
    },
    {
        "sequence": 4,
        "id": "STN_L9_003",
        "name": "Kashigaon",
        "aliases": ["Zankar Company (KML placemark)"],
        "kml": "Zankar Company (M) Station",
        "arcgisId": 982,
        "arcgisName": "Kashigaon",
        "sharedExistingStation": False,
    },
]


def haversine(a, b):
    radius = 6_371_000
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = math.radians(b[0] - a[0])
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(h))


def nearest_route_projection(point, coordinates):
    lat0 = math.radians(point[1])

    def to_xy(item):
        return (
            math.radians(item[0]) * 6_371_000 * math.cos(lat0),
            math.radians(item[1]) * 6_371_000,
        )

    q = to_xy(point)
    best = None
    for index, (a_ll, b_ll) in enumerate(zip(coordinates, coordinates[1:])):
        a, b = to_xy(a_ll), to_xy(b_ll)
        dx, dy = b[0] - a[0], b[1] - a[1]
        denominator = dx * dx + dy * dy
        if denominator == 0:
            continue
        t = max(0.0, min(1.0, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / denominator))
        projected_xy = (a[0] + t * dx, a[1] + t * dy)
        distance = math.hypot(q[0] - projected_xy[0], q[1] - projected_xy[1])
        projected_ll = [a_ll[0] + t * (b_ll[0] - a_ll[0]), a_ll[1] + t * (b_ll[1] - a_ll[1])]
        if best is None or distance < best[0]:
            best = (distance, index, t, projected_ll)
    if best is None:
        raise ValueError("ArcGIS route has no usable segments")
    return best


def cumulative_chainage(coordinates, index, t):
    prior = sum(haversine(a, b) for a, b in zip(coordinates[:index], coordinates[1:index + 1]))
    return prior + haversine(coordinates[index], coordinates[index + 1]) * t


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    gis = read_json(GIS_PATH)
    route_feature = next(feature for feature in gis["lines"]["features"] if feature["properties"].get("objectid") == ROUTE_FEATURE_ID)
    route = route_feature["geometry"]["coordinates"]
    arcgis_points = {feature["id"]: feature for feature in gis["stations"]["features"]}
    namespace = {"k": "http://www.opengis.net/kml/2.2"}
    kml_root = ET.parse(KML_PATH).getroot()
    kml_points = {}
    for placemark in kml_root.findall(".//k:Placemark", namespace):
        name = placemark.findtext("k:name", namespaces=namespace)
        raw = placemark.findtext(".//k:Point/k:coordinates", namespaces=namespace)
        if name and raw:
            kml_points[name] = [float(value) for value in raw.split(",")[:2]]

    projections = []
    crosswalk_rows = []
    point_records = []
    for item in STATIONS:
        if item["kml"] not in kml_points:
            raise ValueError(f"Missing KML point {item['kml']}")
        if item["arcgisId"] not in arcgis_points:
            raise ValueError(f"Missing ArcGIS station feature {item['arcgisId']}")
        coordinate = kml_points[item["kml"]]
        route_offset, segment_index, segment_t, projected = nearest_route_projection(coordinate, route)
        if route_offset > MAX_ROUTE_OFFSET_M:
            raise ValueError(f"{item['name']} is {route_offset:.1f} m from official Line 9 geometry")
        chainage = cumulative_chainage(route, segment_index, segment_t)
        arcgis_station = arcgis_points[item["arcgisId"]]
        point_offset = haversine(coordinate, arcgis_station["geometry"]["coordinates"])
        status = "SPATIAL_CROSSCHECK_WARNING_ARCGIS_STATION_POINT_OFFSET" if point_offset > 200 else "SPATIAL_CROSSCHECKED"
        projections.append((item, coordinate, projected, chainage, segment_index, segment_t, route_offset, point_offset, status))
        crosswalk_rows.append({
            "lineId": "MUMBAI_LINE9",
            "operationalStationId": item["id"],
            "operationalName": item["name"],
            "operatorRouteSequence": item["sequence"],
            "operatorSourceId": "SRC-MMRDA-L9-OVERVIEW",
            "dprEntityKey": None if item["sharedExistingStation"] else None,
            "sharedExistingStation": item["sharedExistingStation"],
            "kmlPlacemark": item["kml"],
            "kmlCoordinatesWgs84": {"longitude": coordinate[0], "latitude": coordinate[1]},
            "arcgisRouteFeatureId": ROUTE_FEATURE_ID,
            "distanceToOfficialRouteMeters": round(route_offset, 1),
            "arcgisStationFeatureId": item["arcgisId"],
            "arcgisStationName": item["arcgisName"],
            "distanceToArcgisStationPointMeters": round(point_offset, 1),
            "crosswalkStatus": status,
            "aliases": item["aliases"],
            "p1Status": "DPR_DESIGN_EVIDENCE_NOT_PROMOTED_TO_AS_BUILT",
        })
        point_records.append({
            "evidenceId": f"E-L9-F-OPS-{item['sequence']:02d}",
            "systemCode": "MMRDA_LINE9",
            "category": "F_GIS",
            "entityType": "station_point_crosscheck",
            "entityKey": item["id"],
            "attribute": "kml_point_crosschecked_against_arcgis",
            "value": {"longitude": coordinate[0], "latitude": coordinate[1]},
            "operatorName": item["name"],
            "source": {
                "sourceId": "SRC-USER-L9-KML",
                "document": "datasets/mumbai/kml/line-9_2.kml",
                "placemark": item["kml"],
                "coordinateSystem": "EPSG:4326",
            },
            "crossValidation": {
                "operatorSourceId": "SRC-MMRDA-L9-OVERVIEW",
                "arcgisSourceId": "SRC-ARCGIS-MOHUA-2025",
                "arcgisRouteFeatureId": ROUTE_FEATURE_ID,
                "distanceToOfficialRouteMeters": round(route_offset, 1),
                "arcgisStationFeatureId": item["arcgisId"],
                "distanceToArcgisStationPointMeters": round(point_offset, 1),
                "status": status,
            },
            "evidenceType": "DIRECT",
            "temporalStatus": "OPERATIONAL",
            "confidence": 0.82 if point_offset > 200 else 0.9,
            "validationStatus": status,
            "priority": "P0",
            "extractedAt": DATE,
            "notes": "Operator confirms this stop is in the operational Dahisar East–Kashigaon phase. KML naming is retained as an alias where it differs from MMRDA's current list. Coordinates are cross-checked against the official Line 9 ArcGIS alignment; point offsets are retained and not averaged.",
        })

    # Official ArcGIS geometry runs from the Mira Bhayander end toward Dahisar.
    # The operational sequence runs from Dahisar to Kashigaon, in reverse.
    first, last = projections[0], projections[-1]
    if first[4] <= last[4]:
        raise ValueError("Unexpected ArcGIS route direction; expected Mira Bhayander to Dahisar")
    clipped = [first[2]] + route[first[4]:last[4]:-1] + [last[2]]
    segment_length = sum(haversine(a, b) for a, b in zip(clipped, clipped[1:]))

    edges = []
    for previous, current in zip(projections, projections[1:]):
        distance = abs(previous[3] - current[3])
        edges.append({
            "edgeId": f"EDGE_L9_{previous[0]['sequence']:02d}_{current[0]['sequence']:02d}",
            "fromStationId": previous[0]["id"],
            "toStationId": current[0]["id"],
            "sequenceFrom": previous[0]["sequence"],
            "sequenceTo": current[0]["sequence"],
            "distanceMeters": round(distance),
            "distanceSource": "OFFICIAL_ARCGIS_LINE_FEATURE_62_STATION_PROJECTION",
            "travelTimeSeconds": None,
            "travelTimeStatus": "UNKNOWN_SOURCE_REQUIRED",
            "bidirectional": True,
        })

    b_records = read_json(DATA / "evidence/B-station-infrastructure-red-extension-records.json")
    b_by_entity = {}
    for record in b_records:
        b_by_entity.setdefault(record["entityKey"], {})[record["attribute"]] = record

    station_rows = []
    for index, projection in enumerate(projections):
        item, coordinate, _, _, _, _, route_offset, point_offset, status = projection
        current = arcgis_points[item["arcgisId"]]
        station = {
            "canonicalId": item["id"],
            "name": item["name"],
            "aliases": item["aliases"],
            "sequence": item["sequence"],
            "latitude": coordinate[1],
            "longitude": coordinate[0],
            "coordinateSystem": "EPSG:4326",
            "status": "OPERATIONAL",
            "stationType": "ELEVATED",
            "temporalStatus": "OPERATIONAL",
            "sharedPhysicalStation": item["sharedExistingStation"],
            "physicalLayout": {
                "interStationDistanceMeters": 0 if index == 0 else edges[index - 1]["distanceMeters"],
                "currentLevelCount": None,
                "currentPlatformCount": None,
                "platformNumberingStatus": "UNKNOWN_SOURCE_REQUIRED",
                "platformDirectionStatus": "UNKNOWN_SOURCE_REQUIRED",
                "screenDoorsInstalled": None,
            },
            "provenance": {
                "spatialEvidenceId": f"E-L9-F-OPS-{item['sequence']:02d}",
                "kmlPlacemark": item["kml"],
                "arcgisRouteFeatureId": ROUTE_FEATURE_ID,
                "arcgisStationFeatureId": current["id"],
                "distanceToOfficialRouteMeters": round(route_offset, 1),
                "distanceToArcgisStationPointMeters": round(point_offset, 1),
                "validationStatus": status,
                "validatedAt": DATE,
            },
        }
        station_rows.append(station)

    ctm = {
        "schemaVersion": "ctm-v1.0",
        "networkId": "MUMBAI_METRO",
        "lineId": "MUMBAI_LINE9",
        "lineCode": "LINE9",
        "lineName": "Mumbai Metro Line 9 (Red Line Extension)",
        "colorHex": "#E31E24",
        "operator": "MMMOCL",
        "status": "PARTIALLY_OPERATIONAL",
        "temporalStatus": "OPERATIONAL_PARTIAL",
        "routeStationCount": 8,
        "operationalStationCount": 4,
        "stationSequenceScope": "CURRENTLY_OPEN_DAHISAR_EAST_TO_KASHIGAON_PHASE_I",
        "commercialRuntimeSeconds": None,
        "scheduleStatus": "BLOCKED_SOURCE_REQUIRED",
        "journeyEngineMode": "TOPOLOGICAL_ACTIVE_TIME_UNKNOWN",
        "totalDistanceMeters": round(segment_length),
        "distanceSemantics": "Derived from the clipped official ArcGIS feature 62 geometry; MMRDA's published phase length is 4.7 km.",
        "stations": station_rows,
        "stationGraph": {
            "nodes": [{"stationId": item["canonicalId"], "name": item["name"], "sequence": item["sequence"], "coordinates": [item["longitude"], item["latitude"]]} for item in station_rows],
            "edges": edges,
            "semantics": "Line 9 continuity reuses the physical Line 7 Dahisar East station entity; no Line 7-to-Line 9 transfer edge is created. No timetable or running times are invented.",
        },
        "alignmentGeometry": {
            "geometryType": "LineString",
            "coordinateSystem": "EPSG:4326",
            "coordinates": clipped,
            "vertexCount": len(clipped),
            "source": {"sourceId": "SRC-ARCGIS-MOHUA-2025", "featureId": ROUTE_FEATURE_ID, "localPath": "sources/gis/arcgis-mumbai.json"},
            "clipEndpoints": ["Dahisar (East)", "Kashigaon"],
            "validationStatus": "OPERATIONAL_PHASE_I_CROSSCHECKED; REMAINING_LINE9_ROUTE_NOT_OPERATIONAL",
        },
        "sourceIds": ["SRC-MMRDA-L9-OVERVIEW", "SRC-ARCGIS-MOHUA-2025", "SRC-USER-L9-KML", "SRC-MMRDA-L7A-L9-DPR"],
        "notes": [
            "MMRDA reports Phase I from Dahisar (East) to Kashigaon, 4.7 km and four stations, operational from 2026-04-07.",
            "The terminal Dahisar East record reuses STN_L7_001, consistent with MMRDA's description of Line 9 as an extension beyond the existing Line 7 station.",
            "The KML placemarks Amar Palace and Zankar Company are retained as aliases for MMRDA's current Miragaon and Kashigaon names; ArcGIS feature IDs 981 and 982 confirm that order spatially.",
            "KML-to-ArcGIS station-point discrepancies for Pandhurang Wadi and Miragaon are recorded; all four KML points are within 54 m of the official Line 9 route geometry.",
            "DPR levels and platform layout remain design evidence. Current level counts, platform numbers/directions, installed gates, and exact as-built levels remain unknown.",
        ],
    }

    crosswalk = {
        "schemaVersion": "tdse-operational-line9-crosswalk-v1",
        "lineId": "MUMBAI_LINE9",
        "status": "PHASE_I_OPERATIONAL_CROSSWALKED; REMAINING_FOUR_ROUTE_STATIONS_UNDER_CONSTRUCTION",
        "operatorSource": "SRC-MMRDA-L9-OVERVIEW",
        "crosswalkBasis": ["MMRDA current route list and Phase I opening notice", "supplied Line 9 KML placemarks", "MoHUA/Esri ArcGIS line feature 62 and station points", "Dahisar East Line 7 physical station identity"],
        "records": crosswalk_rows,
        "unresolved": [
            "Line 9's 2017 DPR uses an earlier station list and branch design; none of its P1 values are promoted to current as-built data by this operational spatial crosswalk.",
            "Pandhurang Wadi's KML point is about 642 m from ArcGIS station point 1094 but only 48 m from the official route; keep KML coordinates with an explicit warning rather than snapping to the offset point.",
            "Miragaon's KML point ('Amar Palace') is about 234 m from ArcGIS station point 981 but lies about 6 m from the official route; retain both source coordinates and the alias.",
            "The clipped ArcGIS geometry distance is derived and must not replace MMRDA's published 4.7 km phase length.",
            "Current as-built level counts, platform numbers/directions, gate installation, and physical transfer measurements remain source-required.",
        ],
        "generatedAt": DATE,
    }

    # Correct the two previously crossed ArcGIS values in the existing records.
    f_records = read_json(F_PATH)
    for feature_id, evidence_id in ((981, "E-L9-F-0003"), (982, "E-L9-F-0004")):
        record = next(item for item in f_records if item.get("evidenceId") == evidence_id)
        feature = arcgis_points[feature_id]
        point = feature["geometry"]["coordinates"]
        record["value"] = {"longitude": point[0], "latitude": point[1]}
        record["source"]["featureId"] = feature_id
        record["notes"] = f"Corrected to match official ArcGIS station feature {feature_id} ({feature['properties']['name']}); current Line 9 names are crosswalked separately from the KML placemark aliases."
    f_records = [item for item in f_records if not str(item.get("evidenceId", "")).startswith("E-L9-F-OPS-")]
    f_records.extend(point_records)
    f_records.append({
        "evidenceId": "E-L9-F-OPS-ALIGN",
        "systemCode": "MMRDA_LINE9",
        "category": "F_GIS",
        "entityType": "alignment_geometry",
        "entityKey": "MUMBAI_LINE9_PHASE_I_DAHISAR_EAST_TO_KASHIGAON",
        "attribute": "operational_phase_linestring_wgs84",
        "value": {"geometryType": "LineString", "coordinates": clipped, "vertexCount": len(clipped), "derivedLengthMeters": round(segment_length)},
        "source": {"sourceId": "SRC-ARCGIS-MOHUA-2025", "document": "datasets/mumbai/sources/gis/arcgis-mumbai.json", "featureId": ROUTE_FEATURE_ID, "coordinateSystem": "EPSG:4326"},
        "crossValidation": {"operatorSourceId": "SRC-MMRDA-L9-OVERVIEW", "publishedPhaseLengthMeters": 4700, "phaseStations": 4, "stationKmlSourceId": "SRC-USER-L9-KML"},
        "evidenceType": "DIRECT",
        "temporalStatus": "OPERATIONAL_PHASE_I",
        "validationStatus": "OPERATIONAL_PHASE_I_CROSSCHECKED",
        "priority": "P0",
        "extractedAt": DATE,
        "notes": "Clipped official ArcGIS feature 62 between the supplied Dahisar East and Kashigaon station KML projections. Derived geometry length is retained separately from MMRDA's 4.7 km published phase length.",
    })
    write_json(F_PATH, f_records)

    catalog = read_json(CATALOG_PATH)
    source_id = "SRC-USER-L9-KML"
    if not any(source.get("sourceId") == source_id for source in catalog["sources"]):
        catalog["sources"].append({
            "sourceId": source_id,
            "title": "Supplied Line 9 station KML",
            "shortName": "Supplied Line 9 KML",
            "publisher": "User-provided GIS reference",
            "authority": "USER_PROVIDED",
            "authorityLevel": "USER_PROVIDED",
            "type": "KML_STATION_REFERENCE",
            "documentPath": "kml/line-9_2.kml",
            "format": "KML",
            "status": "CROSS_CHECKED_AGAINST_OFFICIAL_OPERATOR_AND_ARCGIS_ROUTE",
            "categoriesCovered": ["F_GIS"],
            "applicableTo": ["MMRDA_LINE9"],
            "notes": "Station placemarks for the full eight-stop Line 9 design route. Only the first four stations are currently reported operational. Placemark names that differ from MMRDA's current names are retained as aliases, not canonical names.",
        })
    write_json(CATALOG_PATH, catalog)

    write_json(CTM_PATH, ctm)
    write_json(CROSSWALK_PATH, crosswalk)

    gis_registry = read_json(GIS_REGISTRY_PATH)
    line9_matrix = gis_registry["validationMatrix"]["line9"]
    line9_matrix["stationPoints"] = {
        "primarySource": "SRC-MMRDA-L9-OVERVIEW + supplied KML cross-checked against SRC-ARCGIS-MOHUA-2025",
        "validationSources": ["SRC-MMRDA-L9-OVERVIEW", "SRC-ARCGIS-MOHUA-2025", "SRC-USER-L9-KML"],
        "validationStatus": "PHASE_I_OPERATIONAL_CROSSWALKED; FOURTH_LINE9_STOP_REUSES_LINE7_DAHISAR_ENTITY",
        "operationalStationsInPhase": 4,
        "uniqueLine9StationEntities": 3,
        "maxKmlToOfficialRouteOffsetMeters": round(max(row[6] for row in projections), 1),
        "arcgisStationPointOffsetWarnings": [
            {"station": row[0]["name"], "distanceMeters": round(row[7], 1), "featureId": row[0]["arcgisId"]}
            for row in projections if row[7] > 200
        ],
        "ctmReadyAfterValidation": False,
        "ctmBlocker": "The four-stop phase-I P0 sequence and geometry are normalized; Dahisar East reuses the existing Line 7 station entity. Remaining Line 9 stations are not operational, and current as-built P1 plus DB CTM materialization remain open.",
    }
    line9_matrix["alignmentGeometry"] = {
        "primarySource": "SRC-ARCGIS-MOHUA-2025 feature 62, clipped at the Dahisar East and Kashigaon KML station projections",
        "crossValidationSources": ["SRC-MMRDA-L9-OVERVIEW", "SRC-USER-L9-KML"],
        "operationalSubsegmentVertexCount": len(clipped),
        "operationalSubsegmentDerivedLengthMeters": round(segment_length),
        "operatorPublishedPhaseLengthMeters": 4700,
        "operationalSubsegmentStatus": "CROSS_CHECKED_CANDIDATE",
        "fullRouteValidationStatus": "CANDIDATE_UNVERIFIED_REMAINING_STATIONS_NOT_OPERATIONAL",
        "ctmReadyAfterValidation": False,
    }
    write_json(GIS_REGISTRY_PATH, gis_registry)

    line_registry = read_json(LINE_REGISTRY_PATH)
    line9 = next(line for line in line_registry["lines"] if line.get("lineId") == "MUMBAI_LINE9")
    line9.update({
        "phaseInfo": "MMRDA reports Phase I from Dahisar East to Kashigaon (4.7 km, four stations) operational from 2026-04-07. The line-owned P0 phase sequence is normalized; Dahisar East reuses STN_L7_001 because Line 9 is a through extension beyond the existing station.",
        "operationalSegmentCtmPath": "normalized/ctm-line9-phase1.json",
        "operationalCrosswalkPath": "evidence/dpr-operational-station-crosswalk-line9-phase1.json",
        "operationalSegmentStatus": "P0_PHASE_I_CROSS_CHECKED; DB_CTM_AND_P1_OPEN",
        "operationalSegmentStationIds": [station["canonicalId"] for station in station_rows],
        "ctmReady": False,
        "ctmBlocker": "Phase I has source-crosschecked station topology and GIS. The remaining four route stations are not operational; current as-built P1 and local database materialization remain incomplete.",
    })
    write_json(LINE_REGISTRY_PATH, line_registry)

    audit = read_json(AUDIT_PATH)
    red = next(family for family in audit["families"] if family["familyId"] == "MUMBAI_RED")
    red["currentP0"] = "Line 7 spatial data is validated. Line 9 now has a source-crosschecked four-station Phase I P0 slice from Dahisar East to Kashigaon; Dahisar reuses the Line 7 station entity. The remaining four Line 9 route stations and Line 7A are not yet operational CTM entities."
    red["dprEvidence"]["MUMBAI_LINE9"].update({
        "operationalCtm": "../normalized/ctm-line9-phase1.json",
        "operationalCrosswalk": "dpr-operational-station-crosswalk-line9-phase1.json",
        "operationalStationsInPhase": 4,
        "uniqueLine9StationEntities": 3,
        "status": "PHASE_I_P0_CROSSWALKED; FULL_ROUTE_AND_AS_BUILT_P1_OPEN",
    })
    write_json(AUDIT_PATH, audit)

    print(f"Built Line 9 phase-I P0: {len(station_rows)} stations ({len([x for x in station_rows if not x['sharedPhysicalStation']])} unique Line 9 station entities), {len(clipped)} vertices, {round(segment_length)} m derived.")
    for row in crosswalk_rows:
        print(f"  {row['operationalName']}: KML→route {row['distanceToOfficialRouteMeters']} m; KML→ArcGIS station {row['distanceToArcgisStationPointMeters']} m; {row['crosswalkStatus']}")


if __name__ == "__main__":
    main()
