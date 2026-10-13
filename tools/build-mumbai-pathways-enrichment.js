const fs = require('fs');
const path = require('path');

const gtfsDir = path.resolve(process.cwd(), 'datasets/mumbai/gtfs');
const stopsPath = path.join(gtfsDir, 'stops.txt');
const pathwaysPath = path.join(gtfsDir, 'pathways.txt');

// Read stops to find all parent stations and their nodes/platforms
const stopsContent = fs.readFileSync(stopsPath, 'utf8');
const lines = stopsContent.split('\n').filter(l => l.trim().length > 0);
const header = lines[0].split(',');
const idIdx = header.indexOf('stop_id');
const nameIdx = header.indexOf('stop_name');
const typeIdx = header.indexOf('location_type');
const parentIdx = header.indexOf('parent_station');

const parentStations = [];

for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split(',');
  const id = row[idIdx]?.replace(/"/g, '').trim();
  const type = row[typeIdx]?.trim();

  if (type === '1' && id && id.startsWith('STN_')) {
    parentStations.push(id);
  }
}

const csvRows = ['pathway_id,from_stop_id,to_stop_id,pathway_mode,is_bidirectional,length,traversal_time,signposted_as,reversed_signposted_as'];

// 1. Generate Station Structural Pathways (Stairs, Escalators, Lifts, AFC Gates)
for (const stnId of parentStations) {
  const gate1 = `ENT_${stnId}_1`;
  const gate2 = `ENT_${stnId}_2`;
  const unpaid = `NODE_${stnId}_UNPAID`;
  const paid = `NODE_${stnId}_PAID`;
  const pf1 = `PF_${stnId}_1`;
  const pf2 = `PF_${stnId}_2`;

  // Entrance 1 Walkway & Escalator
  csvRows.push(`PW_${stnId}_ENT1_STAIR,${gate1},${unpaid},2,1,15,30,"Gate 1 Stairs to Concourse","Exit to Gate 1 (Stairs)"`);
  csvRows.push(`PW_${stnId}_ENT1_ESC,${gate1},${unpaid},4,1,15,20,"Gate 1 Escalator to Concourse","Exit to Gate 1 (Escalator)"`);
  csvRows.push(`PW_${stnId}_ENT1_LIFT,${gate1},${unpaid},5,1,15,15,"Gate 1 Accessible Lift","Exit to Gate 1 (Lift)"`);

  // Entrance 2 Walkway & Escalator
  csvRows.push(`PW_${stnId}_ENT2_STAIR,${gate2},${unpaid},2,1,15,30,"Gate 2 Stairs to Concourse","Exit to Gate 2 (Stairs)"`);
  csvRows.push(`PW_${stnId}_ENT2_ESC,${gate2},${unpaid},4,1,15,20,"Gate 2 Escalator to Concourse","Exit to Gate 2 (Escalator)"`);

  // Fare Control Gates (AFC)
  csvRows.push(`PW_${stnId}_AFC_IN,${unpaid},${paid},6,0,,15,"Metro Entry Turnstiles",`);
  csvRows.push(`PW_${stnId}_AFC_OUT,${paid},${unpaid},6,0,,15,"Metro Exit Turnstiles",`);

  // Concourse to Platform 1 (Stairs, Escalator, Lift)
  csvRows.push(`PW_${stnId}_PF1_STAIR,${paid},${pf1},2,1,15,30,"Stairs to Platform 1","Concourse / Exit"`);
  csvRows.push(`PW_${stnId}_PF1_ESC,${paid},${pf1},4,1,15,20,"Escalator to Platform 1","Concourse / Exit"`);
  csvRows.push(`PW_${stnId}_PF1_LIFT,${paid},${pf1},5,1,15,15,"Accessible Lift to Platform 1","Concourse / Exit"`);

  // Concourse to Platform 2 (Stairs, Escalator, Lift)
  csvRows.push(`PW_${stnId}_PF2_STAIR,${paid},${pf2},2,1,15,30,"Stairs to Platform 2","Concourse / Exit"`);
  csvRows.push(`PW_${stnId}_PF2_ESC,${paid},${pf2},4,1,15,20,"Escalator to Platform 2","Concourse / Exit"`);
  csvRows.push(`PW_${stnId}_PF2_LIFT,${paid},${pf2},5,1,15,15,"Accessible Lift to Platform 2","Concourse / Exit"`);
}

// 2. High-Capacity Multi-Modal & Inter-Line Interchanges
const interchanges = [
  `PW_WEH_L7_FOB,NODE_STN_L1_005_UNPAID,NODE_STN_L7_014_UNPAID,1,1,58,60,"To Line 7 (Gundavali / Red Line)","To Line 1 (WEH / Blue Line)"`,
  `PW_DNN_L2A_FOB,NODE_STN_L1_002_UNPAID,NODE_STN_L2A_017_MEZZ,1,1,120,120,"To Line 2A (Andheri West / Yellow Line)","To Line 1 (D.N. Nagar / Blue Line)"`,
  `PW_MAROL_STREET,NODE_STN_L1_008_UNPAID,NODE_STN_L3_004_UNPAID,1,1,155,120,"Street Walkway to Line 3 (Aqua Line)","Street Walkway to Line 1 (Blue Line)"`,
  `PW_DAHISAR_SEAMLESS,NODE_STN_L2A_001_UNPAID,NODE_STN_L7_001_UNPAID,1,1,10,10,"Seamless Concourse Transfer Line 2A <-> Line 7","Seamless Concourse Transfer Line 7 <-> Line 2A"`,
  `PW_CHEMBUR_MONO_FOB,NODE_STN_L2B_015_UNPAID,NODE_STN_MONO_001_UNPAID,1,1,180,180,"To Mumbai Monorail","To Metro Line 2B"`,
  `PW_MUM_CENTRAL_FORECOURT,NODE_STN_L3_019_UNPAID,PF_WR_MUMBAI_CENTRAL,1,1,100,60,"To Western Railway Mainline","To Metro Line 3"`,
  `PW_CSMT_SUBWAY,NODE_STN_L3_023_UNPAID,PF_CR_CSMT,1,1,180,120,"To CSMT Terminus (BMC Subway)","To Metro Line 3 Aqua Line"`,
  `PW_CHURCHGATE_WALK,NODE_STN_L3_025_UNPAID,PF_WR_CHURCHGATE,1,1,150,120,"To Churchgate Railway Station","To Metro Line 3 Aqua Line"`,
  `PW_ANDHERI_WR_FOB,NODE_STN_L1_004_UNPAID,PF_WR_ANDHERI,1,1,80,60,"To Andheri Railway Station","To Metro Line 1"`,
  `PW_GHATKOPAR_CR_FOB,NODE_STN_L1_012_UNPAID,PF_CR_GHATKOPAR,1,1,60,45,"To Ghatkopar Railway Station","To Metro Line 1"`,
  `PW_DADAR_CR_WALK,NODE_STN_L3_013_UNPAID,PF_CR_DADAR,1,1,200,150,"To Dadar Railway Station","To Metro Line 3"`
];

for (const ic of interchanges) {
  csvRows.push(ic);
}

fs.writeFileSync(pathwaysPath, csvRows.join('\n') + '\n', 'utf8');
console.log(`Successfully enriched pathways.txt with ${csvRows.length - 1} detailed structural & accessible pathways!`);
