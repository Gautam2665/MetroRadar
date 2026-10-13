import zipfile, csv, io
with zipfile.ZipFile('mumbai_discrete_ready.zip', 'r') as z:
    reader = csv.DictReader(io.StringIO(z.read('stops.txt').decode('utf-8-sig')))
    for r in reader:
        name = r.get('stop_name', '')
        if 'dahisar' in name.lower():
            sid = r.get('stop_id', '')
            ltype = r.get('location_type', '')
            parent = r.get('parent_station', '')
            print(sid, '::', name, ':: loc_type=' + ltype, ':: parent=' + parent)
