const AdmZip = require('adm-zip');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 1. Read single source of truth: GTFS parent stations from mumbai_discrete_ready.zip
const zip = new AdmZip(path.resolve('datasets/mumbai/mumbai_discrete_ready.zip'));
const stopsText = zip.getEntry('stops.txt').getData().toString('utf8');
const gtfsRows = stopsText.split('\n').filter(Boolean).slice(1).map(l => l.split(','));

const gtfsStations = gtfsRows
  .filter(r => r[4] === '1')
  .map(r => ({
    stop_id: r[0],
    stop_name: r[1].replace(/"/g, ''),
    stop_lat: parseFloat(r[2]),
    stop_lon: parseFloat(r[3])
  }));

console.log(`Loaded ${gtfsStations.length} canonical GTFS parent stations as Single Source of Truth.`);

// 2. Crosswalk for DPR Line 2A & Line 7 stations strictly mapping to GTFS stop_id
const DPR_TO_GTFS = {
  // Line 2A
  "LINE2A_DPR_STATION_01": "STN_L2A_001", // Dahisar (East)
  "LINE2A_DPR_STATION_02": "STN_L2A_002", // Anand Nagar
  "LINE2A_DPR_STATION_03": "STN_L2A_003", // Kandarpada (Rushi Sankul area)
  "LINE2A_DPR_STATION_04": "STN_L2A_004", // Mandapeshwar (I C Colony)
  "LINE2A_DPR_STATION_05": "STN_L2A_005", // Eksar (LIC Colony)
  "LINE2A_DPR_STATION_06": "STN_L2A_006", // Borivali (West) (Don Bosco)
  "LINE2A_DPR_STATION_07": "STN_L2A_007", // Shimpoli (Kastur Park)
  "LINE2A_DPR_STATION_08": "STN_L2A_008", // Kandivali (West) (Ekata Nagar)
  "LINE2A_DPR_STATION_09": "STN_L2A_009", // Dahanukarwadi (Kandivali Nagar)
  "LINE2A_DPR_STATION_10": "STN_L2A_010", // Valnai - Meeth Chowky (Charkop)
  "LINE2A_DPR_STATION_11": "STN_L2A_011", // Malad (West)
  "LINE2A_DPR_STATION_12": "STN_L2A_012", // Lower Malad (Kasturi Park)
  "LINE2A_DPR_STATION_13": "STN_L2A_013", // Bangur Nagar
  "LINE2A_DPR_STATION_14": "STN_L2A_014", // Goregaon (West) (Oshiwara Metro)
  "LINE2A_DPR_STATION_15": "STN_L2A_015", // Oshiwara (Samartha Nagar)
  "LINE2A_DPR_STATION_16": "STN_L2A_016", // Lower Oshiwara (Shastri Nagar)
  "LINE2A_DPR_STATION_17": "STN_L2A_017", // Andheri (West) (D. N. Nagar)

  // Line 7
  "LINE7_DPR_STATION_01": "STN_L7_014", // Gundavali (Andheri E / WEH skywalk)
  "LINE7_DPR_STATION_02": "STN_L7_013", // Mogra (Shankarwadi)
  "LINE7_DPR_STATION_03": "STN_L7_012", // Jogeshwari (East) (JVLR Junction)
  "LINE7_DPR_STATION_04": "STN_L7_011", // Goregaon (East) (Bombay Exhibition / NESCO)
  "LINE7_DPR_STATION_05": "STN_L7_010", // Aarey (Hub Mall)
  "LINE7_DPR_STATION_06": "STN_L7_009", // Dindoshi (Vishveshwar Nagar)
  "LINE7_DPR_STATION_07": "STN_L7_008", // Kurar (Aarey Road Junction)
  "LINE7_DPR_STATION_08": "STN_L7_008", // Kurar (Vitt Bhatti)
  "LINE7_DPR_STATION_09": "STN_L7_008", // Kurar (Kurar Village)
  "LINE7_DPR_STATION_10": "STN_L7_006", // Poisar (Bandongri)
  "LINE7_DPR_STATION_11": "STN_L7_006", // Poisar (Mahindra & Mahindra)
  "LINE7_DPR_STATION_12": "STN_L7_005", // Magathane (Thakur Complex)
  "LINE7_DPR_STATION_13": "STN_L7_004", // Devipada (Borivali Bus Stop / Tata Steel / Oberoi Sky City)
  "LINE7_DPR_STATION_14": "STN_L7_003", // Rashtriya Udyan (Borivali Omkareshwar / SGNP)
  "LINE7_DPR_STATION_15": "STN_L7_002", // Ovaripada (Shrinath Nagar)
  "LINE7_DPR_STATION_16": "STN_L7_001"  // Dahisar (East)
};

// Map GTFS station lookup
const gtfsMap = new Map();
gtfsStations.forEach(s => gtfsMap.set(s.stop_id, s));

// Haversine formula
function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Photon Geocoder with retry
async function geocodeLocality(name) {
  try {
    const q = `${name}, Mumbai`;
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`;
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data && res.data.features && res.data.features.length > 0) {
      const feat = res.data.features[0];
      return {
        lat: feat.geometry.coordinates[1],
        lon: feat.geometry.coordinates[0],
        name: feat.properties.name || name
      };
    }
  } catch (err) {
    // Ignore photon timeout
  }
  return null;
}

async function buildWayfindingManifest() {
  console.log('--- Step 1: Ingesting Line 3 from Wayfinder API ---');
  let line3Data = [];
  try {
    const [stnRes, placesRes] = await Promise.all([
      axios.get('https://adminwayfinder.bhugolapps.com/items/Stations?limit=50', { timeout: 10000 }),
      axios.get('https://adminwayfinder.bhugolapps.com/items/Places?limit=500', { timeout: 10000 })
    ]);

    const wfStations = stnRes.data.data;
    const wfPlaces = placesRes.data.data;

    // Match each WF station to GTFS Line 3 stop_id by coordinates
    const wfToGtfs = new Map();
    const gtfsL3 = gtfsStations.filter(s => s.stop_id.startsWith('STN_L3_'));

    wfStations.forEach(wf => {
      const wfLat = parseFloat(wf.Station_Latitude);
      const wfLon = parseFloat(wf.Station_Longitude);
      let best = null;
      let minD = Infinity;
      gtfsL3.forEach(g => {
        const d = Math.hypot(g.stop_lat - wfLat, g.stop_lon - wfLon);
        if (d < minD) {
          minD = d;
          best = g;
        }
      });
      if (best) {
        wfToGtfs.set(wf.id, {
          gtfsStation: best,
          gates: wf.Entry_Exit_Gates ? wf.Entry_Exit_Gates.split(',').map(s => s.trim()) : [],
          lifts: wf.Lift_Status ? wf.Lift_Status.split(',').map(s => s.trim()) : []
        });
      }
    });

    console.log(`Matched ${wfToGtfs.size} Line 3 stations to GTFS parent stations.`);

    // Ingest Line 3 Places
    wfPlaces.forEach(p => {
      const stnInfo = wfToGtfs.get(p.Station);
      if (!stnInfo || !p.Latitude || !p.Longitude) return;

      const pLat = parseFloat(p.Latitude);
      const pLon = parseFloat(p.Longitude);
      const dist = parseInt(p.Distance_From_Nearest_Gate) || calcDistanceMeters(stnInfo.gtfsStation.stop_lat, stnInfo.gtfsStation.stop_lon, pLat, pLon);
      const isDirect = dist <= 40;

      line3Data.push({
        landmarkName: p.Locality_Name,
        category: p.Type_of_Locality || 'COMMERCIAL',
        coordinates: [pLon, pLat],
        connectedStationCode: stnInfo.gtfsStation.stop_id,
        connectedStationName: stnInfo.gtfsStation.stop_name, // strictly from GTFS
        connectedLineCode: 'L3',
        connectedLineName: 'Line 3 (Aqua Line)',
        connectedLineColor: '#06b6d4',
        nearestGate: p.Nearest_Gates || 'Main Gate',
        hasDirectFob: isDirect,
        hasDirectAccess: isDirect,
        walkDistanceMeters: dist,
        walkTimeSeconds: Math.round(dist * 1.2), // ~5km/h walking speed
        corridorNote: `Exit via Gate ${p.Nearest_Gates || 'A1'}. Approx ${dist}m walking to destination.`,
        indoorLevel: 'Level -1 Concourse'
      });
    });

    console.log(`Ingested ${line3Data.length} verified Line 3 places linked strictly to GTFS stations.`);
  } catch (err) {
    console.warn('Wayfinder API fetch error:', err.message);
  }

  console.log('\n--- Step 2: Processing Line 2A & Line 7 DPR Catchments ---');
  const dprRaw = fs.readFileSync(path.resolve('datasets/mumbai/sources/dpr/station-access-inventory.json'), 'utf8');
  const dpr = JSON.parse(dprRaw);

  const dprLandmarks = [];
  const allDprStations = [
    ...(dpr.lines.line2a?.stations || []),
    ...(dpr.lines.line7?.stations || [])
  ];

  for (const dprStn of allDprStations) {
    const gtfsId = DPR_TO_GTFS[dprStn.dprStationKey];
    if (!gtfsId) continue;
    const gtfs = gtfsMap.get(gtfsId);
    if (!gtfs) continue;

    const lineCode = gtfsId.includes('_L2A_') ? 'L2A' : 'L7';
    const lineName = lineCode === 'L2A' ? 'Line 2A (Yellow Line)' : 'Line 7 (Red Line)';
    const lineColor = lineCode === 'L2A' ? '#facc15' : '#ef4444';

    const localities = dprStn.catchmentArea
      ? dprStn.catchmentArea.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2)
      : [];

    // Parse orientation
    const accessDesc = dprStn.entryExitDescription || '';
    const orientation = accessDesc.toLowerCase().includes('west') ? 'West' : (accessDesc.toLowerCase().includes('east') ? 'East' : 'Both');

    // We process key landmarks for this station
    for (const loc of localities.slice(0, 4)) {
      // Small delay to prevent rate limit
      await new Promise(r => setTimeout(r, 80));
      const geocoded = await geocodeLocality(loc);
      let coord = [gtfs.stop_lon, gtfs.stop_lat];
      let dist = 120; // default estimated catchment walk
      let direct = false;

      if (geocoded) {
        coord = [geocoded.lon, geocoded.lat];
        dist = calcDistanceMeters(gtfs.stop_lat, gtfs.stop_lon, geocoded.lat, geocoded.lon);
        // Direct FOB detection
        if (dist <= 50 || loc.toLowerCase().includes('sky city') || loc.toLowerCase().includes('infiniti') || loc.toLowerCase().includes('nesco')) {
          direct = true;
          dist = 0;
        }
      }

      dprLandmarks.push({
        landmarkName: loc,
        category: 'LOCALITY',
        coordinates: coord,
        connectedStationCode: gtfs.stop_id,
        connectedStationName: gtfs.stop_name, // strictly from GTFS
        connectedLineCode: lineCode,
        connectedLineName: lineName,
        connectedLineColor: lineColor,
        nearestGate: `${orientation} Gate`,
        hasDirectFob: direct,
        hasDirectAccess: direct,
        walkDistanceMeters: dist,
        walkTimeSeconds: Math.round(dist * 1.2),
        corridorNote: direct 
          ? `Direct concourse connection via ${orientation} station structure.`
          : `Exit via ${orientation} side. Catchment area of ${gtfs.stop_name}.`,
        indoorLevel: 'Level 1 Concourse / Street'
      });
    }
  }

  console.log(`Processed ${dprLandmarks.length} DPR landmarks mapped to GTFS stations.`);

  // Combine and write master wayfinding manifest
  const masterWayfinding = {
    metadata: {
      generatedAt: new Date().toISOString(),
      singleSourceOfTruth: "mumbai_discrete_ready.zip (GTFS)",
      totalLandmarks: line3Data.length + dprLandmarks.length
    },
    landmarks: [...line3Data, ...dprLandmarks]
  };

  const outPath = path.resolve('datasets/mumbai/processed/mumbai_wayfinding_manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(masterWayfinding, null, 2), 'utf8');
  console.log(`\n✅ Saved ${masterWayfinding.landmarks.length} wayfinding records to ${outPath}`);
}

buildWayfindingManifest().catch(console.error);
