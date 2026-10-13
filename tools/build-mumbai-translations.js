const fs = require('fs');
const path = require('path');

const gtfsDir = path.resolve(process.cwd(), 'datasets/mumbai/gtfs');
const stopsPath = path.join(gtfsDir, 'stops.txt');
const routesPath = path.join(gtfsDir, 'routes.txt');
const agencyPath = path.join(gtfsDir, 'agency.txt');
const outputPath = path.join(gtfsDir, 'translations.txt');

// ── Marathi Dictionary ────────────────────────────────────────────────────────
const MARATHI_DICTIONARY = {
  // Line 1
  "Versova": "वर्सोवा",
  "D. N. Nagar": "डी. एन. नगर",
  "Azad Nagar": "आझाद नगर",
  "Andheri": "अंधेरी",
  "Western Express Highway": "वेस्टर्न एक्सप्रेस हायवे",
  "Chakala (J.B. Nagar)": "चकला (जे. बी. नगर)",
  "Airport Road": "एअरपोर्ट रोड",
  "Marol Naka": "मरोळ नाका",
  "Saki Naka": "साकी नाका",
  "Asalpha": "असल्फा",
  "Jagruti Nagar": "जागृती नगर",
  "Ghatkopar": "घाटकोपर",

  // Line 2A & 2B
  "Dahisar (East)": "दहिसर (पूर्व)",
  "Dahisar East": "दहिसर पूर्व",
  "Anand Nagar": "आनंद नगर",
  "Kandarpada": "कांदारपाडा",
  "Mandapeshwar": "मंडपेश्वर",
  "Eksar": "एकसर",
  "Borivali (West)": "बोरीवली (पश्चिम)",
  "Shimpoli": "सिमपोली",
  "Kandivali (West)": "कांदिवली (पश्चिम)",
  "Dahanukarwadi": "डहाणूकरवाडी",
  "Valnai - Meeth Chowky": "वाळणई - मीठ चौकी",
  "Valnai": "वाळणई",
  "Malad (West)": "मालाड (पश्चिम)",
  "Lower Malad": "लोअर मालाड",
  "Bangur Nagar": "बांगूर नगर",
  "Goregaon (West)": "गोरेगाव (पश्चिम)",
  "Oshiwara": "ओशिवरा",
  "Lower Oshiwara": "लोअर ओशिवरा",
  "Andheri (West)": "अंधेरी (पश्चिम)",

  // Line 7 / Line 9
  "Kashigaon": "काशिगाव",
  "MBMC Building": "मिरा-भाईंदर महानगरपालिका इमारत",
  "Shahid Bhagat Singh": "शहीद भगतसिंग",
  "Ovaripada": "ओवरीपाडा",
  "Rashtriya Udyan": "राष्ट्रीय उद्यान",
  "Devipada": "देवीपाडा",
  "Magathane": "मागाठाणे",
  "Poisar": "पोईसर",
  "Akurli": "आकुर्ली",
  "Kurar": "कुरार",
  "Dindoshi": "दिंडोशी",
  "Aarey": "आरे",
  "Goregaon East": "गोरेगाव पूर्व",
  "Jogeshwari East": "जोगेश्वरी पूर्व",
  "Mogra": "मोगरा",
  "Gundavali": "गुंदवली",

  // Line 3
  "Aarey JVLR": "आरे जेव्हिएलआर",
  "SEEPZ": "सीप्झ",
  "MIDC - Andheri": "एमआयडीसी - अंधेरी",
  "CSMIA T2": "छत्रपती शिवाजी महाराज आंतरराष्ट्रीय विमानतळ टी२",
  "Sahar Road": "सहार रोड",
  "CSMIA T1": "छत्रपती शिवाजी महाराज आंतरराष्ट्रीय विमानतळ टी१",
  "Santacruz": "सांताक्रुझ",
  "Vidyanagari": "विद्यानगरी",
  "BKC": "बीकेसी (वांद्रे-कुर्ला संकुल)",
  "Dharavi": "धारावी",
  "Sitaladevi Temple": "शीतलादेवी मंदिर",
  "Dadar": "दादर",
  "Siddhivinayak": "सिद्धिविनायक",
  "Worli": "वरळी",
  "Acharya Atrey Chowk": "आचार्य अत्रे चौक",
  "Science Museum": "सायन्स म्युझियम",
  "Mahalaxmi": "महालक्ष्मी",
  "Jagannath Shankar Sheth Chowk": "जगन्नाथ शंकरशेठ चौक",
  "Grant Road": "ग्रँट रोड",
  "Girgaon": "गिरगाव",
  "Kalbadevi": "कालबादेवी",
  "CSMT": "छत्रपती शिवाजी महाराज टर्मिनस",
  "Hutatma Chowk": "हुतात्मा चौक",
  "Churchgate": "चर्चगेट",
  "Cuffe Parade": "कफ परेड",

  // Railway interchange stations
  "Andheri Railway Station (Western Railway)": "अंधेरी रेल्वे स्टेशन (पश्चिम रेल्वे)",
  "Ghatkopar Railway Station (Central Railway)": "घाटकोपर रेल्वे स्टेशन (मध्य रेल्वे)",
  "Dadar Railway Station (Central/Western Railway)": "दादर रेल्वे स्टेशन (मध्य/पश्चिम रेल्वे)",
  "Mumbai Central Railway Station (Western Railway)": "मुंबई सेंट्रल रेल्वे स्टेशन (पश्चिम रेल्वे)",
  "CSMT Railway Station (Central Railway)": "छत्रपती शिवाजी महाराज टर्मिनस रेल्वे स्टेशन",
  "Churchgate Railway Station (Western Railway)": "चर्चगेट रेल्वे स्टेशन (पश्चिम रेल्वे)",

  // Monorail
  "Sant Gadge Maharaj Chowk": "संत गाडगे महाराज चौक",
  "Lower Parel": "लोअर परळ",
  "Mint Colony": "मिंट कॉलनी",
  "Ambedkar Nagar": "आंबेडकर नगर",
  "Naigaon": "नायगाव",
  "Dadar East": "दादर पूर्व",
  "Wadala Bridge": "वडाळा ब्रिज",
  "Acharya Atre Nagar": "आचार्य अत्रे नगर",
  "Wadala Depot": "वडाळा डेपो",
  "Bhakti Park": "भक्ति पार्क",
  "Mysore Colony": "म्हैसूर कॉलनी",
  "Bharat Petroleum": "भारत पेट्रोलियम",
  "Fertilizer Township": "फर्टिलायझर टाऊनशिप",
  "VNP & RC Marg Junction": "व्ही एन पी अँड आर सी मार्ग जंक्शन",
  "Chembur Naka": "चेंबूर नाका",
  "Chembur": "चेंबूर",

  // Routes
  "Line 1": "लाईन १",
  "Blue Line (Versova - Ghatkopar)": "ब्लू लाईन (वर्सोवा - घाटकोपर)",
  "Line 2A": "लाईन २अ",
  "Yellow Line (Dahisar East - Andheri West)": "यलो लाईन (दहिसर पूर्व - अंधेरी पश्चिम)",
  "Line 2B": "लाईन २ब",
  "Yellow Line (Mandale Depot - Diamond Garden)": "यलो लाईन (मंडळे डेपो - डायमंड गार्डन)",
  "Line 3": "लाईन ३",
  "Aqua Line (Aarey JVLR - Cuffe Parade)": "ॲक्वा लाईन (आरे जेव्हिएलआर - कफ परेड)",
  "Line 7": "लाईन ७",
  "Red Line (Kashigaon - Gundavali)": "रेड लाईन (काशिगाव - गुंदवली)",
  "Monorail": "मोनोरेल",

  // Agencies
  "Mumbai Metro One Private Limited": "मुंबई मेट्रो वन प्रायव्हेट लिमिटेड",
  "Maha Mumbai Metro Operations Corporation Ltd": "महा मुंबई मेट्रो ऑपरेशन्स कॉर्पोरेशन लिमिटेड",
  "Mumbai Metro Rail Corporation Limited": "मुंबई मेट्रो रेल कॉर्पोरेशन लिमिटेड",
  "Maha Mumbai Monorail Operations": "महा मुंबई मोनोरेल ऑपरेशन्स"
};

// ── Helper to convert base station name to Marathi for platforms/gates/concourses
function getMarathiTranslation(englishName) {
  if (MARATHI_DICTIONARY[englishName]) {
    return MARATHI_DICTIONARY[englishName];
  }
  // Try pattern matching for Gate, Concourse, Platform
  let name = englishName;
  name = name.replace(/ Gate (\d+)/, ' गेट $1');
  name = name.replace(/ Concourse \(Unpaid\)/, ' कॉन्कोर्स (अवैतनिक)');
  name = name.replace(/ Concourse \(Paid\)/, ' कॉन्कोर्स (वैतनिक)');
  name = name.replace(/ Platform (\d+)/, ' प्लॅटफॉर्म $1');

  // Match the base station part
  for (const [eng, mar] of Object.entries(MARATHI_DICTIONARY)) {
    if (name.startsWith(eng)) {
      return name.replace(eng, mar);
    }
  }
  return null;
}

const csvRows = ['table_name,field_name,language,translation,record_id'];

// 1. Process Stops
if (fs.existsSync(stopsPath)) {
  const stopsContent = fs.readFileSync(stopsPath, 'utf8');
  const lines = stopsContent.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',');
  const idIdx = header.indexOf('stop_id');
  const nameIdx = header.indexOf('stop_name');

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV line parser (handling quoted fields)
    const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const id = row[idIdx]?.replace(/"/g, '').trim();
    const name = row[nameIdx]?.replace(/"/g, '').trim();

    if (id && name) {
      const marathi = getMarathiTranslation(name);
      if (marathi) {
        csvRows.push(`stops,stop_name,mr,"${marathi}",${id}`);
      }
    }
  }
}

// 2. Process Routes
if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  const lines = routesContent.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',');
  const idIdx = header.indexOf('route_id');
  const longNameIdx = header.indexOf('route_long_name');
  const shortNameIdx = header.indexOf('route_short_name');

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const id = row[idIdx]?.trim();
    const longName = row[longNameIdx]?.trim();
    const shortName = row[shortNameIdx]?.trim();

    if (id) {
      if (shortName && MARATHI_DICTIONARY[shortName]) {
        csvRows.push(`routes,route_short_name,mr,"${MARATHI_DICTIONARY[shortName]}",${id}`);
      }
      if (longName && MARATHI_DICTIONARY[longName]) {
        csvRows.push(`routes,route_long_name,mr,"${MARATHI_DICTIONARY[longName]}",${id}`);
      }
    }
  }
}

// 3. Process Agencies
if (fs.existsSync(agencyPath)) {
  const agencyContent = fs.readFileSync(agencyPath, 'utf8');
  const lines = agencyContent.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',');
  const idIdx = header.indexOf('agency_id');
  const nameIdx = header.indexOf('agency_name');

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const id = row[idIdx]?.trim();
    const name = row[nameIdx]?.trim();

    if (id && name && MARATHI_DICTIONARY[name]) {
      csvRows.push(`agency,agency_name,mr,"${MARATHI_DICTIONARY[name]}",${id}`);
    }
  }
}

fs.writeFileSync(outputPath, csvRows.join('\n') + '\n', 'utf8');
console.log(`Successfully generated translations.txt with ${csvRows.length - 1} records!`);

// ── Pack GTFS files into ZIP archives ────────────────────────────────────────
try {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  const files = fs.readdirSync(gtfsDir).filter(f => f.endsWith('.txt'));
  files.forEach(f => {
    zip.addLocalFile(path.join(gtfsDir, f));
  });

  const zipTargets = [
    path.resolve(process.cwd(), 'datasets/mumbai/mumbai-operational-gtfs.zip'),
    path.resolve(process.cwd(), 'datasets/mumbai/raw/gtfs-static.zip'),
    path.resolve(process.cwd(), 'sample-data/mumbai/mumbai-metro-gtfs.zip')
  ];

  zipTargets.forEach(targetPath => {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    zip.writeZip(targetPath);
    console.log(`Successfully updated ${targetPath} (${files.length} files)`);
  });
} catch (err) {
  console.log('Note: Could not package GTFS zip:', err.message);
}


