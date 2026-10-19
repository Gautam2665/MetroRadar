import urllib.request
import json
import os

def extract_osm_transit():
    overpass_url = 'https://overpass-api.de/api/interpreter'
    # Bounding box covering Mumbai MMR (from South Mumbai Colaba to Mira-Bhayandar / Thane)
    query = """
    [out:json][timeout:50];
    (
      node["railway"="subway_entrance"](18.88,72.75,19.35,73.05);
      way["railway"="subway_entrance"](18.88,72.75,19.35,73.05);
      node["highway"="elevator"](18.88,72.75,19.35,73.05);
      node["public_transport"="station"](18.88,72.75,19.35,73.05);
      node["railway"="station"](18.88,72.75,19.35,73.05);
    );
    out body;
    >;
    out skel qt;
    """

    print("Sending Overpass query to OpenStreetMap servers...")
    req = urllib.request.Request(
        overpass_url,
        data=query.encode('utf-8'),
        headers={'User-Agent': 'MetroRadar-ITS-Pipeline/1.0 (contact@metroradar.in)'}
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode('utf-8'))
            elements = data.get('elements', [])
            print(f"Successfully queried Overpass API! Found {len(elements)} OSM spatial elements.")

            entrances = [e for e in elements if e.get('tags', {}).get('railway') == 'subway_entrance']
            elevators = [e for e in elements if e.get('tags', {}).get('highway') == 'elevator']
            subway_stations = [e for e in elements if e.get('tags', {}).get('station') == 'subway' or e.get('tags', {}).get('subway') == 'yes']

            print(f"  - Subway Entrances / Gates: {len(entrances)}")
            print(f"  - Elevators / Lifts: {len(elevators)}")
            print(f"  - Stations: {len(subway_stations)}")

            os.makedirs('datasets/mumbai/sources', exist_ok=True)
            output_file = 'datasets/mumbai/sources/osm_mumbai_transit_extract.json'
            with open(output_file, 'w', encoding='utf-8') as out_f:
                json.dump(data, out_f, indent=2)
            print(f"Raw data saved to {output_file}")

            print("\nSample 8 Subway Entrances in OSM:")
            for ent in entrances[:8]:
                tags = ent.get('tags', {})
                name = tags.get('name') or tags.get('description') or tags.get('ref') or 'Unnamed Entrance'
                lat = ent.get('lat', 'N/A')
                lon = ent.get('lon', 'N/A')
                wheelchair = tags.get('wheelchair', 'unknown')
                level = tags.get('level', '0')
                print(f"  ID {ent['id']} ({lat}, {lon}) | {name} | Level: {level} | Wheelchair: {wheelchair}")

    except Exception as err:
        print(f"Error querying Overpass API: {err}")

if __name__ == '__main__':
    extract_osm_transit()
