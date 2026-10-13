const fs = require('fs');
const path = require('path');

const gtfsDir = path.resolve(process.cwd(), 'datasets/mumbai/gtfs');

// ── 1. fare_media.txt ─────────────────────────────────────────────────────────
// Defines payment channels available across Mumbai Transit
const fareMediaContent = `fare_media_id,fare_media_name,fare_media_type
MEDIA_PAPER,"Single Journey Paper Ticket / QR Code",1
MEDIA_NCMC,"National Common Mobility Card (Mumbai 1 Card)",2
MEDIA_TOKEN,"MMOPL Single Journey Token",1
`;
fs.writeFileSync(path.join(gtfsDir, 'fare_media.txt'), fareMediaContent, 'utf8');

// ── 2. fare_products.txt ──────────────────────────────────────────────────────
// Defines products, base pricing tiers, and discounts
const fareProductsContent = `fare_product_id,fare_product_name,fare_media_id,amount,currency
PROD_SINGLE_0_3,"Single Journey Ticket (0-3 km)",MEDIA_PAPER,10,INR
PROD_SINGLE_3_12,"Single Journey Ticket (3-12 km)",MEDIA_PAPER,20,INR
PROD_SINGLE_12_18,"Single Journey Ticket (12-18 km)",MEDIA_PAPER,30,INR
PROD_SINGLE_18_24,"Single Journey Ticket (18-24 km)",MEDIA_PAPER,40,INR
PROD_SINGLE_24_30,"Single Journey Ticket (24-30 km)",MEDIA_PAPER,50,INR
PROD_SINGLE_30_PLUS,"Single Journey Ticket (30+ km)",MEDIA_PAPER,60,INR
PROD_NCMC_0_3,"NCMC Card Discounted Fare (0-3 km)",MEDIA_NCMC,9,INR
PROD_NCMC_3_12,"NCMC Card Discounted Fare (3-12 km)",MEDIA_NCMC,18,INR
PROD_NCMC_12_18,"NCMC Card Discounted Fare (12-18 km)",MEDIA_NCMC,27,INR
PROD_NCMC_18_24,"NCMC Card Discounted Fare (18-24 km)",MEDIA_NCMC,36,INR
PROD_NCMC_24_30,"NCMC Card Discounted Fare (24-30 km)",MEDIA_NCMC,45,INR
PROD_NCMC_30_PLUS,"NCMC Card Discounted Fare (30+ km)",MEDIA_NCMC,54,INR
`;
fs.writeFileSync(path.join(gtfsDir, 'fare_products.txt'), fareProductsContent, 'utf8');

// ── 3. fare_leg_rules.txt ─────────────────────────────────────────────────────
// Links distance ranges (in meters) to fare products across all lines
const fareLegRulesContent = `leg_group_id,fare_product_id,rule_priority,min_distance,max_distance
LEG_SLAB_1,PROD_SINGLE_0_3,1,0,3000
LEG_SLAB_2,PROD_SINGLE_3_12,1,3000,12000
LEG_SLAB_3,PROD_SINGLE_12_18,1,12000,18000
LEG_SLAB_4,PROD_SINGLE_18_24,1,18000,24000
LEG_SLAB_5,PROD_SINGLE_24_30,1,24000,30000
LEG_SLAB_6,PROD_SINGLE_30_PLUS,1,30000,100000
LEG_NCMC_1,PROD_NCMC_0_3,2,0,3000
LEG_NCMC_2,PROD_NCMC_3_12,2,3000,12000
LEG_NCMC_3,PROD_NCMC_12_18,2,12000,18000
LEG_NCMC_4,PROD_NCMC_18_24,2,18000,24000
LEG_NCMC_5,PROD_NCMC_24_30,2,24000,30000
LEG_NCMC_6,PROD_NCMC_30_PLUS,2,30000,100000
`;
fs.writeFileSync(path.join(gtfsDir, 'fare_leg_rules.txt'), fareLegRulesContent, 'utf8');

// ── 4. fare_transfer_rules.txt ────────────────────────────────────────────────
// Defines transfer pricing rules between operators (MMMOCL, MMOPL, MMRCL)
const fareTransferRulesContent = `from_leg_group_id,to_leg_group_id,transfer_count,duration_limit,duration_limit_type,fare_transfer_type,transfer_charge
LEG_SLAB_1,LEG_SLAB_1,-1,7200,1,0,0
`;
fs.writeFileSync(path.join(gtfsDir, 'fare_transfer_rules.txt'), fareTransferRulesContent, 'utf8');

console.log('Successfully generated GTFS-Fares v2 files!');
