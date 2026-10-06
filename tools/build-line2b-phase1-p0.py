"""Build the source-audited operational P0 slice for Mumbai Line 2B.

Only the six stations MMRDA reports as operational are emitted. KML station
placemarks supply station centers; the official ArcGIS line is clipped between
the two operational termini. Design-era P1 facts remain explicitly proposed.
"""

import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "datasets/mumbai"
GIS_PATH = DATA / "sources/gis/arcgis-mumbai.json"
KML_PATH = DATA / "kml/line_2b.kml"
F_PATH = DATA / "evidence/F-gis-evidence.json"
B_PATH = DATA / "evidence/B-station-infrastructure-line2b-records.json"
CTM_PATH = DATA / "normalized/ctm-line2b-phase1.json"
CROSSWALK_PATH = DATA / "evidence/dpr-operational-station-crosswalk-line2b-phase1.json"
CATALOG_PATH = DATA / "sources/catalog.json"
GIS_REGISTRY_PATH = DATA / "network/gis-evidence-registry.json"
AUDIT_PATH = DATA / "evidence/I-color-family-p0-p1-audit.json"
LINE_REGISTRY_PATH = DATA / "network/line-registry.json"
DATE = "2026-10-05"
ROUTE_FEATURE_ID = 54
MAX_ROUTE_OFFSET_M = 200

STATIONS = [
    {
        "routeSequence": 15, "dprSequence": 17, "name": "Chembur",
        "aliases": [], "kmlName": "CHEMBUR (M) STATION", "arcgisId": 1030,
        "arcgisName": "Chembur", "opened": "2026-08-13",
    },
    {
        "routeSequence": 16, "dprSequence": 18, "name": "Diamond Garden",
        "aliases": ["Deshbhakt N. G. Acharya Udyan"],
        "kmlName": "DIAMOND GARDEN (M) STATION", "arcgisId": 1019,
        "arcgisName": "Diamond Park Metro Station", "opened": "2026-04-07",
    },
    {
        "routeSequence": 17, "dprSequence": 19, "name": "Shivaji Chowk",
        "aliases": ["Chhatrapati Shivaji Maharaj Chowk (Chembur)"],
        "kmlName": "SHIVAJI CHOWK (M) STATION", "arcgisId": 1085,
        "arcgisName": "Shivaji Chk", "opened": "2026-04-07",
    },
    {
        "routeSequence": 18, "dprSequence": 20, "name": "BSNL Metro",
        "aliases": ["Deonar (phase-opening release name)"],
        "kmlName": "BSNL (M) STATION", "arcgisId": 1074,
        "arcgisName": "BSNL Metro Station", "opened": "2026-04-07",
    },
    {
        "routeSequence": 19, "dprSequence": 21, "name": "Mankhurd",
        "aliases": ["Mankhurd Metro"],
        "kmlName": "MANKHURD (M) STATION", "arcgisId": 1075,
        "arcgisName": "Mankhurd Station", "opened": "2026-04-07",
    },
    {
        "routeSequence": 20, "dprSequence": 22, "name": "Mandale",
        "aliases": ["Mandale Metro", "Mandala Metro"],
        "kmlName": "MANDALE (M) STATION", "arcgisId": 1076,
        "arcgisName": "Mandale", "opened": "2026-04-07",
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
    to_xy = lambda p: (math.radians(p[0]) * 6_371_000 * math.cos(lat0), math.radians(p[1]) * 6_371_000)
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
        projected_ll = [
            a_ll[0] + t * (b_ll[0] - a_ll[0]),
            a_ll[1] + t * (b_ll[1] - a_ll[1]),
        ]
        if best is None or distance < best[0]:
            best = (distance, index, t, projected_ll)
    if best is None:
        raise ValueError("ArcGIS route has no usable segments")
    return best


def cumulative_chainage(coordinates, index, t):
    distance = sum(haversine(a, b) for a, b in zip(coordinates[:index], coordinates[1:index + 1]))
    return distance + haversine(coordinates[index], coordinates[index + 1]) * t


def main():
    gis = json.loads(GIS_PATH.read_text(encoding="utf-8"))
    route_feature = next(
        feature for feature in gis["lines"]["features"]
        if feature["properties"].get("objectid") == ROUTE_FEATURE_ID
    )
    route = route_feature["geometry"]["coordinates"]
    arcgis_points = {feature["id"]: feature for feature in gis["stations"]["features"]}

    namespace = {"k": "http://www.opengis.net/kml/2.2"}
    kml_root = ET.parse(KML_PATH).getroot()
    kml_points = {}
    for placemark in kml_root.findall(".//k:Placemark", namespace):
        name = placemark.findtext("k:name", namespaces=namespace)
        raw = placemark.findtext(".//k:coordinates", namespaces=namespace)
        if name and raw and placemark.find(".//k:Point", namespace) is not None:
            kml_points[name] = [float(value) for value in raw.split(",")[:2]]

    b_records = json.loads(B_PATH.read_text(encoding="utf-8"))
    b_by_entity = {}
    line_level_record = None
    for record in b_records:
        b_by_entity.setdefault(record["entityKey"], {})[record["attribute"]] = record
        if record["entityType"] == "line_standard" and record["attribute"] == "proposed_typical_levels":
            line_level_record = record
    if not line_level_record:
        raise ValueError("Line 2B DPR level-standard record is missing")

    crosswalk_rows = []
    station_rows = []
    point_records = []
    projections = []
    for item in STATIONS:
        if item["kmlName"] not in kml_points:
            raise ValueError(f"Missing supplied KML point {item['kmlName']}")
        if item["arcgisId"] not in arcgis_points:
            raise ValueError(f"Missing ArcGIS station feature {item['arcgisId']}")
        coordinate = kml_points[item["kmlName"]]
        route_offset, segment_index, segment_t, projected = nearest_route_projection(coordinate, route)
        if route_offset > MAX_ROUTE_OFFSET_M:
            raise ValueError(f"{item['name']} is {route_offset:.1f}m from the official ArcGIS line (limit {MAX_ROUTE_OFFSET_M}m)")
        chainage = cumulative_chainage(route, segment_index, segment_t)
        arcgis_station = arcgis_points[item["arcgisId"]]
        gis_point_offset = haversine(coordinate, arcgis_station["geometry"]["coordinates"])
        dpr_key = f"LINE2B_DPR_STATION_{item['dprSequence']:02d}"
        b = b_by_entity.get(dpr_key, {})
        proposed = {
            "levelInventory": line_level_record["value"],
            "platformArrangement": b.get("proposed_platform_configuration", {}).get("value"),
            "railLevelMeters": b.get("proposed_rail_level_m", {}).get("value"),
            "platformHeightFromGroundMeters": b.get("proposed_platform_to_ground_m", {}).get("value"),
            "evidenceStatus": "PROPOSED_DPR_NOT_AS_BUILT",
            "sourceId": "SRC-MMRDA-L2B-DPR",
        }
        if not proposed["platformArrangement"] or proposed["railLevelMeters"] is None:
            raise ValueError(f"Missing mapped Category B facts for {dpr_key}")

        canonical_id = f"STN_L2B_{item['routeSequence']:03d}"
        source_point_status = "SPATIAL_CROSSCHECK_WARNING_ARCGIS_STATION_POINT_OFFSET" if gis_point_offset > 200 else "SPATIAL_CROSSCHECKED"
        crosswalk_rows.append({
            "lineId": "MUMBAI_LINE2B",
            "operationalStationId": canonical_id,
            "operationalName": item["name"],
            "operatorRouteSequence": item["routeSequence"],
            "phaseOpeningDate": item["opened"],
            "dprEntityKey": dpr_key,
            "dprName": next(
                record["value"]
                for record in json.loads((DATA / "evidence/A-network-line2b-records.json").read_text(encoding="utf-8"))
                if record.get("entityKey") == dpr_key and record.get("attribute") == "name_in_dpr"
            ),
            "dprSequence": item["dprSequence"],
            "kmlPlacemark": item["kmlName"],
            "coordinatesWgs84": {"longitude": coordinate[0], "latitude": coordinate[1]},
            "arcgisRouteFeatureId": ROUTE_FEATURE_ID,
            "distanceToOfficialRouteMeters": round(route_offset, 1),
            "arcgisStationFeatureId": item["arcgisId"],
            "arcgisStationName": item["arcgisName"],
            "distanceToArcgisStationPointMeters": round(gis_point_offset, 1),
            "crosswalkStatus": source_point_status,
            "aliases": item["aliases"],
            "proposedP1": proposed,
        })
        projections.append((item, coordinate, projected, chainage, segment_index, segment_t))
        point_records.append({
            "evidenceId": f"E-L2B-F-OPS-{item['routeSequence']:02d}",
            "systemCode": "MMRDA_LINE2B",
            "category": "F_GIS",
            "entityType": "station_point",
            "entityKey": canonical_id,
            "attribute": "wgs84_coordinates",
            "value": {"longitude": coordinate[0], "latitude": coordinate[1]},
            "pointClassification": "REVENUE_STATION",
            "sequencePosition": item["routeSequence"],
            "stationNameInSource": item["kmlName"],
            "operationalName": item["name"],
            "source": {
                "sourceId": "SRC-USER-L2B-KML",
                "document": "datasets/mumbai/kml/line_2b.kml",
                "placemark": item["kmlName"],
                "coordinateSystem": "EPSG:4326",
            },
            "crossValidation": {
                "operatorSourceId": "SRC-MMRDA-L2B-OVERVIEW",
                "officialArcgisRouteFeatureId": ROUTE_FEATURE_ID,
                "distanceToOfficialRouteMeters": round(route_offset, 1),
                "arcgisStationFeatureId": item["arcgisId"],
                "distanceToArcgisStationPointMeters": round(gis_point_offset, 1),
                "status": source_point_status,
            },
            "evidenceType": "DIRECT",
            "temporalStatus": "OPERATIONAL",
            "confidence": 0.82 if gis_point_offset > 200 else 0.9,
            "validationStatus": source_point_status,
            "priority": "P0",
            "extractedAt": DATE,
            "notes": "MMRDA confirms this station is operating on Line 2B. Coordinate is the supplied station KML placemark, spatially cross-checked against official ArcGIS route feature 54. ArcGIS station-point offsets are preserved; this record does not claim platform-level or entrance-point accuracy.",
        })
    # The ArcGIS route is directed from Mandale toward D.N. Nagar; CTM route
    # sequence follows MMRDA's D.N. Nagar-to-Mandale order (Chembur to Mandale).
    first = projections[0]
    last = projections[-1]
    if first[4] <= last[4]:
        raise ValueError("Unexpected ArcGIS feature direction; expected Mandale-to-Chembur geometry")
    clipped = [first[2]] + route[first[4]:last[4]:-1] + [last[2]]
    if len(clipped) < 2:
        raise ValueError("Clipped operating geometry is too short")
    segment_length = sum(haversine(a, b) for a, b in zip(clipped, clipped[1:]))

    edge_rows = []
    for previous, current in zip(projections, projections[1:]):
        distance = abs(previous[3] - current[3])
        edge_rows.append({
            "edgeId": f"EDGE_L2B_{previous[0]['routeSequence']:02d}_{current[0]['routeSequence']:02d}",
            "fromStationId": f"STN_L2B_{previous[0]['routeSequence']:03d}",
            "toStationId": f"STN_L2B_{current[0]['routeSequence']:03d}",
            "sequenceFrom": previous[0]["routeSequence"],
            "sequenceTo": current[0]["routeSequence"],
            "distanceMeters": round(distance),
            "distanceSource": "OFFICIAL_ARCGIS_LINE_FEATURE_54_STATION_PROJECTION",
            "travelTimeSeconds": None,
            "travelTimeStatus": "UNKNOWN_SOURCE_REQUIRED",
            "bidirectional": True,
        })

    for index, (item, coordinate, projected, chainage, segment_index, segment_t) in enumerate(projections):
        dpr_key = f"LINE2B_DPR_STATION_{item['dprSequence']:02d}"
        b = b_by_entity[dpr_key]
        station_rows.append({
            "canonicalId": f"STN_L2B_{item['routeSequence']:03d}",
            "stationCode": f"L2B-{item['routeSequence']:02d}",
            "name": item["name"],
            "aliases": item["aliases"],
            "sequence": item["routeSequence"],
            "latitude": coordinate[1],
            "longitude": coordinate[0],
            "coordinateSystem": "EPSG:4326",
            "status": "OPERATIONAL",
            "stationType": "ELEVATED",
            "temporalStatus": "OPERATIONAL",
            "openedDate": item["opened"],
            "physicalLayout": {
                "interStationDistanceMeters": 0 if index == 0 else edge_rows[index - 1]["distanceMeters"],
                "platformCount": None,
                "platformArrangement": None,
                "currentP1Status": "UNKNOWN_SOURCE_REQUIRED",
            },
            "stationInfrastructure": {
                "currentLevelCount": None,
                "currentPlatformCount": None,
                "platformNumberingStatus": "UNKNOWN_SOURCE_REQUIRED",
                "platformDirectionStatus": "UNKNOWN_SOURCE_REQUIRED",
                "screenDoorsInstalled": None,
                "proposedDesign": {
                    "levelInventory": [record["value"] for record in b_records if record["entityType"] == "line_standard" and record["attribute"] == "proposed_typical_levels"][0],
                    "platformArrangement": b["proposed_platform_configuration"]["value"],
                    "railLevelMeters": b["proposed_rail_level_m"]["value"],
                    "platformHeightFromGroundMeters": b["proposed_platform_to_ground_m"]["value"],
                    "evidenceStatus": "PROPOSED_DPR_NOT_AS_BUILT",
                },
            },
            "provenance": {
                "spatialEvidenceId": f"E-L2B-F-OPS-{item['routeSequence']:02d}",
                "dprEntityKey": dpr_key,
                "kmlPlacemark": item["kmlName"],
                "arcgisRouteFeatureId": ROUTE_FEATURE_ID,
                "arcgisStationFeatureId": item["arcgisId"],
                "distanceToOfficialRouteMeters": crosswalk_rows[index]["distanceToOfficialRouteMeters"],
                "distanceToArcgisStationPointMeters": crosswalk_rows[index]["distanceToArcgisStationPointMeters"],
                "validationStatus": crosswalk_rows[index]["crosswalkStatus"],
                "validatedAt": DATE,
            },
        })

    ctm = {
        "schemaVersion": "ctm-v1.0",
        "networkId": "MUMBAI_METRO",
        "lineId": "MUMBAI_LINE2B",
        "lineCode": "LINE2B",
        "lineName": "Mumbai Metro Line 2B (Yellow Line)",
        "colorHex": "#F0C800",
        "operator": "MMMOCL",
        "status": "PARTIALLY_OPERATIONAL",
        "temporalStatus": "OPERATIONAL_PARTIAL",
        "routeStationCount": 20,
        "operationalStationCount": 6,
        "stationSequenceScope": "CURRENTLY_OPEN_OPERATIONAL_SUBSEGMENT_ONLY",
        "commercialRuntimeSeconds": None,
        "scheduleStatus": "BLOCKED_SOURCE_REQUIRED",
        "journeyEngineMode": "TOPOLOGICAL_ACTIVE_TIME_UNKNOWN",
        "totalDistanceMeters": round(segment_length),
        "distanceSemantics": "Derived from clipped official ArcGIS feature 54 geometry; not an MMRDA published opening-segment length.",
        "stations": station_rows,
        "stationGraph": {
            "nodes": [{"stationId": s["canonicalId"], "name": s["name"], "sequence": s["sequence"], "coordinates": [s["longitude"], s["latitude"]]} for s in station_rows],
            "edges": edge_rows,
            "semantics": "Operational adjacency only; no timetable or running times are invented.",
        },
        "alignmentGeometry": {
            "geometryType": "LineString",
            "coordinateSystem": "EPSG:4326",
            "coordinates": clipped,
            "vertexCount": len(clipped),
            "source": {"sourceId": "SRC-ARCGIS-MOHUA-2025", "featureId": ROUTE_FEATURE_ID, "localPath": "sources/gis/arcgis-mumbai.json"},
            "clipEndpoints": ["Chembur", "Mandale"],
            "validationStatus": "OPERATIONAL_SUBSEGMENT_CROSSCHECKED; FULL_LINE_REMAINS_CANDIDATE",
        },
        "sourceIds": ["SRC-MMRDA-L2B-OVERVIEW", "SRC-ARCGIS-MOHUA-2025", "SRC-USER-L2B-KML", "SRC-MMRDA-L2B-DPR"],
        "notes": [
            "MMRDA's current overview lists 20 route stations and reports six operational stations as of 31 August 2026.",
            "The supplied KML and ArcGIS line route are close for all six station markers (under 200 m), but several ArcGIS station-point offsets remain; they are recorded individually in the crosswalk.",
            "DPR levels and side-platform arrangement are proposed design facts. Current platform counts, numbering, direction, installed platform gates, and exact as-built levels remain unknown.",
            "MMRDA's phase-opening update calls the BSNL Metro stop Deonar; the current project station list, DPR, KML, and ArcGIS use BSNL Metro. Both names are retained as a crosswalk issue.",
        ],
    }

    crosswalk = {
        "schemaVersion": "tdse-operational-dpr-crosswalk-v1",
        "lineId": "MUMBAI_LINE2B",
        "status": "PARTIAL_OPERATIONAL_STATION_CROSSWALK; REMAINING_14_STATIONS_UNRESOLVED",
        "operatorSource": "SRC-MMRDA-L2B-OVERVIEW",
        "crosswalkBasis": ["MMRDA current route list", "MMRDA phase opening notices", "DPR station sequence", "supplied station KML placemarks", "MoHUA/Esri ArcGIS line feature 54 and station points"],
        "records": crosswalk_rows,
        "unresolved": [
            "The DPR's 22-station baseline conflicts with MMRDA's current 20-name route list; only the six operational stations are mapped here.",
            "MMRDA calls BSNL Metro 'Deonar' in its phase-opening update but BSNL Metro in the current route list and DPR.",
            "The ArcGIS Mankhurd station point is 770 m from the supplied Mankhurd KML marker; the marker is 167 m from the ArcGIS route geometry. The KML marker is retained with a warning.",
            "MMRDA reports the Chembur extension as 0.29 km; the KML / ArcGIS route-derived Chembur-to-Diamond Garden spacing is not consistent with that figure and needs authoritative as-built station-center clarification.",
            "Current as-built level counts, per-line platform counts, platform numbering/directions, and installed half-height gate status are not established by these sources.",
        ],
        "generatedAt": DATE,
    }

    ctm_path = CTM_PATH
    ctm_path.write_text(json.dumps(ctm, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CROSSWALK_PATH.write_text(json.dumps(crosswalk, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    current_f = json.loads(F_PATH.read_text(encoding="utf-8"))
    retained = [record for record in current_f if record.get("systemCode") != "MMRDA_LINE2B"]
    retained.extend(point_records)
    retained.append({
        "evidenceId": "E-L2B-F-ALIGNMENT-OPS-001",
        "systemCode": "MMRDA_LINE2B",
        "category": "F_GIS",
        "entityType": "alignment_geometry",
        "entityKey": "MUMBAI_LINE2B_OPERATIONAL_SUBSEGMENT_CHEMBUR_MANDALE",
        "attribute": "validated_subsegment_geometry_reference",
        "value": {"geometryType": "LineString", "vertexCount": len(clipped), "lengthMeters": round(segment_length), "coordinateSystem": "EPSG:4326", "ctmPath": "normalized/ctm-line2b-phase1.json"},
        "source": {"sourceId": "SRC-ARCGIS-MOHUA-2025", "document": "datasets/mumbai/sources/gis/arcgis-mumbai.json", "featureId": ROUTE_FEATURE_ID},
        "validation": {"operatorSourceId": "SRC-MMRDA-L2B-OVERVIEW", "stationKmlSourceId": "SRC-USER-L2B-KML", "operationalStationCount": 6, "maximumKmlToRouteOffsetMeters": round(max(row["distanceToOfficialRouteMeters"] for row in crosswalk_rows), 1), "status": "OPERATIONAL_SUBSEGMENT_CROSSCHECKED"},
        "evidenceType": "DIRECT",
        "temporalStatus": "OPERATIONAL_PARTIAL",
        "confidence": 0.88,
        "validationStatus": "OPERATIONAL_SUBSEGMENT_CROSSCHECKED; FULL_LINE_REMAINS_CANDIDATE",
        "priority": "P0",
        "extractedAt": DATE,
        "notes": "ArcGIS line feature 54 clipped between the KML station markers for Chembur and Mandale. The full 20-station route is not promoted by this segment record.",
    })
    F_PATH.write_text(json.dumps(retained, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    kml_source = {
        "sourceId": "SRC-USER-L2B-KML",
        "title": "Supplied Metro Line 2B station reference KML",
        "shortName": "Supplied Line 2B station KML",
        "publisher": "User-provided project asset; original publisher metadata is not embedded",
        "authority": "USER_PROVIDED_SPATIAL_REFERENCE",
        "authorityLevel": "USER_PROVIDED",
        "type": "KML_STATION_REFERENCE",
        "documentPath": "../kml/line_2b.kml",
        "publicationDate": "UNKNOWN",
        "format": "KML",
        "status": "CROSS_CHECKED_CANDIDATE",
        "categoriesCovered": ["F_GIS"],
        "applicableLines": ["MUMBAI_LINE2B"],
        "notes": "Contains labeled Line 2B station placemarks. Operational station identities were checked against MMRDA's current route/phase notices and placemark positions were measured against official ArcGIS line feature 54. Preserve the observed ArcGIS station-point offsets; this supplied asset alone is not an official as-built survey.",
    }
    catalog["sources"] = [source for source in catalog["sources"] if source.get("sourceId") != kml_source["sourceId"]]
    catalog["sources"].append(kml_source)
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    gis_registry = json.loads(GIS_REGISTRY_PATH.read_text(encoding="utf-8"))
    l2b_validation = gis_registry["validationMatrix"]["line2b"]
    l2b_validation["stationPoints"] = {
        "primarySource": "Supplied Line 2B station KML placemarks cross-checked against MMRDA's current operational list and MoHUA/Esri ArcGIS feature 54",
        "validationSources": ["SRC-MMRDA-L2B-OVERVIEW", "SRC-ARCGIS-MOHUA-2025", "SRC-USER-L2B-KML", "SRC-MMRDA-L2B-DPR"],
        "validationStatus": "PARTIAL_OPERATIONAL_SEGMENT_CROSS_CHECKED; FULL_ROUTE_CROSSWALK_PENDING",
        "crossCheckedOperationalStationPoints": len(station_rows),
        "maxKmlToArcgisRouteOffsetMeters": round(max(row["distanceToOfficialRouteMeters"] for row in crosswalk_rows), 1),
        "arcgisStationPointOffsetWarnings": [
            {"station": row["operationalName"], "distanceMeters": row["distanceToArcgisStationPointMeters"], "featureId": row["arcgisStationFeatureId"]}
            for row in crosswalk_rows if row["distanceToArcgisStationPointMeters"] > 200
        ],
        "ctmReadyAfterValidation": False,
        "ctmBlocker": "The six-station operational segment now has line-owned CTM evidence and a source crosswalk, but current database CTM materialization, as-built P1, and the remaining 14 current route stations are not complete. Mankhurd's ArcGIS station point is offset 770 m from the supplied KML marker.",
    }
    l2b_validation["alignmentGeometry"] = {
        "primarySource": f"SRC-ARCGIS-MOHUA-2025 feature {ROUTE_FEATURE_ID}, clipped at the Chembur and Mandale station projections",
        "crossValidationSources": ["SRC-MMRDA-L2B-OVERVIEW", "SRC-USER-L2B-KML"],
        "operationalSubsegmentVertexCount": len(clipped),
        "operationalSubsegmentDerivedLengthMeters": round(segment_length),
        "operationalSubsegmentStatus": "CROSS_CHECKED_CANDIDATE",
        "fullRouteValidationStatus": "CANDIDATE_UNVERIFIED",
        "ctmReadyAfterValidation": False,
    }
    gap = next(gap for gap in gis_registry["gisKnowledgeGaps"] if gap.get("gapId") == "GIS-GAP-003")
    gap.update({
        "description": "MMRDA reports six currently operational Line 2B stations. All six supplied KML station placemarks are within 167 m of the official ArcGIS route feature and map to the current operator sequence and DPR entries. The ArcGIS station point for Mankhurd is 770 m from its KML marker; Chembur is 210 m from its ArcGIS point. The six-stop CTM slice is now transcribed, while database CTM materialization, as-built P1, and the remaining 14 stations remain open.",
        "status": "OPERATIONAL_SUBSEGMENT_CROSS_CHECKED_FULL_LINE_PENDING",
        "blocksCTM": True,
    })
    GIS_REGISTRY_PATH.write_text(json.dumps(gis_registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    line_registry = json.loads(LINE_REGISTRY_PATH.read_text(encoding="utf-8"))
    line_registry["lastUpdated"] = DATE
    line_registry["primarySource"] = "Current corridor status compiled from official MMRDA/MMMOCL publications; spatial evidence is source-specific and confidence-gated."
    totals = line_registry["networkTotals"]
    totals.update({
        "totalLines": len(line_registry["lines"]),
        "operationalLines": sum(line.get("operationalStatus") == "OPERATIONAL" for line in line_registry["lines"]),
        "partiallyOperationalLines": sum(line.get("operationalStatus") == "PARTIAL" for line in line_registry["lines"]),
        "underConstructionLines": sum(line.get("operationalStatus") == "UNDER_CONSTRUCTION" for line in line_registry["lines"]),
        "plannedLines": sum(line.get("operationalStatus") == "PLANNED" for line in line_registry["lines"]),
        "totalOperationalStations": sum((line.get("openedStationCount") if line.get("operationalStatus") == "PARTIAL" else line.get("stationCount", 0)) or 0 for line in line_registry["lines"]),
        "totalOperationalKm": round(sum(
            line.get("lengthKm", 0) if line.get("operationalStatus") == "OPERATIONAL"
            else line.get("openedLengthKm", 0) if line.get("operationalStatus") == "PARTIAL"
            else 0
            for line in line_registry["lines"]
        ), 2),
        "asOf": DATE,
    })
    line2b = next(line for line in line_registry["lines"] if line.get("lineId") == "MUMBAI_LINE2B")
    line2b["phaseInfo"] = "MMRDA reports five stations on the Mandale–Diamond Garden phase operational from 2026-04-07 and Chembur from 2026-08-13 (six of the 20 current route names). Current operational segment P0 is transcribed in normalized/ctm-line2b-phase1.json; the full corridor remains under construction."
    line2b["operationalSegmentCtmPath"] = "normalized/ctm-line2b-phase1.json"
    line2b["operationalSegmentStatus"] = "SOURCE_CROSS_CHECKED_CTMDATA_NOT_DATABASE_MATERIALIZED"
    line2b["operationalSegmentStationIds"] = [station["canonicalId"] for station in station_rows]
    line2b["openedLengthKm"] = 5.79
    line2b["openedLengthSourceRefs"] = ["SRC-MMRDA-L2B-OVERVIEW: Phase I 5.5 km + Phase IA 0.29 km"]
    line9 = next(line for line in line_registry["lines"] if line.get("lineId") == "MUMBAI_LINE9")
    line9["openedLengthKm"] = 4.7
    line9["openedLengthSourceRefs"] = ["SRC-MMRDA-L9-OVERVIEW: Phase I Dahisar East–Kashigaon 4.7 km"]
    LINE_REGISTRY_PATH.write_text(json.dumps(line_registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
    yellow = next(family for family in audit["families"] if family["familyId"] == "MUMBAI_YELLOW")
    yellow["dprEvidence"]["MUMBAI_LINE2B"].update({
        "operationalCtm": "../normalized/ctm-line2b-phase1.json",
        "operationalCrosswalk": "dpr-operational-station-crosswalk-line2b-phase1.json",
        "operationalStations": 6,
        "status": "PARTIAL_OPERATIONAL_SEGMENT_CROSSWALKED; FULL_ROUTE_AND_AS_BUILT_P1_OPEN",
    })
    yellow["currentP0"] = "Line 2A remains validated. Line 2B now has six operating stations mapped to separate station IDs, supplied KML placemarks, DPR rows, and a clipped ArcGIS route segment; runtime database materialization and the remaining 14 current route stations are still incomplete."
    yellow["p1Open"] = [
        "Line 2B live database materialization and remaining 14-station current route crosswalk",
        "Line 2B as-built levels/platform counts, platform numbering/directions, and installed platform-gate status",
        "D.N. Nagar current transfer pathway and AFC boundary confirmation",
    ]
    yellow["conflicts"] = [
        "Line 2B DPR has 22 design stations; current operator route inventory lists 20 names and the overview table contains a conflicting 19-station label.",
        "MMRDA calls the operating BSNL Metro stop Deonar in the phase-opening text but BSNL Metro in the current route list; DPR/KML/ArcGIS also use BSNL Metro.",
        "The ArcGIS Mankhurd station point is 770 m from the supplied KML placemark although the placemark is 167 m from the ArcGIS route. Chembur's ArcGIS point is 210 m from its KML placemark.",
        "MMRDA states the Chembur extension is 0.29 km; station-to-station distance from the KML/ArcGIS alignment requires an authoritative as-built reconciliation.",
    ]
    AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Built Line 2B operational segment: {len(station_rows)} stations, {len(clipped)} vertices, {round(segment_length)} m")
    for row in crosswalk_rows:
        print(f"  {row['operationalName']}: KML→route {row['distanceToOfficialRouteMeters']} m; KML→ArcGIS station point {row['distanceToArcgisStationPointMeters']} m; {row['crosswalkStatus']}")


if __name__ == "__main__":
    main()
