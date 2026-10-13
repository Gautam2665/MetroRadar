import csv
import io
import os
import zipfile

source_raw_zip = "mumbai-operational-gtfs.zip"
current_zip = "mumbai_discrete_ready.zip"
output_zip = "mumbai_final_fixed.zip"

if not os.path.exists(current_zip):
    raise FileNotFoundError(f"Could not find {current_zip}")

with zipfile.ZipFile(current_zip, 'r') as zin, zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zout:
    file_list = zin.namelist()

    # 1. Patch pathways.txt
    if "pathways.txt" in file_list:
        p_text = zin.read("pathways.txt").decode('utf-8-sig')
        p_reader = csv.DictReader(io.StringIO(p_text))
        p_fields = list(p_reader.fieldnames)
        p_rows = list(p_reader)

        # Check if edge already exists
        exists = any(
            r.get('from_stop_id') == 'NODE_STN_L2A_017_MEZZ' and r.get('to_stop_id') == 'PF_STN_L1_002_2'
            for r in p_rows
        )
        if not exists:
            new_pathway = {
                "pathway_id": "PW_L2A_L1_ANDHERI_DNNAGAR_FOB",
                "from_stop_id": "NODE_STN_L2A_017_MEZZ",
                "to_stop_id": "PF_STN_L1_002_2",
                "pathway_mode": "1",
                "is_bidirectional": "1",
                "length": "110",
                "traversal_time": "90"
            }
            # Fill default values for any other fields in pathways.txt
            for col in p_fields:
                new_pathway.setdefault(col, "")
            p_rows.append(new_pathway)
            print("[+] Added pathway edge connecting NODE_STN_L2A_017_MEZZ -> PF_STN_L1_002_2")

        buf_p = io.StringIO()
        w_p = csv.DictWriter(buf_p, fieldnames=p_fields)
        w_p.writeheader()
        w_p.writerows(p_rows)
        zout.writestr("pathways.txt", buf_p.getvalue())

    # 2. Patch transfers.txt (fix empty transfer_type: ,,0 -> 2,0)
    if "transfers.txt" in file_list:
        t_text = zin.read("transfers.txt").decode('utf-8-sig')
        t_reader = csv.DictReader(io.StringIO(t_text))
        t_fields = list(t_reader.fieldnames)
        t_rows = list(t_reader)

        for row in t_rows:
            if not row.get("transfer_type") or row.get("transfer_type").strip() == "":
                row["transfer_type"] = "2"
                print(f"[+] Fixed empty transfer_type for {row.get('from_stop_id')} -> {row.get('to_stop_id')}")

        buf_t = io.StringIO()
        w_t = csv.DictWriter(buf_t, fieldnames=t_fields)
        w_t.writeheader()
        w_t.writerows(t_rows)
        zout.writestr("transfers.txt", buf_t.getvalue())

    # 3. Copy other files from current zip
    for item in zin.infolist():
        if item.filename not in ["pathways.txt", "transfers.txt"]:
            zout.writestr(item.filename, zin.read(item.filename))

    # 4. Restore any missing files from raw zip (e.g. translations.txt)
    if os.path.exists(source_raw_zip):
        with zipfile.ZipFile(source_raw_zip, 'r') as zraw:
            current_files = set(zout.namelist())
            for raw_item in zraw.infolist():
                if raw_item.filename not in current_files and not raw_item.filename.endswith('/'):
                    zout.writestr(raw_item.filename, zraw.read(raw_item.filename))
                    print(f"[+] Restored missing file from raw zip: {raw_item.filename}")

print(f"\nDone! Output written to: {output_zip}")