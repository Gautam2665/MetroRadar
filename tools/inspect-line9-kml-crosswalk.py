import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path


root = Path(__file__).resolve().parents[1]
gis = json.loads((root / "datasets/mumbai/sources/gis/arcgis-mumbai.json").read_text(encoding="utf-8"))
namespace = {"k": "http://www.opengis.net/kml/2.2"}
kml = ET.parse(root / "datasets/mumbai/kml/line-9_2.kml").getroot()
stations = gis["stations"]["features"]
route = next(
    feature["geometry"]["coordinates"]
    for feature in gis["lines"]["features"]
    if feature["properties"].get("objectid") == 62
)


def distance(a, b):
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = math.radians(b[0] - a[0])
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


placemarks = []
for placemark in kml.findall(".//k:Placemark", namespace):
    point = placemark.find(".//k:Point/k:coordinates", namespace)
    if point is None or not point.text:
        continue
    name = placemark.findtext("k:name", namespaces=namespace)
    coordinates = [float(value) for value in point.text.split(",")[:2]]
    placemarks.append((name, coordinates))

for name, coordinates in placemarks:
    closest = sorted(
        (
            distance(coordinates, feature["geometry"]["coordinates"]),
            feature["id"],
            feature["properties"].get("name"),
        )
        for feature in stations
    )[:3]
    print(f"{name}: {coordinates}; nearest official ArcGIS station features:")
    for meters, feature_id, feature_name in closest:
        print(f"  {feature_id} {feature_name}: {meters:.1f} m")
    route_point = min(
        (distance(coordinates, point), point)
        for point in route
    )
    print(f"  nearest official route vertex: {route_point[0]:.1f} m")
