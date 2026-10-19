import csv
import os
import re

def build_pathways():
    with open("stops.txt", "r", encoding="utf-8") as f:
        stops = list(csv.DictReader(f))

    # Index by parent_station
    nodes_by_stn = {}
    for s in stops:
        p = s.get("parent_station", "").strip()
        if not p:
            continue
        lt = s.get("location_type", "").strip()
        if p not in nodes_by_stn:
            nodes_by_stn[p] = {
                "entrances": [],
                "platforms": [],
                "unpaid": None,
                "paid": None,
                "station_name": p
            }
        if lt == "2":
            nodes_by_stn[p]["entrances"].append(s)
        elif lt == "0":
            nodes_by_stn[p]["platforms"].append(s)
        elif lt == "3":
            sid = s["stop_id"]
            if "UNPAID" in sid:
                nodes_by_stn[p]["unpaid"] = s
            elif "PAID" in sid or "MEZZ" in sid:
                nodes_by_stn[p]["paid"] = s

    # Also extract parent station human names
    for s in stops:
        if s.get("location_type") == "1" and s["stop_id"] in nodes_by_stn:
            nodes_by_stn[s["stop_id"]]["station_name"] = s["stop_name"]

    pathway_rows = []

    # =========================================================================
    # 1. GENERATE INTRA-STATION PATHWAYS FOR ALL STATIONS
    # =========================================================================
    for stn_id, data in sorted(nodes_by_stn.items()):
        unpaid = data["unpaid"]
        paid = data["paid"]
        if not unpaid or not paid:
            print(f"Warning: Station {stn_id} missing concourse node! Skipping.")
            continue

        unpaid_id = unpaid["stop_id"]
        paid_id = paid["stop_id"]
        is_underground_l3 = stn_id.startswith("STN_L3_")
        stn_name = data["station_name"]

        # ---------------------------------------------------------------------
        # A. Gates -> Unpaid Concourse
        # ---------------------------------------------------------------------
        for ent in data["entrances"]:
            ent_id = ent["stop_id"]
            ent_name = ent["stop_name"]
            # Clean up gate label (e.g. "Gate A1", "Gate 1", "Gate B2")
            gate_label = ent_id.split(f"{stn_id}_")[-1]
            if "_" in gate_label:
                gate_label = gate_label.replace("_", " ")

            # Mode selection:
            # Underground Line 3 has deep escalators (Mode 4, length ~22m, time ~40s)
            # Elevated lines have standard staircases/walkways (Mode 2, length ~15m, time ~30s)
            if is_underground_l3:
                # Primary: Escalator (Mode 4)
                pathway_rows.append({
                    "pathway_id": f"PW_{ent_id}_ESC",
                    "from_stop_id": ent_id,
                    "to_stop_id": unpaid_id,
                    "pathway_mode": "4",
                    "is_bidirectional": "1",
                    "length": "22",
                    "traversal_time": "40",
                    "signposted_as": f"{ent_name} Escalator to Concourse",
                    "reversed_signposted_as": f"Exit to {ent_name}"
                })
                # Accessible: Lift / Elevator (Mode 5)
                pathway_rows.append({
                    "pathway_id": f"PW_{ent_id}_LIFT",
                    "from_stop_id": ent_id,
                    "to_stop_id": unpaid_id,
                    "pathway_mode": "5",
                    "is_bidirectional": "1",
                    "length": "18",
                    "traversal_time": "30",
                    "signposted_as": f"Street Lift to Concourse ({ent_name})",
                    "reversed_signposted_as": f"Lift to Street Exit ({ent_name})"
                })
            else:
                # Elevated: Stairs (Mode 2)
                pathway_rows.append({
                    "pathway_id": f"PW_{ent_id}_STAIRS",
                    "from_stop_id": ent_id,
                    "to_stop_id": unpaid_id,
                    "pathway_mode": "2",
                    "is_bidirectional": "1",
                    "length": "16",
                    "traversal_time": "30",
                    "signposted_as": f"{ent_name} to Concourse",
                    "reversed_signposted_as": f"Exit to {ent_name}"
                })
                # Elevated: Lift / Elevator (Mode 5) for wheelchair / accessibility
                pathway_rows.append({
                    "pathway_id": f"PW_{ent_id}_LIFT",
                    "from_stop_id": ent_id,
                    "to_stop_id": unpaid_id,
                    "pathway_mode": "5",
                    "is_bidirectional": "1",
                    "length": "12",
                    "traversal_time": "25",
                    "signposted_as": f"Street Lift to Concourse ({ent_name})",
                    "reversed_signposted_as": f"Lift to Street ({ent_name})"
                })

        # ---------------------------------------------------------------------
        # B. Fare Gates (AFC Turnstiles) - Unpaid <-> Paid
        # ---------------------------------------------------------------------
        # Entry (Unpaid -> Paid, Mode 6)
        pathway_rows.append({
            "pathway_id": f"PW_{stn_id}_AFC_IN",
            "from_stop_id": unpaid_id,
            "to_stop_id": paid_id,
            "pathway_mode": "6",
            "is_bidirectional": "0",
            "length": "5",
            "traversal_time": "15",
            "signposted_as": f"{stn_name} Metro Entry Turnstiles (Tap Smart Card / QR)",
            "reversed_signposted_as": ""
        })
        # Exit (Paid -> Unpaid, Mode 6)
        pathway_rows.append({
            "pathway_id": f"PW_{stn_id}_AFC_OUT",
            "from_stop_id": paid_id,
            "to_stop_id": unpaid_id,
            "pathway_mode": "6",
            "is_bidirectional": "0",
            "length": "5",
            "traversal_time": "15",
            "signposted_as": f"{stn_name} Metro Exit Turnstiles (Tap to Exit)",
            "reversed_signposted_as": ""
        })

        # ---------------------------------------------------------------------
        # C. Paid Concourse <-> Platforms (Escalator / Stairs + Dedicated Lift)
        # ---------------------------------------------------------------------
        for pf in data["platforms"]:
            pf_id = pf["stop_id"]
            pf_name = pf["stop_name"]
            pf_num = "1" if pf_id.endswith("_1") else "2"

            if is_underground_l3:
                # Escalator down to platform (Mode 4)
                pathway_rows.append({
                    "pathway_id": f"PW_{pf_id}_ESC",
                    "from_stop_id": paid_id,
                    "to_stop_id": pf_id,
                    "pathway_mode": "4",
                    "is_bidirectional": "1",
                    "length": "28",
                    "traversal_time": "50",
                    "signposted_as": f"Escalator to {pf_name}",
                    "reversed_signposted_as": "Escalator to Concourse / Exit"
                })
                # Platform Lift (Mode 5)
                pathway_rows.append({
                    "pathway_id": f"PW_{pf_id}_LIFT",
                    "from_stop_id": paid_id,
                    "to_stop_id": pf_id,
                    "pathway_mode": "5",
                    "is_bidirectional": "1",
                    "length": "20",
                    "traversal_time": "35",
                    "signposted_as": f"Platform Lift to {pf_name}",
                    "reversed_signposted_as": "Platform Lift to Concourse / Way Out"
                })
            else:
                # Elevated: Stairs up to platform (Mode 2)
                pathway_rows.append({
                    "pathway_id": f"PW_{pf_id}_STAIRS",
                    "from_stop_id": paid_id,
                    "to_stop_id": pf_id,
                    "pathway_mode": "2",
                    "is_bidirectional": "1",
                    "length": "16",
                    "traversal_time": "30",
                    "signposted_as": f"Stairs to {pf_name}",
                    "reversed_signposted_as": "Stairs to Concourse / Exit"
                })
                # Elevated: Platform Lift (Mode 5)
                pathway_rows.append({
                    "pathway_id": f"PW_{pf_id}_LIFT",
                    "from_stop_id": paid_id,
                    "to_stop_id": pf_id,
                    "pathway_mode": "5",
                    "is_bidirectional": "1",
                    "length": "12",
                    "traversal_time": "25",
                    "signposted_as": f"Platform Lift to {pf_name}",
                    "reversed_signposted_as": "Platform Lift to Concourse / Exit"
                })

    # =========================================================================
    # 2. OFFICIAL MULTI-MODAL INTERCHANGES
    # =========================================================================
    interchanges = [
        # Marol Naka: L3 Underground <-> L1 Elevated (Via Covered Transfer Walkway)
        {
            "pathway_id": "PW_MAROL_TRANSFER_WALKWAY",
            "from_stop_id": "NODE_STN_L3_004_UNPAID",
            "to_stop_id": "NODE_STN_L1_008_UNPAID",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "155",
            "traversal_time": "115",
            "signposted_as": "Covered Walkway to Line 1 (Blue Line / Versova-Ghatkopar) - 155m",
            "reversed_signposted_as": "Covered Walkway to Line 3 (Aqua Line / Aarey-Cuffe Parade) - 155m"
        },
        # CSMT: L3 Underground Concourse <-> Central Railway Mainline (Via BMC Subway)
        {
            "pathway_id": "PW_CSMT_BMC_SUBWAY",
            "from_stop_id": "NODE_STN_L3_023_UNPAID",
            "to_stop_id": "PF_CR_CSMT",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "180",
            "traversal_time": "120",
            "signposted_as": "BMC Subway to CSMT Rail Terminus (Platforms 1-18) - 180m",
            "reversed_signposted_as": "BMC Subway to Metro Line 3 Aqua Line - 180m"
        },
        # Western Express Highway (WEH) Line 1 <-> Gundavali Line 7 (Foot Overbridge)
        {
            "pathway_id": "PW_WEH_L7_FOB",
            "from_stop_id": "NODE_STN_L1_005_UNPAID",
            "to_stop_id": "NODE_STN_L7_014_UNPAID",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "210",
            "traversal_time": "150",
            "signposted_as": "Dedicated Skywalk to Line 7 (Gundavali / Red Line) - 210m",
            "reversed_signposted_as": "Dedicated Skywalk to Line 1 (Western Express Highway / Blue Line) - 210m"
        },
        # D.N. Nagar Line 1 <-> Andheri (West) Line 2A (Foot Overbridge)
        {
            "pathway_id": "PW_DNN_L2A_FOB",
            "from_stop_id": "NODE_STN_L1_002_UNPAID",
            "to_stop_id": "NODE_STN_L2A_017_MEZZ",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "240",
            "traversal_time": "180",
            "signposted_as": "Interchange Skywalk to Line 2A (Andheri West / Yellow Line) - 240m",
            "reversed_signposted_as": "Interchange Skywalk to Line 1 (D.N. Nagar / Blue Line) - 240m"
        },
        # Andheri: Line 1 <-> Western Railway (Direct Skywalk)
        {
            "pathway_id": "PW_ANDHERI_WR_SKYWALK",
            "from_stop_id": "NODE_STN_L1_004_UNPAID",
            "to_stop_id": "PF_WR_ANDHERI",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "120",
            "traversal_time": "90",
            "signposted_as": "Direct Skywalk to Andheri Western Railway Station (Platforms 1-9)",
            "reversed_signposted_as": "Direct Skywalk to Metro Line 1 (Versova-Ghatkopar)"
        },
        # Ghatkopar: Line 1 <-> Central Railway (Direct Skywalk)
        {
            "pathway_id": "PW_GHATKOPAR_CR_SKYWALK",
            "from_stop_id": "NODE_STN_L1_012_UNPAID",
            "to_stop_id": "PF_CR_GHATKOPAR",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "90",
            "traversal_time": "70",
            "signposted_as": "Direct Skywalk to Ghatkopar Central Railway Station (Platforms 1-4)",
            "reversed_signposted_as": "Direct Skywalk to Metro Line 1 (Versova-Ghatkopar)"
        },
        # Dadar Metro (Line 3) <-> Central & Western Railway (Pedestrian Pathway)
        {
            "pathway_id": "PW_DADAR_CR_WALK",
            "from_stop_id": "NODE_STN_L3_013_UNPAID",
            "to_stop_id": "PF_CR_DADAR",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "280",
            "traversal_time": "210",
            "signposted_as": "Walkway to Dadar Railway Station (Central & Western Lines) - 280m",
            "reversed_signposted_as": "Walkway to Metro Line 3 Aqua Line - 280m"
        },
        # Mumbai Central Metro (Line 3) <-> Western Railway Mainline / Local
        {
            "pathway_id": "PW_MUM_CENTRAL_FORECOURT",
            "from_stop_id": "NODE_STN_L3_019_UNPAID",
            "to_stop_id": "PF_WR_MUMBAI_CENTRAL",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "140",
            "traversal_time": "100",
            "signposted_as": "Station Forecourt Link to Mumbai Central Railway Station - 140m",
            "reversed_signposted_as": "Station Forecourt Link to Metro Line 3 Aqua Line - 140m"
        },
        # Churchgate Metro (Line 3) <-> Churchgate Western Railway Terminal
        {
            "pathway_id": "PW_CHURCHGATE_WALK",
            "from_stop_id": "NODE_STN_L3_025_UNPAID",
            "to_stop_id": "PF_WR_CHURCHGATE",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "160",
            "traversal_time": "120",
            "signposted_as": "Walkway to Churchgate Railway Station - 160m",
            "reversed_signposted_as": "Walkway to Metro Line 3 Aqua Line - 160m"
        },
        # Chembur Line 2B <-> Monorail (Interchange Skywalk)
        {
            "pathway_id": "PW_CHEMBUR_MONO_SKYWALK",
            "from_stop_id": "NODE_STN_L2B_015_UNPAID",
            "to_stop_id": "NODE_STN_MONO_001_UNPAID",
            "pathway_mode": "1",
            "is_bidirectional": "1",
            "length": "190",
            "traversal_time": "140",
            "signposted_as": "Skywalk to Chembur Monorail Station - 190m",
            "reversed_signposted_as": "Skywalk to Metro Line 2B (Yellow Line) - 190m"
        }
    ]

    pathway_rows.extend(interchanges)

    # -------------------------------------------------------------------------
    # Write updated pathways.txt
    # -------------------------------------------------------------------------
    fieldnames = [
        "pathway_id", "from_stop_id", "to_stop_id", "pathway_mode",
        "is_bidirectional", "length", "traversal_time",
        "signposted_as", "reversed_signposted_as"
    ]

    with open("pathways.txt", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(pathway_rows)

    print(f"\nSuccessfully generated {len(pathway_rows)} high-fidelity pathway links in pathways.txt!")

if __name__ == "__main__":
    build_pathways()
