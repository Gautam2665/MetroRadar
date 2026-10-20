const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const targetDirs = [
  path.resolve(process.cwd(), 'datasets/mumbai'),
  path.resolve(process.cwd(), 'datasets/mumbai/gtfs'),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── 1. fare_media.txt (GTFS-Fares v2) ──────────────────────────────────────────
// 1 = Paper ticket / token / barcode
// 2 = Physical transit card (NCMC / Mumbai 1 Smart Card)
// 4 = Mobile ticketing app
const fareMediaContent = `fare_media_id,fare_media_name,fare_media_type
MEDIA_PAPER,"Single Journey Paper Ticket / Token",1
MEDIA_NCMC,"National Common Mobility Card (Mumbai 1 Card)",2
MEDIA_APP_QR,"Digital Mobile App QR Ticket",4
`;

// ── 2. fare_products.txt (GTFS-Fares v2) ───────────────────────────────────────
// Authoritative product catalog with Paper QR and NCMC (10% discount)
const fareProductsContent = `fare_product_id,fare_product_name,fare_media_id,amount,currency
PROD_MMOPL_PAPER_0_3,"MMOPL Paper Ticket (0-3 km)",MEDIA_PAPER,10.00,INR
PROD_MMOPL_PAPER_3_8,"MMOPL Paper Ticket (3-8 km)",MEDIA_PAPER,20.00,INR
PROD_MMOPL_PAPER_8_12,"MMOPL Paper Ticket (8-12 km)",MEDIA_PAPER,30.00,INR
PROD_MMOPL_PAPER_12_PLUS,"MMOPL Paper Ticket (>12 km)",MEDIA_PAPER,40.00,INR
PROD_MMOPL_NCMC_0_3,"MMOPL NCMC Smart Card (0-3 km)",MEDIA_NCMC,9.00,INR
PROD_MMOPL_NCMC_3_8,"MMOPL NCMC Smart Card (3-8 km)",MEDIA_NCMC,18.00,INR
PROD_MMOPL_NCMC_8_12,"MMOPL NCMC Smart Card (8-12 km)",MEDIA_NCMC,27.00,INR
PROD_MMOPL_NCMC_12_PLUS,"MMOPL NCMC Smart Card (>12 km)",MEDIA_NCMC,36.00,INR
PROD_MMMOCL_PAPER_0_3,"MMMOCL Paper Ticket (0-3 km)",MEDIA_PAPER,10.00,INR
PROD_MMMOCL_PAPER_3_12,"MMMOCL Paper Ticket (3-12 km)",MEDIA_PAPER,20.00,INR
PROD_MMMOCL_PAPER_12_18,"MMMOCL Paper Ticket (12-18 km)",MEDIA_PAPER,30.00,INR
PROD_MMMOCL_PAPER_18_24,"MMMOCL Paper Ticket (18-24 km)",MEDIA_PAPER,40.00,INR
PROD_MMMOCL_PAPER_24_30,"MMMOCL Paper Ticket (24-30 km)",MEDIA_PAPER,50.00,INR
PROD_MMMOCL_PAPER_30_36,"MMMOCL Paper Ticket (30-36 km)",MEDIA_PAPER,60.00,INR
PROD_MMMOCL_PAPER_36_42,"MMMOCL Paper Ticket (36-42 km)",MEDIA_PAPER,70.00,INR
PROD_MMMOCL_PAPER_42_PLUS,"MMMOCL Paper Ticket (>42 km)",MEDIA_PAPER,80.00,INR
PROD_MMMOCL_NCMC_0_3,"MMMOCL NCMC Smart Card (0-3 km)",MEDIA_NCMC,9.00,INR
PROD_MMMOCL_NCMC_3_12,"MMMOCL NCMC Smart Card (3-12 km)",MEDIA_NCMC,18.00,INR
PROD_MMMOCL_NCMC_12_18,"MMMOCL NCMC Smart Card (12-18 km)",MEDIA_NCMC,27.00,INR
PROD_MMMOCL_NCMC_18_24,"MMMOCL NCMC Smart Card (18-24 km)",MEDIA_NCMC,36.00,INR
PROD_MMMOCL_NCMC_24_30,"MMMOCL NCMC Smart Card (24-30 km)",MEDIA_NCMC,45.00,INR
PROD_MMMOCL_NCMC_30_36,"MMMOCL NCMC Smart Card (30-36 km)",MEDIA_NCMC,54.00,INR
PROD_MMMOCL_NCMC_36_42,"MMMOCL NCMC Smart Card (36-42 km)",MEDIA_NCMC,63.00,INR
PROD_MMMOCL_NCMC_42_PLUS,"MMMOCL NCMC Smart Card (>42 km)",MEDIA_NCMC,72.00,INR
PROD_MMRCL_PAPER_0_3,"MMRCL Paper Ticket (0-3 km)",MEDIA_PAPER,10.00,INR
PROD_MMRCL_PAPER_3_12,"MMRCL Paper Ticket (3-12 km)",MEDIA_PAPER,20.00,INR
PROD_MMRCL_PAPER_12_18,"MMRCL Paper Ticket (12-18 km)",MEDIA_PAPER,30.00,INR
PROD_MMRCL_PAPER_18_24,"MMRCL Paper Ticket (18-24 km)",MEDIA_PAPER,40.00,INR
PROD_MMRCL_PAPER_24_30,"MMRCL Paper Ticket (24-30 km)",MEDIA_PAPER,50.00,INR
PROD_MMRCL_PAPER_30_PLUS,"MMRCL Paper Ticket (>30 km)",MEDIA_PAPER,60.00,INR
PROD_MMRCL_NCMC_0_3,"MMRCL NCMC Smart Card (0-3 km)",MEDIA_NCMC,9.00,INR
PROD_MMRCL_NCMC_3_12,"MMRCL NCMC Smart Card (3-12 km)",MEDIA_NCMC,18.00,INR
PROD_MMRCL_NCMC_12_18,"MMRCL NCMC Smart Card (12-18 km)",MEDIA_NCMC,27.00,INR
PROD_MMRCL_NCMC_18_24,"MMRCL NCMC Smart Card (18-24 km)",MEDIA_NCMC,36.00,INR
PROD_MMRCL_NCMC_24_30,"MMRCL NCMC Smart Card (24-30 km)",MEDIA_NCMC,45.00,INR
PROD_MMRCL_NCMC_30_PLUS,"MMRCL NCMC Smart Card (>30 km)",MEDIA_NCMC,54.00,INR
PROD_MONO_PAPER_0_3,"Monorail Paper Ticket (0-3 km)",MEDIA_PAPER,10.00,INR
PROD_MONO_PAPER_3_8,"Monorail Paper Ticket (3-8 km)",MEDIA_PAPER,20.00,INR
PROD_MONO_PAPER_8_12,"Monorail Paper Ticket (8-12 km)",MEDIA_PAPER,30.00,INR
PROD_MONO_PAPER_12_PLUS,"Monorail Paper Ticket (>12 km)",MEDIA_PAPER,40.00,INR
`;

// ── 3. fare_leg_rules.txt (GTFS-Fares v2) ─────────────────────────────────────
// Links distance ranges (in meters) to operator fare products
const fareLegRulesContent = `leg_group_id,network_id,fare_product_id,rule_priority,min_distance,max_distance
LEG_MMOPL_P1,NET_MMOPL,PROD_MMOPL_PAPER_0_3,1,0,3000
LEG_MMOPL_P2,NET_MMOPL,PROD_MMOPL_PAPER_3_8,1,3000,8000
LEG_MMOPL_P3,NET_MMOPL,PROD_MMOPL_PAPER_8_12,1,8000,12000
LEG_MMOPL_P4,NET_MMOPL,PROD_MMOPL_PAPER_12_PLUS,1,12000,50000
LEG_MMOPL_N1,NET_MMOPL,PROD_MMOPL_NCMC_0_3,2,0,3000
LEG_MMOPL_N2,NET_MMOPL,PROD_MMOPL_NCMC_3_8,2,3000,8000
LEG_MMOPL_N3,NET_MMOPL,PROD_MMOPL_NCMC_8_12,2,8000,12000
LEG_MMOPL_N4,NET_MMOPL,PROD_MMOPL_NCMC_12_PLUS,2,12000,50000
LEG_MMMOCL_P1,NET_MMMOCL,PROD_MMMOCL_PAPER_0_3,1,0,3000
LEG_MMMOCL_P2,NET_MMMOCL,PROD_MMMOCL_PAPER_3_12,1,3000,12000
LEG_MMMOCL_P3,NET_MMMOCL,PROD_MMMOCL_PAPER_12_18,1,12000,18000
LEG_MMMOCL_P4,NET_MMMOCL,PROD_MMMOCL_PAPER_18_24,1,18000,24000
LEG_MMMOCL_P5,NET_MMMOCL,PROD_MMMOCL_PAPER_24_30,1,24000,30000
LEG_MMMOCL_P6,NET_MMMOCL,PROD_MMMOCL_PAPER_30_36,1,30000,36000
LEG_MMMOCL_P7,NET_MMMOCL,PROD_MMMOCL_PAPER_36_42,1,36000,42000
LEG_MMMOCL_P8,NET_MMMOCL,PROD_MMMOCL_PAPER_42_PLUS,1,42000,100000
LEG_MMMOCL_N1,NET_MMMOCL,PROD_MMMOCL_NCMC_0_3,2,0,3000
LEG_MMMOCL_N2,NET_MMMOCL,PROD_MMMOCL_NCMC_3_12,2,3000,12000
LEG_MMMOCL_N3,NET_MMMOCL,PROD_MMMOCL_NCMC_12_18,2,12000,18000
LEG_MMMOCL_N4,NET_MMMOCL,PROD_MMMOCL_NCMC_18_24,2,18000,24000
LEG_MMMOCL_N5,NET_MMMOCL,PROD_MMMOCL_NCMC_24_30,2,24000,30000
LEG_MMMOCL_N6,NET_MMMOCL,PROD_MMMOCL_NCMC_30_36,2,30000,36000
LEG_MMMOCL_N7,NET_MMMOCL,PROD_MMMOCL_NCMC_36_42,2,36000,42000
LEG_MMMOCL_N8,NET_MMMOCL,PROD_MMMOCL_NCMC_42_PLUS,2,42000,100000
LEG_MMRCL_P1,NET_MMRCL,PROD_MMRCL_PAPER_0_3,1,0,3000
LEG_MMRCL_P2,NET_MMRCL,PROD_MMRCL_PAPER_3_12,1,3000,12000
LEG_MMRCL_P3,NET_MMRCL,PROD_MMRCL_PAPER_12_18,1,12000,18000
LEG_MMRCL_P4,NET_MMRCL,PROD_MMRCL_PAPER_18_24,1,18000,24000
LEG_MMRCL_P5,NET_MMRCL,PROD_MMRCL_PAPER_24_30,1,24000,30000
LEG_MMRCL_P6,NET_MMRCL,PROD_MMRCL_PAPER_30_PLUS,1,30000,100000
LEG_MMRCL_N1,NET_MMRCL,PROD_MMRCL_NCMC_0_3,2,0,3000
LEG_MMRCL_N2,NET_MMRCL,PROD_MMRCL_NCMC_3_12,2,3000,12000
LEG_MMRCL_N3,NET_MMRCL,PROD_MMRCL_NCMC_12_18,2,12000,18000
LEG_MMRCL_N4,NET_MMRCL,PROD_MMRCL_NCMC_18_24,2,18000,24000
LEG_MMRCL_N5,NET_MMRCL,PROD_MMRCL_NCMC_24_30,2,24000,30000
LEG_MMRCL_N6,NET_MMRCL,PROD_MMRCL_NCMC_30_PLUS,2,30000,100000
LEG_MONO_P1,NET_MONO,PROD_MONO_PAPER_0_3,1,0,3000
LEG_MONO_P2,NET_MONO,PROD_MONO_PAPER_3_8,1,3000,8000
LEG_MONO_P3,NET_MONO,PROD_MONO_PAPER_8_12,1,8000,12000
LEG_MONO_P4,NET_MONO,PROD_MONO_PAPER_12_PLUS,1,12000,50000
`;

// ── 4. fare_transfer_rules.txt (GTFS-Fares v2) ────────────────────────────────
// Continuous paid transfer within MMMOCL lines (L2A <-> L7) vs cross-operator
const fareTransferRulesContent = `from_leg_group_id,to_leg_group_id,transfer_count,duration_limit,duration_limit_type,fare_transfer_type,transfer_charge
LEG_MMMOCL_P1,LEG_MMMOCL_P1,-1,7200,1,0,0.00
LEG_MMMOCL_N1,LEG_MMMOCL_N1,-1,7200,1,0,0.00
LEG_MMOPL_P1,LEG_MMMOCL_P1,0,0,1,2,0.00
LEG_MMOPL_P1,LEG_MMRCL_P1,0,0,1,2,0.00
`;

// ── 5. fare_attributes.txt (GTFS-Fares v1 - Backward Compatible) ──────────────
const fareAttributesContent = `fare_id,price,currency_type,payment_method,transfers,transfer_duration,agency_id
MMOPL_0_3,10.00,INR,0,0,,MMOPL
MMOPL_3_8,20.00,INR,0,0,,MMOPL
MMOPL_8_12,30.00,INR,0,0,,MMOPL
MMOPL_12_PLUS,40.00,INR,0,0,,MMOPL
MMMOCL_0_3,10.00,INR,0,0,,MMMOCL
MMMOCL_3_12,20.00,INR,0,0,,MMMOCL
MMMOCL_12_18,30.00,INR,0,0,,MMMOCL
MMMOCL_18_24,40.00,INR,0,0,,MMMOCL
MMMOCL_24_30,50.00,INR,0,0,,MMMOCL
MMMOCL_30_36,60.00,INR,0,0,,MMMOCL
MMMOCL_36_42,70.00,INR,0,0,,MMMOCL
MMMOCL_42_PLUS,80.00,INR,0,0,,MMMOCL
MMRCL_0_3,10.00,INR,0,0,,MMRCL
MMRCL_3_12,20.00,INR,0,0,,MMRCL
MMRCL_12_18,30.00,INR,0,0,,MMRCL
MMRCL_18_24,40.00,INR,0,0,,MMRCL
MMRCL_24_30,50.00,INR,0,0,,MMRCL
MMRCL_30_PLUS,60.00,INR,0,0,,MMRCL
MONO_0_3,10.00,INR,0,0,,MMRDA_MONO
MONO_3_8,20.00,INR,0,0,,MMRDA_MONO
MONO_8_12,30.00,INR,0,0,,MMRDA_MONO
MONO_12_PLUS,40.00,INR,0,0,,MMRDA_MONO
`;

// ── 6. fare_rules.txt (GTFS-Fares v1 - Backward Compatible) ───────────────────
const fareRulesContent = `fare_id,route_id
MMOPL_0_3,LINE1
MMOPL_3_8,LINE1
MMOPL_8_12,LINE1
MMOPL_12_PLUS,LINE1
MMMOCL_0_3,LINE2A
MMMOCL_0_3,LINE7
MMMOCL_0_3,LINE2B
MMMOCL_3_12,LINE2A
MMMOCL_3_12,LINE7
MMMOCL_3_12,LINE2B
MMMOCL_12_18,LINE2A
MMMOCL_12_18,LINE7
MMMOCL_12_18,LINE2B
MMMOCL_18_24,LINE2A
MMMOCL_18_24,LINE7
MMMOCL_18_24,LINE2B
MMMOCL_24_30,LINE2A
MMMOCL_24_30,LINE7
MMMOCL_24_30,LINE2B
MMMOCL_30_36,LINE2A
MMMOCL_30_36,LINE7
MMMOCL_30_36,LINE2B
MMMOCL_36_42,LINE2A
MMMOCL_36_42,LINE7
MMMOCL_36_42,LINE2B
MMMOCL_42_PLUS,LINE2A
MMMOCL_42_PLUS,LINE7
MMMOCL_42_PLUS,LINE2B
MMRCL_0_3,LINE3
MMRCL_3_12,LINE3
MMRCL_12_18,LINE3
MMRCL_18_24,LINE3
MMRCL_24_30,LINE3
MMRCL_30_PLUS,LINE3
MONO_0_3,MONORAIL
MONO_3_8,MONORAIL
MONO_8_12,MONORAIL
MONO_12_PLUS,MONORAIL
`;

const filesToWrite = [
  { name: 'fare_media.txt', content: fareMediaContent },
  { name: 'fare_products.txt', content: fareProductsContent },
  { name: 'fare_leg_rules.txt', content: fareLegRulesContent },
  { name: 'fare_transfer_rules.txt', content: fareTransferRulesContent },
  { name: 'fare_attributes.txt', content: fareAttributesContent },
  { name: 'fare_rules.txt', content: fareRulesContent },
];

for (const dir of targetDirs) {
  for (const f of filesToWrite) {
    fs.writeFileSync(path.join(dir, f.name), f.content, 'utf8');
  }
}

console.log('Successfully written GTFS Fares v1 & v2 files to datasets/mumbai and datasets/mumbai/gtfs');

// ── 7. Re-package datasets/mumbai/mumbai_discrete_ready.zip ──────────────────
const mumbaiDir = path.resolve(process.cwd(), 'datasets/mumbai');
const zipPath = path.join(mumbaiDir, 'mumbai_discrete_ready.zip');

const zip = new AdmZip();
const txtFiles = fs
  .readdirSync(mumbaiDir)
  .filter((f) => f.endsWith('.txt') && !fs.statSync(path.join(mumbaiDir, f)).isDirectory());

console.log(`Packaging ${txtFiles.length} GTFS files into ${zipPath}...`);
for (const file of txtFiles) {
  zip.addLocalFile(path.join(mumbaiDir, file));
}
zip.writeZip(zipPath);

console.log('Successfully updated datasets/mumbai/mumbai_discrete_ready.zip with authoritative fare files!');
