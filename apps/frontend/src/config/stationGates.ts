/**
 * MetroRadar Station Gates & Wayfinder Registry
 * Authoritative mapping of official MMRC (Line 3 Aqua Line), MMRDA (Lines 2A, 7),
 * and MMOPL (Line 1) station gates, exit directions, landmarks, and direct FOB links.
 */

export interface StationGateItem {
  gate: string; // e.g. "Gate A1", "Gate 1", "FOB Link"
  name: string; // Raw name from MMRC / GTFS
  landmark: string; // Key destination landmark or street
  keywords: string[]; // Search terms to match against user destination query
  walkNote?: string;
  isDirectFob?: boolean;
}

export interface StationGateRecord {
  stationName: string;
  stationAliases: string[];
  lineCode: string; // "L3", "L1", "L2A", "L7", etc.
  lineName: string;
  defaultExitGate: string;
  defaultLandmarkSummary: string;
  defaultWalkNote?: string;
  gates: StationGateItem[];
}

export interface ExitGateInfo {
  gate: string;
  landmarkSummary: string;
  walkNote?: string;
  isDirectFob?: boolean;
  stationName: string;
  lineName?: string;
  allGates?: Array<{
    gate: string;
    landmark: string;
    isRecommended?: boolean;
  }>;
}

export const STATION_GATES_REGISTRY: StationGateRecord[] = [
  // ── Line 3 (Aqua Line) 27 Stations ──────────────────────────────────────────
  {
    stationName: "Aarey JVLR",
    stationAliases: ["aarey", "aarey jvlr", "aarey colony"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B1",
    defaultLandmarkSummary: "Gate A1 (JVLR West & WEH) · Gate B1 (JVLR East / Powai & Milind Nagar)",
    defaultWalkNote: "Surface exits onto Jogeshwari-Vikhroli Link Road (JVLR)",
    gates: [
      {
        gate: "Gate A1",
        name: "Aarey JVLR Gate A1 (Jogeshwari-Vikhroli Link Road (JVLR))",
        landmark: "Jogeshwari-Vikhroli Link Road (JVLR West) & Western Express Highway",
        keywords: ["jvlr", "jogeshwari", "western express", "aarey milk colony", "hub mall"],
        walkNote: "Exit towards Western Express Highway & Jogeshwari",
      },
      {
        gate: "Gate B1",
        name: "Aarey JVLR Gate B1 (JVLR (East) / Powai & Milind Nagar)",
        landmark: "JVLR (East) / Powai & Milind Nagar",
        keywords: ["powai", "milind nagar", "iit", "kanjurmarg link"],
        walkNote: "Exit towards Powai & Milind Nagar",
      },
    ],
  },
  {
    stationName: "SEEPZ",
    stationAliases: ["seepz", "seepz metro", "seepz special economic zone"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B1",
    defaultLandmarkSummary: "Gate A1 (Holy Spirit Hospital) · Gate B1 (SEEPZ Gate 1) · Gate B2 (ERTL)",
    defaultWalkNote: "Subway and concourse exits to SEEPZ zone and Mahakali",
    gates: [
      {
        gate: "Gate A1",
        name: "SEEPZ Gate A1 (Holy Spirit Hospital)",
        landmark: "Holy Spirit Hospital & Mahakali Caves Road",
        keywords: ["holy spirit", "hospital", "mahakali caves", "canossa"],
        walkNote: "Exit via Gate A1 for Holy Spirit Hospital (~150m walk)",
      },
      {
        gate: "Gate A2",
        name: "SEEPZ Gate A2 (C Cross Road Junction - Bus Stop)",
        landmark: "C Cross Road Junction & MIDC Central Bus Stop",
        keywords: ["c cross road", "bus stop", "midc bus"],
        walkNote: "Exit via Gate A2 for BEST bus connections",
      },
      {
        gate: "Gate B1",
        name: "SEEPZ Gate B1 (Directi Seepz Office)",
        landmark: "Directi SEEPZ Office & SEEPZ Gate No. 1",
        keywords: ["directi", "seepz gate 1", "tcs seepz", "accenture seepz", "seepz sez"],
        walkNote: "Direct pedestrian access to SEEPZ Main Entrance Gate 1",
      },
      {
        gate: "Gate B2",
        name: "SEEPZ Gate B2 (Electronic Regional Test Laboratory)",
        landmark: "Electronic Regional Test Laboratory (ERTL) & SEEPZ Gate No. 3",
        keywords: ["ertl", "electronic regional", "seepz gate 3"],
        walkNote: "Exit via Gate B2 towards MIDC East",
      },
    ],
  },
  {
    stationName: "MIDC",
    stationAliases: ["midc", "midc andheri", "andheri midc"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A2 / B1",
    defaultLandmarkSummary: "Gate A2 (Passport Seva Kendra) · Gate B1 (Ackruti Trade Centre) · Gate A1 (Hotel Suncity)",
    defaultWalkNote: "Access to Andheri East commercial & IT parks",
    gates: [
      {
        gate: "Gate A1",
        name: "MIDC Gate A1 (Hotel Suncity Residency)",
        landmark: "Hotel Suncity Residency & Central Way Road",
        keywords: ["suncity", "hotel suncity", "central way"],
        walkNote: "Exit via Gate A1 towards Central Way",
      },
      {
        gate: "Gate A2",
        name: "MIDC Gate A2 (Passport Seva Kendra)",
        landmark: "Passport Seva Kendra (PSK Andheri East) & Marol Industrial Area",
        keywords: ["passport", "passport seva", "psk", "marol industrial"],
        walkNote: "Exit via Gate A2 for Passport Seva Kendra (~100m walk)",
      },
      {
        gate: "Gate B1",
        name: "MIDC Gate B1 (Ackruti Trade Centre)",
        landmark: "Ackruti Trade Centre & Kondivita Road",
        keywords: ["ackruti", "akruti", "trade centre", "kondivita"],
        walkNote: "Exit via Gate B1 towards Kondivita Rd",
      },
      {
        gate: "Gate B2",
        name: "MIDC Gate B2 (East Pavilion Surface Access)",
        landmark: "East Pavilion / Mahakali Caves Road Junction",
        keywords: ["east pavilion", "mahakali"],
        walkNote: "Exit via Gate B2 for Mahakali Road",
      },
    ],
  },
  {
    stationName: "Marol Naka",
    stationAliases: ["marol naka", "marol", "marol metro"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B2",
    defaultLandmarkSummary: "Gate A1 (Pearl Academy) · Gate A2 (Waterstones Hotel) · Gate B2 (Marol Naka Chowk / L1)",
    defaultWalkNote: "Underground interchange with Line 1 elevated station",
    gates: [
      {
        gate: "Gate A1",
        name: "Marol Naka Gate A1 (Pearl Academy)",
        landmark: "Pearl Academy & SM Centre",
        keywords: ["pearl academy", "sm centre", "design school"],
        walkNote: "Exit via Gate A1 towards Pearl Academy (~120m)",
      },
      {
        gate: "Gate A2",
        name: "Marol Naka Gate A2 (Waterstones Hotel)",
        landmark: "Waterstones Hotel & Club / Marol Fire Brigade",
        keywords: ["waterstones", "fire brigade", "hotel waterstones"],
        walkNote: "Exit via Gate A2 for Waterstones Hotel",
      },
      {
        gate: "Gate B1",
        name: "Marol Naka Gate B1 (Hotel Sahar Garden)",
        landmark: "Hotel Sahar Garden & Andheri-Kurla Road",
        keywords: ["sahar garden", "andheri kurla road"],
        walkNote: "Exit via Gate B1 towards Sakinaka direction",
      },
      {
        gate: "Gate B2",
        name: "Marol Naka Gate B2 (Marol Naka/Mata Ramabai Ambedkar Chowk (Towards CSMIA/JB Nagar))",
        landmark: "Marol Naka Chowk & Line 1 Metro Interchange",
        keywords: ["chowk", "line 1", "interchange", "jb nagar", "csmia link"],
        walkNote: "Follow escalators up to Line 1 elevated concourse / Marol Naka Chowk",
      },
    ],
  },
  {
    stationName: "CSMIA Terminal 2",
    stationAliases: ["csmia t2", "csmia terminal 2", "mumbai international airport", "t2 airport", "t2"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A2",
    defaultLandmarkSummary: "Gate A2 (Terminal 2 Departures & Arrivals) · Gate B1 (P4 Parking & Taxi)",
    defaultWalkNote: "Direct climate-controlled concourse link to International Terminal",
    gates: [
      {
        gate: "Gate A1",
        name: "CSMIA Terminal 2 Gate A1 (West Pavilion Surface Access)",
        landmark: "Sahar Airport Road Surface Access & Hilton Mumbai",
        keywords: ["hilton", "sahar elevated road", "surface access"],
        walkNote: "Exit towards Sahar Road and airport perimeter",
      },
      {
        gate: "Gate A2",
        name: "CSMIA Terminal 2 Gate A2 (Air India Air Transport Services Ltd)",
        landmark: "Terminal 2 Departures / Arrivals & Airline Offices",
        keywords: ["t2", "airport", "international airport", "departures", "arrivals", "air india"],
        walkNote: "Direct escalators into Terminal 2 Check-in Hall. Zero street walking.",
        isDirectFob: true,
      },
      {
        gate: "Gate B1",
        name: "CSMIA Terminal 2 Gate B1 (Airport Health Organization)",
        landmark: "Multi-level Car Parking P4, Airport Cabs & APHO",
        keywords: ["parking", "p4", "cab", "taxi", "uber", "ola", "apho"],
        walkNote: "Direct covered access to MLCP P4 and App-cab pickup zones",
      },
    ],
  },
  {
    stationName: "Sahar Road",
    stationAliases: ["sahar road", "sahar"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "FOB Link / Gate A5",
    defaultLandmarkSummary: "T2 Pedestrian Link FOB (Direct Skywalk) · Gate A5 (Hotel Le Grande) · Gate B1 (Cargo Complex)",
    defaultWalkNote: "Direct FOB link to Terminal 2 & Sahar Village Road",
    gates: [
      {
        gate: "FOB Link",
        name: "Sahar Road Terminal 2 Pedestrian Link FOB",
        landmark: "Dedicated Pedestrian Foot Overbridge to CSMIA Terminal 2",
        keywords: ["fob", "skywalk", "t2 connector", "direct fob"],
        walkNote: "Direct elevated skywalk link connecting Sahar Road to Terminal 2",
        isDirectFob: true,
      },
      {
        gate: "Gate A1",
        name: "Sahar Road Gate A1 (Air India Hanger Narrow Body)",
        landmark: "Air India Engineering Hangar Narrow Body",
        keywords: ["air india hangar", "hangar", "engineering"],
        walkNote: "Exit towards airline maintenance facilities",
      },
      {
        gate: "Gate A4",
        name: "Sahar Road Gate A4 (Jet Airways)",
        landmark: "Jet Airways Complex / Sahar Cargo Road",
        keywords: ["jet airways", "cargo road"],
        walkNote: "Exit towards Sahar Cargo Road",
      },
      {
        gate: "Gate A5",
        name: "Sahar Road Gate A5 (Hotel Le Grande)",
        landmark: "Hotel Le Grande & Tarun Bharat Society",
        keywords: ["hotel le grande", "le grande", "tarun bharat"],
        walkNote: "Exit towards Hotel Le Grande & residential areas",
      },
      {
        gate: "Gate B1",
        name: "Sahar Road Gate B1 (Cargo Complex)",
        landmark: "Air Cargo Complex & Customs House",
        keywords: ["cargo complex", "air cargo", "customs"],
        walkNote: "Exit via Gate B1 towards International Air Cargo Terminal",
      },
    ],
  },
  {
    stationName: "CSMIA Terminal 1",
    stationAliases: ["csmia t1", "csmia terminal 1", "domestic airport", "t1 airport", "t1", "santacruz airport"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1",
    defaultLandmarkSummary: "Gate A1 (Domestic Airport Terminal 1 & Taxi Pickup) · Gate B1 (Gujarat Society / Vakola)",
    defaultWalkNote: "Covered walkway to Domestic Terminal 1 Arrivals & Departures",
    gates: [
      {
        gate: "Gate A1",
        name: "CSMIA Terminal 1 Gate A1 (Domestic Airport Taxi Pickup Point)",
        landmark: "Domestic Airport Terminal 1 & Prepaid Taxi Stand",
        keywords: ["t1", "domestic", "terminal 1", "taxi stand", "departures", "arrivals", "spicejet", "indigo"],
        walkNote: "Direct covered path to Terminal 1 Departures and Prepaid Taxi queue (~150m walk)",
        isDirectFob: true,
      },
      {
        gate: "Gate B1",
        name: "CSMIA Terminal 1 Gate B1 (Gujarat Society / Dayaldas Road (Towards Vakola))",
        landmark: "Gujarat Society, Dayaldas Road & Western Express Highway",
        keywords: ["gujarat society", "dayaldas", "vakola", "weh"],
        walkNote: "Exit via Gate B1 towards Western Express Highway & Vile Parle East",
      },
    ],
  },
  {
    stationName: "Santacruz",
    stationAliases: ["santacruz", "santacruz metro", "santacruz east"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B2",
    defaultLandmarkSummary: "Gate A1 (Grand Hyatt Mumbai & WEH) · Gate B2 (Santacruz Railway Station East & Bus Depot)",
    defaultWalkNote: "Access to Western Express Highway and Santacruz East",
    gates: [
      {
        gate: "Gate A1",
        name: "Santacruz Gate A1 (Grand Hyatt Mumbai)",
        landmark: "Grand Hyatt Mumbai & Western Express Highway Southbound",
        keywords: ["grand hyatt", "hyatt", "hotel hyatt", "weh south"],
        walkNote: "Exit via Gate A1 for Grand Hyatt Mumbai (~200m walk)",
      },
      {
        gate: "Gate B1",
        name: "Santacruz Gate B1 (Vakola Police Station)",
        landmark: "Vakola Police Station & Nehru Road Junction",
        keywords: ["vakola", "police station", "nehru road"],
        walkNote: "Exit via Gate B1 towards Vakola Junction",
      },
      {
        gate: "Gate B2",
        name: "Santacruz Gate B2 (Santacruz Station (East) Bus Station)",
        landmark: "Santacruz Suburban Railway Station (East) & BEST Bus Depot",
        keywords: ["railway station", "suburban", "bus depot", "best bus", "santacruz east"],
        walkNote: "Exit via Gate B2 for Santacruz Western Railway suburban platforms & bus depot (~590m walk)",
      },
    ],
  },
  {
    stationName: "Bandra Colony",
    stationAliases: ["bandra colony", "kalanagar", "bandra east"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A2 / B1",
    defaultLandmarkSummary: "Gate A2 (Hallmark Business Plaza) · Gate B1 (Khar Road Suburban Station) · Gate A1 (Cardinal Gracias School)",
    defaultWalkNote: "Pedestrian subway connection to Kalanagar & Khar Road",
    gates: [
      {
        gate: "Gate A1",
        name: "Bandra Colony Gate A1 (Cardinal Gracias High School)",
        landmark: "Cardinal Gracias High School & Ali Yavar Jung Marg",
        keywords: ["cardinal gracias", "school", "ali yavar jung"],
        walkNote: "Exit via Gate A1 towards Ali Yavar Jung Marg",
      },
      {
        gate: "Gate A2",
        name: "Bandra Colony Gate A2 (Hallamrk Business Plazza)",
        landmark: "Hallmark Business Plaza & Kalanagar Junction",
        keywords: ["hallmark", "business plaza", "kalanagar", "matoshree"],
        walkNote: "Exit via Gate A2 for Hallmark Business Plaza & Kalanagar",
      },
      {
        gate: "Gate B1",
        name: "Bandra Colony Gate B1 (Khar Road Suburban Railway Station (Western))",
        landmark: "Khar Road Suburban Railway Station (Western Line)",
        keywords: ["khar road", "khar station", "suburban railway"],
        walkNote: "Exit via Gate B1 towards Khar Road railway station overbridge (~450m walk)",
      },
      {
        gate: "Gate B2",
        name: "Bandra Colony Gate B2 (Directorate Of Maharashtra Fire Service)",
        landmark: "Directorate Of Maharashtra Fire Service",
        keywords: ["fire service", "fire brigade"],
        walkNote: "Exit via Gate B2 towards Government Colony",
      },
    ],
  },
  {
    stationName: "BKC",
    stationAliases: ["bkc", "bandra kurla complex", "bkc metro"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / A5 / B1",
    defaultLandmarkSummary: "Gate A1 (SEBI & NMACC) · Gate A5 (Jio World Centre & Maker Maxity) · Gate B1 (US Consulate & RNA)",
    defaultWalkNote: "Direct underground connectivity to the Bandra Kurla Complex central business district",
    gates: [
      {
        gate: "Gate A1",
        name: "BKC Gate A1 (Securities and Exchange Board of India (SEBI))",
        landmark: "SEBI Head Office & Nita Mukesh Ambani Cultural Centre (NMACC)",
        keywords: ["sebi", "nmacc", "cultural centre", "bkc g block"],
        walkNote: "Direct exit to SEBI Bhavan & NMACC (~120m walk)",
      },
      {
        gate: "Gate A2",
        name: "BKC Gate A2 (NABARD Head Office)",
        landmark: "NABARD Head Office & NSE Building",
        keywords: ["nabard", "national stock exchange", "nse", "il&fs"],
        walkNote: "Exit towards NABARD & National Stock Exchange",
      },
      {
        gate: "Gate A3",
        name: "BKC Gate A3 (Maharashtra Housing And Area Development Authority)",
        landmark: "MHADA Headquarters & Griha Nirman Bhavan",
        keywords: ["mhada", "housing authority"],
        walkNote: "Exit towards MHADA Head Office",
      },
      {
        gate: "Gate A4",
        name: "BKC Gate A4 (Income Tax Office(Towards Kala Nagar))",
        landmark: "Pratyaksha Kar Bhavan (Income Tax Office) & Kala Nagar Flyover",
        keywords: ["income tax", "ito", "pratyaksha kar bhavan"],
        walkNote: "Exit towards Income Tax offices & Kala Nagar",
      },
      {
        gate: "Gate A5",
        name: "BKC Gate A5 (Jio Mall)",
        landmark: "Jio World Drive, Jio World Convention Centre & Maker Maxity",
        keywords: ["jio mall", "jio world", "jio world drive", "maker maxity", "convention centre", "diamond bourse"],
        walkNote: "Direct concourse connection towards Jio World Convention Centre & Maker Maxity",
        isDirectFob: true,
      },
      {
        gate: "Gate B1",
        name: "BKC Gate B1 (RNA Corporate Park)",
        landmark: "RNA Corporate Park, Asian Heart Institute & US Consulate",
        keywords: ["rna", "asian heart", "us consulate", "consulate", "trident bkc", "sofitel"],
        walkNote: "Exit towards Asian Heart Institute, Trident BKC & US Consulate General",
      },
    ],
  },
  {
    stationName: "Dharavi",
    stationAliases: ["dharavi", "dharavi metro"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A2 / B2",
    defaultLandmarkSummary: "Gate A2 (ONGC Head Office) · Gate B2 (Dharavi T Junction) · Gate A1 (Canossa School)",
    defaultWalkNote: "Exits to Dharavi T Junction and Sion-Bandra Link Road",
    gates: [
      {
        gate: "Gate A1",
        name: "Dharavi Gate A1 (Canossa High School)",
        landmark: "Canossa High School & Mahim Link Road",
        keywords: ["canossa", "high school", "mahim link"],
        walkNote: "Exit towards Canossa High School",
      },
      {
        gate: "Gate A2",
        name: "Dharavi Gate A2 (Ongc (Oil & Natural Gas Company))",
        landmark: "ONGC (Oil & Natural Gas Corporation) Head Office",
        keywords: ["ongc", "oil and natural gas", "ongc building"],
        walkNote: "Direct exit to ONGC Corporate Office",
      },
      {
        gate: "Gate B1",
        name: "Dharavi Gate B1 (Bharat Ratna Dr.Babasaheb Ambedkar School & Junior College)",
        landmark: "Dr. Babasaheb Ambedkar School & College",
        keywords: ["ambedkar school", "junior college"],
        walkNote: "Exit towards 90 Feet Road",
      },
      {
        gate: "Gate B2",
        name: "Dharavi Gate B2 (Dharavi T Junction/Ganpatrao Tapase Chowk - Bus Stop)",
        landmark: "Dharavi T Junction / Ganpatrao Tapase Chowk & Sion Link",
        keywords: ["t junction", "dharavi junction", "ganpatrao tapase", "sion link"],
        walkNote: "Exit for BEST bus transit hub at Dharavi T Junction",
      },
    ],
  },
  {
    stationName: "Sitladevi",
    stationAliases: ["sitladevi", "sheetladevi", "mahim metro"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B2",
    defaultLandmarkSummary: "Gate A1 (P.D. Hinduja Hospital) · Gate B2 (Mahim Fort & Causeway) · Gate B3 (Raheja Hospital)",
    defaultWalkNote: "Subway access along Lady Jamshedji Road and Mahim",
    gates: [
      {
        gate: "Gate A1",
        name: "Sitladevi Gate A1 (P. D. Hinduja Hospital & Medical Research Centre)",
        landmark: "P. D. Hinduja National Hospital & Medical Research Centre",
        keywords: ["hinduja", "hinduja hospital", "hospital", "medical research"],
        walkNote: "Exit via Gate A1 for P.D. Hinduja Hospital (~280m walk)",
      },
      {
        gate: "Gate A2",
        name: "Sitladevi Gate A2 (Cannossa Special School)",
        landmark: "Canossa Special School & Lady Jamshedji Road",
        keywords: ["canossa special", "lady jamshedji", "lj road"],
        walkNote: "Exit towards LJ Road north",
      },
      {
        gate: "Gate B2",
        name: "Sitladevi Gate B2 (Mahim Fort)",
        landmark: "Mahim Fort, Mahim Causeway & Sitladevi Temple",
        keywords: ["mahim fort", "causeway", "sitladevi temple", "sheetla devi temple"],
        walkNote: "Exit towards Mahim Causeway and Sitladevi Temple",
      },
      {
        gate: "Gate B3",
        name: "Sitladevi Gate B3 (Raheja Hospital)",
        landmark: "S.L. Raheja Hospital (A Fortis Associate)",
        keywords: ["raheja", "raheja hospital", "fortis"],
        walkNote: "Exit towards S.L. Raheja Hospital (~400m walk)",
      },
    ],
  },
  {
    stationName: "Dadar Metro",
    stationAliases: ["dadar metro", "dadar l3", "dadar west"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A4 / B1 / B3",
    defaultLandmarkSummary: "Gate B1 (Shivaji Park & Sena Bhavan) · Gate A4 (Shushrusha Hospital) · Gate B3 (Matunga Road Station)",
    defaultWalkNote: "Underground pedestrian connections along Gokhale & Ranade Roads",
    gates: [
      {
        gate: "Gate A2",
        name: "Dadar Metro Gate A2 (Ranade Road Junction - Bus Stop)",
        landmark: "Ranade Road Junction & Dadar Flower Market",
        keywords: ["ranade road", "flower market", "dadar market", "chhabildas"],
        walkNote: "Exit for Ranade Road & Dadar West Shopping Precinct",
      },
      {
        gate: "Gate A3",
        name: "Dadar Metro Gate A3 (Institute Of Hotel Management, Catering Technology And Applied Nutrition)",
        landmark: "Institute Of Hotel Management (IHM Mumbai) & Catering College",
        keywords: ["ihm", "hotel management", "catering college"],
        walkNote: "Exit via Gate A3 for IHM Mumbai",
      },
      {
        gate: "Gate A4",
        name: "Dadar Metro Gate A4 (Shushrusha Hospital)",
        landmark: "Shushrusha Citizens' Co-operative Hospital & Portuguese Church",
        keywords: ["shushrusha", "hospital", "portuguese church", "gokhale road"],
        walkNote: "Exit via Gate A4 for Shushrusha Hospital (~80m walk)",
      },
      {
        gate: "Gate B1",
        name: "Dadar Metro Gate B1 (Shivaji Park/Ram Ganesh Gadkari Chowk - Bus Stop)",
        landmark: "Shivaji Park, Sena Bhavan & Gadkari Rangayatan Chowk",
        keywords: ["shivaji park", "sena bhavan", "gadkari chowk", "samarth vyayam mandir"],
        walkNote: "Direct exit to Shivaji Park and Ram Ganesh Gadkari Chowk (~150m walk)",
      },
      {
        gate: "Gate B3",
        name: "Dadar Metro Gate B3 (Matunga Road Railway Station)",
        landmark: "Matunga Road Suburban Railway Station (Western Line)",
        keywords: ["matunga road", "railway station", "western suburban"],
        walkNote: "Exit via Gate B3 towards Matunga Road railway station (~300m walk)",
      },
    ],
  },
  {
    stationName: "Siddhivinayak",
    stationAliases: ["siddhivinayak", "prabhadevi metro", "siddhivinayak temple"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate B2",
    defaultLandmarkSummary: "Gate B2 (Shree Siddhivinayak Temple & Ravindra Natya Mandir) · Gate A1 (Textile Committee)",
    defaultWalkNote: "Direct dedicated entrance plaza for Shree Siddhivinayak Temple",
    gates: [
      {
        gate: "Gate A1",
        name: "Siddhivinayak Gate A1 (Textile Committee Of India)",
        landmark: "Textile Committee Of India & P. Balu Marg",
        keywords: ["textile committee", "balu marg"],
        walkNote: "Exit via Gate A1 towards P. Balu Marg",
      },
      {
        gate: "Gate A3",
        name: "Siddhivinayak Gate A3 (Kirti M. Doongursee College Of Arts,Science & Commerce)",
        landmark: "Kirti M. Doongursee College & Kashinath Dhuru Marg",
        keywords: ["kirti college", "doongursee", "college"],
        walkNote: "Exit for Kirti College & Dadar Beach",
      },
      {
        gate: "Gate A4",
        name: "Siddhivinayak Gate A4 (ITI Dadar)",
        landmark: "ITI Dadar & S.V.S. Marg",
        keywords: ["iti dadar", "industrial training institute"],
        walkNote: "Exit towards ITI Dadar campus",
      },
      {
        gate: "Gate A5",
        name: "Siddhivinayak Gate A5 (Ravindra Natya Mandir)",
        landmark: "Ravindra Natya Mandir & Sayani Road",
        keywords: ["ravindra natya mandir", "natya mandir", "auditorium"],
        walkNote: "Exit via Gate A5 for Ravindra Natya Mandir (~180m walk)",
      },
      {
        gate: "Gate B1",
        name: "Siddhivinayak Gate B1 (Adv. Balasaheb Apte College Of Law)",
        landmark: "Adv. Balasaheb Apte College Of Law",
        keywords: ["balasaheb apte", "law college"],
        walkNote: "Exit towards Apte College of Law",
      },
      {
        gate: "Gate B2",
        name: "Siddhivinayak Gate B2 (PL. Deshpande Maharashtra Kala Academy)",
        landmark: "Shree Siddhivinayak Ganapati Temple & P.L. Deshpande Maharashtra Kala Academy",
        keywords: ["siddhivinayak", "temple", "ganapati", "ganesh", "pl deshpande", "kala academy"],
        walkNote: "Direct pedestrian plaza exit leading directly to Shree Siddhivinayak Temple (~60m walk)",
      },
    ],
  },
  {
    stationName: "Worli",
    stationAliases: ["worli", "worli metro", "kamala mills"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A2 / B4",
    defaultLandmarkSummary: "Gate A2 (Kamala Mills Compound) · Gate B4 (One World Center) · Gate B2 (Traffic Police HQ)",
    defaultWalkNote: "Direct underground connectivity to Lower Parel commercial hubs",
    gates: [
      {
        gate: "Gate A1",
        name: "Worli Gate A1 (Anti-Corruption Bureau)",
        landmark: "Anti-Corruption Bureau & Worli Naka",
        keywords: ["anti corruption", "acb", "worli naka"],
        walkNote: "Exit via Gate A1 towards Worli Naka",
      },
      {
        gate: "Gate A2",
        name: "Worli Gate A2 (Kamala Mills Compound)",
        landmark: "Kamala Mills Compound, High Street Phoenix & Palladium Mall",
        keywords: ["kamala mills", "phoenix", "high street phoenix", "palladium", "todi mills"],
        walkNote: "Direct pedestrian exit towards Kamala Mills Compound & Lower Parel (~150m walk)",
        isDirectFob: true,
      },
      {
        gate: "Gate B2",
        name: "Worli Gate B2 (Mumbai Traffic Police H)",
        landmark: "Mumbai Traffic Police Headquarters",
        keywords: ["traffic police", "police hq", "headquarters"],
        walkNote: "Exit via Gate B2 for Traffic Police HQ",
      },
      {
        gate: "Gate B3",
        name: "Worli Gate B3 (Dr. Ravindra Kulkarni Chowk)",
        landmark: "Dr. Ravindra Kulkarni Chowk & Century Bazaar",
        keywords: ["kulkarni chowk", "century bazaar"],
        walkNote: "Exit towards Dr. Annie Besant Road",
      },
      {
        gate: "Gate B4",
        name: "Worli Gate B4 (One Worldcentre)",
        landmark: "One World Center (Indiabulls Finance Centre) & Senapati Bapat Marg",
        keywords: ["one world centre", "one world center", "indiabulls", "ibfc", "senapati bapat marg"],
        walkNote: "Direct exit to One World Center corporate towers",
        isDirectFob: true,
      },
    ],
  },
  {
    stationName: "Acharya Atre Chowk",
    stationAliases: ["acharya atre chowk", "worli sea face", "atria mall"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B2",
    defaultLandmarkSummary: "Gate A1 (Atria Mall & Nehru Planetarium) · Gate B2 (Acharya Atre Chowk) · Gate B4 (Worli Dairy)",
    defaultWalkNote: "Subway exits to Dr. Annie Besant Road and Worli Sea Face",
    gates: [
      {
        gate: "Gate A1",
        name: "Acharya Atre Chowk Gate A1 (Atria Mall)",
        landmark: "Atria The Millennium Mall & Nehru Planetarium",
        keywords: ["atria mall", "atria", "nehru planetarium", "planetarium", "nehru centre"],
        walkNote: "Direct exit to Atria Mall and Nehru Planetarium (~100m walk)",
      },
      {
        gate: "Gate A4",
        name: "Acharya Atre Chowk Gate A4 (Mahanagar Palika Yangraha - Bus stop)",
        landmark: "BEST Transport Museum & Central Bus Stop",
        keywords: ["museum", "transport museum", "best museum"],
        walkNote: "Exit towards BMC Heritage Transport Museum",
      },
      {
        gate: "Gate B2",
        name: "Acharya Atre Chowk Gate B2 (Acharya Atre Chowk)",
        landmark: "Acharya Atre Chowk & Worli Naka Junction",
        keywords: ["atre chowk", "worli naka"],
        walkNote: "Surface exit to Acharya Atre Chowk intersection",
      },
      {
        gate: "Gate B3",
        name: "Acharya Atre Chowk Gate B3 (Shri Chandra Baba Mandir)",
        landmark: "Shri Chandra Baba Mandir & Worli Sea Face Link",
        keywords: ["chandra baba", "worli sea face", "sea face"],
        walkNote: "Exit towards Worli Sea Face promenade",
      },
      {
        gate: "Gate B4",
        name: "Acharya Atre Chowk Gate B4 (Dairy Development Department)",
        landmark: "Dairy Development Department & Worli Dairy",
        keywords: ["worli dairy", "dairy development", "dairy"],
        walkNote: "Exit towards Worli Dairy complex",
      },
    ],
  },
  {
    stationName: "Science Centre",
    stationAliases: ["science centre", "nehru science centre", "science museum", "mahalaxmi racecourse"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A3 / B3",
    defaultLandmarkSummary: "Gate A3 (Nehru Science Centre & Ambika Mills) · Gate B3 (Municipal Industrial Estate)",
    defaultWalkNote: "Access to Nehru Science Centre and Dr. E. Moses Road",
    gates: [
      {
        gate: "Gate A1",
        name: "Science Centre Gate A1 (West Pavilion Surface Access)",
        landmark: "Nehru Science Centre Main Gate & Dr. E. Moses Road",
        keywords: ["nehru science centre", "science centre", "science museum"],
        walkNote: "Direct exit for Nehru Science Centre (~80m walk)",
      },
      {
        gate: "Gate A3",
        name: "Science Centre Gate A3 (Ambika Mill - H.U.Rakhangi Chowk (towards Mahalaxmi Station))",
        landmark: "Ambika Mills, H.U. Rakhangi Chowk & Mahalaxmi Station Direction",
        keywords: ["ambika mill", "rakhangi chowk", "shakti mills", "famous studios"],
        walkNote: "Exit towards Ambika Mills & Famous Studios",
      },
      {
        gate: "Gate B3",
        name: "Science Centre Gate B3 (Municipal Industrial Estate)",
        landmark: "Municipal Industrial Estate & Dainik Shivner Marg",
        keywords: ["municipal industrial", "dainik shivner", "dhobi ghat link"],
        walkNote: "Exit towards Municipal Industrial Estate",
      },
    ],
  },
  {
    stationName: "Mahalaxmi",
    stationAliases: ["mahalaxmi", "mahalaxmi metro", "racecourse"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / A4",
    defaultLandmarkSummary: "Gate A1 (Essar House & Racecourse) · Gate A4 (Agripada Police Station / Nair Hospital) · Monorail link",
    defaultWalkNote: "Subway connection to Mahalaxmi Western Railway suburban & Jacob Circle Monorail",
    gates: [
      {
        gate: "Gate A1",
        name: "Mahalaxmi Gate A1 (Essar House)",
        landmark: "Essar House & Mahalaxmi Racecourse Main Entrance",
        keywords: ["essar house", "racecourse", "mahalaxmi racecourse", "rwitc", "turf club"],
        walkNote: "Exit via Gate A1 for Essar House & Royal Western India Turf Club (~150m walk)",
      },
      {
        gate: "Gate A4",
        name: "Mahalaxmi Gate A4 (Agripada Police Station (Towards Nair Hospital/Opera House))",
        landmark: "Agripada Police Station, Nair Hospital & Opera House Road",
        keywords: ["agripada", "nair hospital", "police station", "opera house", "jacob circle"],
        walkNote: "Exit towards Agripada & Nair Hospital / Jacob Circle Monorail interchange",
      },
      {
        gate: "Gate B1",
        name: "Mahalaxmi Gate B1 (East Pavilion Surface Access)",
        landmark: "Haji Ali Dargah & Mahalaxmi Temple Link / Keshavrao Khadye Marg",
        keywords: ["haji ali", "mahalaxmi temple", "khadye marg"],
        walkNote: "Exit towards Mahalaxmi suburban station & Haji Ali link",
      },
    ],
  },
  {
    stationName: "Mumbai Central",
    stationAliases: ["mumbai central", "mumbai central metro", "bct", "maratha mandir"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / A5 / B5",
    defaultLandmarkSummary: "Gate A1 (Mumbai Central Terminus) · Gate A5 (Apollo Spectra Hospital) · Gate B5 (Maratha Mandir Theatre)",
    defaultWalkNote: "Direct pedestrian concourse subway to Mumbai Central Mainline & Suburban Stations",
    gates: [
      {
        gate: "Gate A1",
        name: "Mumbai Central Gate A1 (Mumbai Central Station (towards Saatrasta))",
        landmark: "Mumbai Central Mainline Terminus & Saat Rasta Link",
        keywords: ["mumbai central station", "bct", "terminus", "western railway", "saat rasta"],
        walkNote: "Direct underground subway connection to Mumbai Central Railway Station. Zero street crossing.",
        isDirectFob: true,
      },
      {
        gate: "Gate A5",
        name: "Mumbai Central Gate A5 (Apollo Spectra Hospital)",
        landmark: "Apollo Spectra Hospital & Tardeo Road",
        keywords: ["apollo spectra", "hospital", "tardeo"],
        walkNote: "Exit via Gate A5 for Apollo Spectra Hospital (~100m walk)",
      },
      {
        gate: "Gate B3",
        name: "Mumbai Central Gate B3 (Maharashtra College)",
        landmark: "Maharashtra College Of Arts, Science & Commerce / Belasis Road",
        keywords: ["maharashtra college", "belasis road"],
        walkNote: "Exit towards Maharashtra College & Belasis Road",
      },
      {
        gate: "Gate B5",
        name: "Mumbai Central Gate B5 (Maratha Mandir Theatre)",
        landmark: "Maratha Mandir Cinema & Navjeevan Society",
        keywords: ["maratha mandir", "theatre", "cinema", "ddlj", "navjeevan"],
        walkNote: "Direct exit to Maratha Mandir Theatre (~120m walk)",
      },
    ],
  },
  {
    stationName: "Grant Road",
    stationAliases: ["grant road", "grant road metro", "lamington road"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / A2",
    defaultLandmarkSummary: "Gate A1 (Novelty Cinema & Lamington Road) · Gate A2 (Sonawala Buildings & Tardeo Bus Station)",
    defaultWalkNote: "Exit to Dr. Bhadkamkar Road (Lamington Road electronics market)",
    gates: [
      {
        gate: "Gate A1",
        name: "Grant Road Gate A1 (Novelty Cinema - Dr.Bhadkamkar Road Junction (towards Play House/Tardeo Bus Station/Girgaon))",
        landmark: "Novelty Cinema, Dr. Bhadkamkar Road (Lamington Road) & Play House",
        keywords: ["novelty cinema", "lamington road", "electronics market", "dr bhadkamkar", "play house"],
        walkNote: "Exit for Lamington Road computer market & Novelty Cinema (~60m walk)",
      },
      {
        gate: "Gate A2",
        name: "Grant Road Gate A2 (Sonawala Buildings)",
        landmark: "Sonawala Buildings, Tardeo Bus Station & Girgaon Direction",
        keywords: ["sonawala", "tardeo bus station", "girgaon"],
        walkNote: "Exit towards Tardeo Bus Station & Grant Road station overbridge",
      },
    ],
  },
  {
    stationName: "Girgaon",
    stationAliases: ["girgaon", "girgaon metro", "girgaum", "bhuleshwar"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B1",
    defaultLandmarkSummary: "Gate A1 (Shri Chandraprabh Jain Temple & Bhuleshwar) · Gate B1 (Gaiwadi & Girgaon Chowpatty)",
    defaultWalkNote: "Subway connection to Jagannath Shankar Sheth (JSS) Road",
    gates: [
      {
        gate: "Gate A1",
        name: "Girgaon Gate A1 (Shri Chandraprabh Digambar Jain Temple, Bhuleshwar)",
        landmark: "Shri Chandraprabh Digambar Jain Temple & Bhuleshwar Bazaar",
        keywords: ["jain temple", "chandraprabh", "bhuleshwar", "zaveri bazaar"],
        walkNote: "Exit towards Bhuleshwar & Zaveri Bazaar market lanes",
      },
      {
        gate: "Gate A2",
        name: "Girgaon Gate A2 (S.K. Patil Garden)",
        landmark: "S.K. Patil Udyan & Charni Road Suburban Railway Station Link",
        keywords: ["sk patil garden", "garden", "charni road"],
        walkNote: "Exit towards S.K. Patil Garden & Charni Road railway station",
      },
      {
        gate: "Gate B1",
        name: "Girgaon Gate B1 (Gaiwadi (towards Hutatma Chowk))",
        landmark: "Gaiwadi, JSS Road & Girgaon Chowpatty",
        keywords: ["gaiwadi", "chowpatty", "girgaon chowpatty", "jss road"],
        walkNote: "Exit towards Gaiwadi & Girgaon Chowpatty promenade",
      },
    ],
  },
  {
    stationName: "Kalbadevi",
    stationAliases: ["kalbadevi", "kalbadevi metro", "mulji jetha market"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate B1 / A1",
    defaultLandmarkSummary: "Gate B1 (Mulji Jetha Cloth Market & Mangaldas Market) · Gate A1 (Directorate of Technical Education)",
    defaultWalkNote: "Underground access beneath Kalbadevi textile trading district",
    gates: [
      {
        gate: "Gate A1",
        name: "Kalbadevi Gate A1 (Directorate of Technical Education)",
        landmark: "Directorate of Technical Education (DTE) & Metro Cinema Chowk",
        keywords: ["directorate of technical education", "dte", "metro cinema"],
        walkNote: "Exit via Gate A1 for Directorate of Technical Education (~150m walk)",
      },
      {
        gate: "Gate B1",
        name: "Kalbadevi Gate B1 (Mulji Jetha Market)",
        landmark: "Mulji Jetha Market (MJ Market) & Mangaldas Cloth Market",
        keywords: ["mulji jetha", "mj market", "mangaldas market", "cloth market", "textile market"],
        walkNote: "Direct pedestrian exit into Mulji Jetha Cloth Market trading lanes (~40m walk)",
      },
      {
        gate: "Gate B2",
        name: "Kalbadevi Gate B2 (S.K. Patil Garden)",
        landmark: "S.K. Patil Garden & Marine Lines East",
        keywords: ["sk patil", "marine lines east"],
        walkNote: "Exit towards Marine Lines suburban station connector",
      },
    ],
  },
  {
    stationName: "CSMT Metro",
    stationAliases: ["csmt metro", "csmt", "cst", "chhatrapati shivaji maharaj terminus", "victoria terminus"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A2 / B1 / A1",
    defaultLandmarkSummary: "Gate A2 (General Post Office - GPO) · Gate B1 (Crawford Market) · Gate A1 (Anjuman-I-Islam / CSMT Terminus)",
    defaultWalkNote: "Subway connection to CSMT UNESCO Heritage Terminus, Suburban lines & Crawford Market",
    gates: [
      {
        gate: "Gate A1",
        name: "CSMT Metro Gate A1 (Anjuman Islam School)",
        landmark: "Anjuman-I-Islam High School & CSMT Main Railway Terminus",
        keywords: ["anjuman islam", "school", "csmt terminus", "railway station", "cst"],
        walkNote: "Direct subway connection to CSMT Central Railway Suburban & Long Distance platforms",
        isDirectFob: true,
      },
      {
        gate: "Gate A2",
        name: "CSMT Metro Gate A2 (General Post Office)",
        landmark: "Mumbai General Post Office (GPO) & Mint Road",
        keywords: ["general post office", "gpo", "post office", "mint road"],
        walkNote: "Exit via Gate A2 for Mumbai GPO (~90m walk)",
      },
      {
        gate: "Gate B1",
        name: "CSMT Metro Gate B1 (Crawford Market)",
        landmark: "Crawford Market (Mahatma Jyotiba Phule Mandai) & Manish Market",
        keywords: ["crawford market", "crawford", "manish market", "phule mandai", "crockery market", "police commissioner"],
        walkNote: "Direct pedestrian exit to Crawford Market & Manish Market (~220m walk)",
      },
    ],
  },
  {
    stationName: "Hutatma Chowk",
    stationAliases: ["hutatma chowk", "flora fountain", "fountain", "fort", "ballard estate"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A4 / A1 / B4",
    defaultLandmarkSummary: "Gate A4 (Ballard Estate & Reserve Bank of India) · Gate A1 (Flora Fountain) · Gate B4 (BMC HQ & GPO)",
    defaultWalkNote: "Exit subway to Fort heritage district, Flora Fountain, High Court & Ballard Estate",
    gates: [
      {
        gate: "Gate A1",
        name: "Hutatma Chowk Gate A1 (Central Bank of India)",
        landmark: "Central Bank of India Building, Flora Fountain & MG Road",
        keywords: ["flora fountain", "fountain", "central bank", "mg road", "fountain chowk", "oriental building"],
        walkNote: "Exit via Gate A1 for Flora Fountain and MG Road promenade (~60m walk)",
      },
      {
        gate: "Gate A2",
        name: "Hutatma Chowk Gate A2 (Western Railway Headquarters)",
        landmark: "Western Railway Headquarters & Churchgate Subway Link",
        keywords: ["western railway hq", "wr hq", "churchgate subway"],
        walkNote: "Exit via Gate A2 towards Churchgate Station subway",
      },
      {
        gate: "Gate A3",
        name: "Hutatma Chowk Gate A3 (West Pavilion Surface Access)",
        landmark: "Bombay High Court, University of Mumbai & Oval Maidan",
        keywords: ["high court", "bombay high court", "university of mumbai", "mumbai university", "oval maidan"],
        walkNote: "Exit via Gate A3 for Bombay High Court & University of Mumbai (~250m walk)",
      },
      {
        gate: "Gate A4",
        name: "Hutatma Chowk Gate A4 (Reserve Bank Of India)",
        landmark: "Reserve Bank of India (RBI), Ballard Estate & Horniman Circle",
        keywords: ["reserve bank", "rbi", "ballard estate", "ballard pier", "horniman circle", "asiatic library", "mint road", "shaheed bhagat singh"],
        walkNote: "Exit via Gate A4 towards Ballard Estate, RBI & Horniman Circle (~300m walk)",
      },
      {
        gate: "Gate B1",
        name: "Hutatma Chowk Gate B1 (East Pavilion Surface Access)",
        landmark: "Hutatma Chowk Memorial & Veer Nariman Road",
        keywords: ["hutatma chowk memorial", "martyrs memorial", "veer nariman road"],
        walkNote: "Exit towards Hutatma Chowk memorial square",
      },
      {
        gate: "Gate B2",
        name: "Hutatma Chowk Gate B2 (East Pavilion Surface Access)",
        landmark: "Sir P.M. Road, Khadi Bhandar & Standard Chartered Bank",
        keywords: ["sir pm road", "pm road", "khadi bhandar"],
        walkNote: "Exit towards Sir Phirozeshah Mehta Road",
      },
      {
        gate: "Gate B4",
        name: "Hutatma Chowk Gate B4 (Brihanmumbai Municipal Corporation (BMC))",
        landmark: "Brihanmumbai Municipal Corporation (BMC) Headquarters & CSMT Link",
        keywords: ["bmc", "municipal corporation", "bmc headquarters", "csmt link"],
        walkNote: "Exit via Gate B4 towards BMC Heritage Headquarters and CSMT subway (~280m walk)",
      },
    ],
  },
  {
    stationName: "Churchgate",
    stationAliases: ["churchgate", "churchgate metro", "churchgate station"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / B1 / A4",
    defaultLandmarkSummary: "Gate A1 (Churchgate Main Terminus) · Gate B1 (Eros Cinema & Oval Maidan) · Gate A4 (Wankhede Stadium)",
    defaultWalkNote: "Subway interchange to Churchgate Western Railway Suburban Terminus",
    gates: [
      {
        gate: "Gate A1",
        name: "Churchgate Gate A1 (Industrial Assurance Building)",
        landmark: "Industrial Assurance Building & Churchgate Suburban Railway Terminus",
        keywords: ["churchgate station", "churchgate terminus", "industrial assurance", "suburban"],
        walkNote: "Direct underground pedestrian connection to Churchgate Suburban Platforms",
        isDirectFob: true,
      },
      {
        gate: "Gate A2",
        name: "Churchgate Gate A2 (Vidhan Bhavan)",
        landmark: "Madam Cama Road & Vidhan Bhavan Connector",
        keywords: ["madam cama", "vidhan bhavan link"],
        walkNote: "Exit towards Madam Cama Road and Mantralaya North",
      },
      {
        gate: "Gate A4",
        name: "Churchgate Gate A4 (West Pavilion Surface Access)",
        landmark: "Wankhede Stadium, Marine Drive Promenade & Vinoo Mankad Road",
        keywords: ["wankhede", "wankhede stadium", "marine drive", "mca", "cricket stadium"],
        walkNote: "Exit via Gate A4 for Wankhede Stadium & Marine Drive (~250m walk)",
      },
      {
        gate: "Gate A5",
        name: "Churchgate Gate A5 (HR College of Economics & Commerce)",
        landmark: "H.R. College of Commerce & Economics / K.C. College",
        keywords: ["hr college", "kc college", "hsnc", "college"],
        walkNote: "Exit via Gate A5 for H.R. & K.C. Colleges (~120m walk)",
      },
      {
        gate: "Gate B1",
        name: "Churchgate Gate B1 (Hutatma Chowk (Flora Fountain))",
        landmark: "Eros Theatre, Oval Maidan & Veer Nariman Road East",
        keywords: ["eros", "eros cinema", "oval maidan", "veer nariman"],
        walkNote: "Exit via Gate B1 towards Eros Cinema & Oval Maidan (~180m walk)",
      },
      {
        gate: "Gate B2",
        name: "Churchgate Gate B2 (Jai Hind College)",
        landmark: "Jai Hind College & 'A' Road Churchgate",
        keywords: ["jai hind", "jai hind college"],
        walkNote: "Exit via Gate B2 for Jai Hind College (~300m walk)",
      },
    ],
  },
  {
    stationName: "Vidhan Bhawan",
    stationAliases: ["vidhan bhawan", "vidhan bhavan", "mantralaya", "nariman point"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate B1 / B2 / B4",
    defaultLandmarkSummary: "Gate B1 (Mantralaya & Vidhan Bhavan) · Gate B2 (The Oberoi & Nariman Point) · Gate B4 (Mittal Towers)",
    defaultWalkNote: "Underground concourse network serving Maharashtra Government & Nariman Point CBD",
    gates: [
      {
        gate: "Gate A3",
        name: "Vidhan Bhawan Gate A3 (National Gallery of Modern Art)",
        landmark: "National Gallery of Modern Art (NGMA) & CSMVS Museum",
        keywords: ["ngma", "modern art", "national gallery", "museum", "prince of wales"],
        walkNote: "Exit via Gate A3 towards NGMA and CSMVS Museum (~350m walk)",
      },
      {
        gate: "Gate B1",
        name: "Vidhan Bhawan Gate B1 (Mantralaya)",
        landmark: "Vidhan Bhavan (State Legislative Assembly) & Mantralaya",
        keywords: ["mantralaya", "vidhan bhavan", "assembly", "secretariat", "state government"],
        walkNote: "Exit via Gate B1 for Vidhan Bhavan & Mantralaya Main Gate (~170m walk)",
      },
      {
        gate: "Gate B2",
        name: "Vidhan Bhawan Gate B2 (East Pavilion Surface Access)",
        landmark: "The Oberoi, Mumbai, Trident Hotel & Nariman Point Promenade",
        keywords: ["oberoi", "the oberoi", "trident", "nariman point", "marine drive south"],
        walkNote: "Exit via Gate B2 towards The Oberoi & Marine Drive (~240m walk)",
      },
      {
        gate: "Gate B4",
        name: "Vidhan Bhawan Gate B4 (Mittal Towers)",
        landmark: "Mittal Towers, Maker Chambers & Nariman Point Financial District",
        keywords: ["mittal towers", "mittal tower", "maker chambers", "nariman point cbd", "cr2", "inox"],
        walkNote: "Direct building concourse access via Gate B4 (~10m walk)",
        isDirectFob: true,
      },
    ],
  },
  {
    stationName: "Cuffe Parade",
    stationAliases: ["cuffe parade", "colaba", "world trade centre", "wtc"],
    lineCode: "L3",
    lineName: "Line 3 (Aqua Line)",
    defaultExitGate: "Gate A1 / A2 / B1",
    defaultLandmarkSummary: "Gate A1 (World Trade Centre - WTC) · Gate A2 (Backbay Bus Depot) · Gate B1 (Colaba Bus Station & Badhwar Park)",
    defaultWalkNote: "Southern terminal station serving Cuffe Parade, WTC & Colaba",
    gates: [
      {
        gate: "Gate A1",
        name: "Cuffe Parade Gate A1 (West Pavilion Surface Access)",
        landmark: "World Trade Centre (WTC Mumbai), IDBI Tower & Maker Arcade",
        keywords: ["world trade centre", "wtc", "idbi tower", "maker arcade", "cuffe parade"],
        walkNote: "Direct exit to World Trade Centre Mumbai & IDBI Tower (~100m walk)",
        isDirectFob: true,
      },
      {
        gate: "Gate A2",
        name: "Cuffe Parade Gate A2 (Backbay Bus Depot)",
        landmark: "Backbay BEST Bus Depot & Captain Prakash Pethe Marg",
        keywords: ["backbay", "bus depot", "best depot", "prakash pethe"],
        walkNote: "Direct exit to Backbay Bus Depot for feeder bus routes",
      },
      {
        gate: "Gate B1",
        name: "Cuffe Parade Gate B1 (Colaba Bus Station)",
        landmark: "Colaba Bus Station, Badhwar Park & Colaba Woods",
        keywords: ["colaba", "colaba bus station", "badhwar park", "colaba woods", "rc church"],
        walkNote: "Exit via Gate B1 towards Badhwar Park & Colaba Woods (~250m walk)",
      },
    ],
  },

  // ── Key Line 1, Line 2A & Line 7 Interchanges & Stations ──────────────────
  {
    stationName: "Andheri",
    stationAliases: ["andheri", "andheri metro", "andheri west", "andheri railway"],
    lineCode: "L1",
    lineName: "Line 1 (Blue Line)",
    defaultExitGate: "Gate 1 / Gate 4",
    defaultLandmarkSummary: "Gate 4 (Direct Railway FOB) · Gate 1 (Gokhale Bridge) · Gate 2 (Old Nagardas Rd)",
    defaultWalkNote: "Elevated concourse with direct skywalk to Western Railway platforms",
    gates: [
      {
        gate: "Gate 4 (FOB)",
        name: "Andheri Station Direct Foot Overbridge Link",
        landmark: "Andheri Suburban & Mainline Railway Station Platforms (Western / Harbour)",
        keywords: ["railway station", "andheri railway", "suburban", "local train", "western railway", "harbour line"],
        walkNote: "Direct elevated foot overbridge connection to all railway platforms. Zero street crossing.",
        isDirectFob: true,
      },
      {
        gate: "Gate 1",
        name: "Andheri Gate 1 (Gokhale Bridge)",
        landmark: "Gokhale Bridge & S.V. Road West",
        keywords: ["gokhale bridge", "sv road"],
        walkNote: "Exit towards S.V. Road & Gokhale Bridge",
      },
      {
        gate: "Gate 2",
        name: "Andheri Gate 2 (Old Nagardas Road)",
        landmark: "Old Nagardas Road & Andheri East Market",
        keywords: ["nagardas", "andheri east"],
        walkNote: "Exit towards Old Nagardas Road & east auto-rickshaw stand",
      },
    ],
  },
  {
    stationName: "Ghatkopar",
    stationAliases: ["ghatkopar", "ghatkopar metro", "ghatkopar railway"],
    lineCode: "L1",
    lineName: "Line 1 (Blue Line)",
    defaultExitGate: "Gate 2 (FOB)",
    defaultLandmarkSummary: "Gate 2 (Direct Central Railway Platform 1 FOB) · Gate 1 (LBS Marg & MG Road)",
    defaultWalkNote: "Direct multi-level foot overbridge to Central Railway suburban lines",
    gates: [
      {
        gate: "Gate 2 (FOB)",
        name: "Ghatkopar Railway Direct Foot Overbridge Link",
        landmark: "Ghatkopar Central Railway Station Platform 1 & Ticket Hall",
        keywords: ["railway", "central railway", "local train", "ghatkopar station", "suburban"],
        walkNote: "Direct covered foot overbridge into Ghatkopar Suburban Platform 1. Zero street walking.",
        isDirectFob: true,
      },
      {
        gate: "Gate 1",
        name: "Ghatkopar Gate 1 (LBS Marg)",
        landmark: "LBS Marg & Ghatkopar West Auto Stand",
        keywords: ["lbs marg", "auto stand", "ghatkopar west"],
        walkNote: "Exit towards Lal Bahadur Shastri (LBS) Marg",
      },
    ],
  },
  {
    stationName: "Gundavali",
    stationAliases: ["gundavali", "weh interchange", "western express highway metro"],
    lineCode: "L7",
    lineName: "Line 7 (Red Line)",
    defaultExitGate: "Gate 2 (Skywalk)",
    defaultLandmarkSummary: "Gate 2 (Direct 58m Covered Skywalk to L1 WEH Station) · Gate 1 (WEH Highway)",
    defaultWalkNote: "Covered elevated skywalk connecting Line 7 to Line 1",
    gates: [
      {
        gate: "Gate 2 (Skywalk)",
        name: "Line 1 WEH Direct Covered Skywalk Connector",
        landmark: "Line 1 Western Express Highway Station Concourse",
        keywords: ["line 1", "blue line", "weh", "interchange", "skywalk", "western express highway station"],
        walkNote: "Direct 58m covered pedestrian skywalk crossing over Western Express Highway into Line 1",
        isDirectFob: true,
      },
      {
        gate: "Gate 1",
        name: "Gundavali Gate 1 (WEH East)",
        landmark: "Western Express Highway East Service Road & Solitaire Corporate Park",
        keywords: ["weh east", "solitaire", "service road"],
        walkNote: "Exit towards WEH eastern service road",
      },
    ],
  },
  {
    stationName: "Andheri West",
    stationAliases: ["andheri west", "dn nagar interchange", "d.n. nagar"],
    lineCode: "L2A",
    lineName: "Line 2A (Yellow Line)",
    defaultExitGate: "Gate 2 (Skywalk)",
    defaultLandmarkSummary: "Gate 2 (Direct Covered Skywalk to L1 Platform 1 Ghatkopar) · Gate 1 (Link Road West)",
    defaultWalkNote: "Direct covered link road bridge to Line 1 D.N. Nagar station",
    gates: [
      {
        gate: "Gate 2 (Skywalk)",
        name: "Line 1 D.N. Nagar Direct Covered Skywalk",
        landmark: "Line 1 D.N. Nagar Platform 1 (towards Ghatkopar) & Concourse",
        keywords: ["line 1", "dn nagar", "d.n. nagar", "skywalk", "interchange", "blue line"],
        walkNote: "Direct covered skywalk from Line 2A concourse straight to Line 1 Platform 1 (Ghatkopar-bound)",
        isDirectFob: true,
      },
      {
        gate: "Gate 1",
        name: "Andheri West Gate 1 (New Link Road)",
        landmark: "New Link Road West & Star Bazaar",
        keywords: ["link road", "star bazaar"],
        walkNote: "Exit towards New Link Road west side",
      },
    ],
  },
  {
    stationName: "Devipada",
    stationAliases: ["devipada", "oberoi sky city", "sky city borivali"],
    lineCode: "L7",
    lineName: "Line 7 (Red Line)",
    defaultExitGate: "Gate 1 (Direct Skywalk)",
    defaultLandmarkSummary: "Gate 1 (Direct Concourse FOB to Oberoi Sky City & Mall) · Gate 2 (WEH East)",
    defaultWalkNote: "Direct dedicated level 1 concourse bridge to Oberoi township",
    gates: [
      {
        gate: "Gate 1 (Skywalk)",
        name: "Oberoi Sky City Direct Concourse Skywalk",
        landmark: "Oberoi Sky City, Sky City Mall & Luxury Residential Towers",
        keywords: ["oberoi", "sky city", "skycity", "oberoi mall borivali", "sky city mall"],
        walkNote: "Directly connected via dedicated Level 1 Concourse FOB into Oberoi Sky City. Zero street walking.",
        isDirectFob: true,
      },
      {
        gate: "Gate 2",
        name: "Devipada Gate 2 (WEH Service Road)",
        landmark: "Western Express Highway East Service Road & National Park Link",
        keywords: ["weh", "service road", "national park"],
        walkNote: "Exit towards Western Express Highway",
      },
    ],
  },
  {
    stationName: "Malad (West)",
    stationAliases: ["malad west", "malad", "infiniti mall malad"],
    lineCode: "L2A",
    lineName: "Line 2A (Yellow Line)",
    defaultExitGate: "Gate 1 (Direct Concourse)",
    defaultLandmarkSummary: "Gate 1 (Infiniti Mall Malad Direct Plaza) · Gate 2 (Link Road South)",
    defaultWalkNote: "Concourse exit opening directly to Infiniti Mall retail courtyard",
    gates: [
      {
        gate: "Gate 1 (Mall Link)",
        name: "Infiniti Mall Direct Concourse Plaza",
        landmark: "Infiniti Mall (Malad West) & MovieMax",
        keywords: ["infiniti mall", "infiniti", "infinity mall", "mall malad"],
        walkNote: "Direct concourse courtyard access beneath station into Infiniti Mall. Zero street walking.",
        isDirectFob: true,
      },
      {
        gate: "Gate 2",
        name: "Malad West Gate 2 (New Link Road)",
        landmark: "New Link Road & Chincholi Bunder Road",
        keywords: ["link road", "chincholi bunder"],
        walkNote: "Exit towards New Link Road & Mindspace connector",
      },
    ],
  },
];

/**
 * Normalizes station names for fuzzy comparison
 */
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_()·,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Authoritative station exit gate resolver
 */
export function resolveStationExitGate(
  stationName: string,
  destinationQuery?: string,
  existingGuidance?: string | null
): ExitGateInfo | null {
  const normStation = normalizeName(stationName);
  const normDest = destinationQuery ? normalizeName(destinationQuery) : "";

  // 1. Look up station record in registry
  const record = STATION_GATES_REGISTRY.find((r) => {
    const rNorm = normalizeName(r.stationName);
    if (rNorm === normStation || normStation.includes(rNorm) || rNorm.includes(normStation)) {
      return true;
    }
    return r.stationAliases.some((alias) => {
      const aNorm = normalizeName(alias);
      return aNorm === normStation || normStation.includes(aNorm);
    });
  });

  if (!record) {
    // Check if existingGuidance already mentions a gate
    if (existingGuidance && /gate\s+[a-z0-9]+/i.test(existingGuidance)) {
      const match = existingGuidance.match(/gate\s+([a-z0-9,\s/]+)/i);
      return {
        gate: match ? `Gate ${match[1].trim()}` : "Exit Gate",
        landmarkSummary: destinationQuery || stationName,
        walkNote: existingGuidance,
        stationName,
      };
    }
    return null;
  }

  // Build the list of all mapped gates for this station
  const allGatesList = record.gates.map((g) => ({
    gate: g.gate,
    landmark: g.landmark,
    isRecommended: false,
  }));

  // 2. If destinationQuery or existingGuidance contains specific landmark matching keywords
  if (normDest || existingGuidance) {
    const searchText = `${normDest} ${existingGuidance || ""}`.toLowerCase();

    // Check individual gates
    for (const gateItem of record.gates) {
      const matchesKeyword = gateItem.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
      const matchesLandmark = searchText.includes(normalizeName(gateItem.landmark));

      if (matchesKeyword || matchesLandmark) {
        // Mark as recommended in allGates
        const found = allGatesList.find((ag) => ag.gate === gateItem.gate);
        if (found) found.isRecommended = true;

        return {
          gate: gateItem.gate,
          landmarkSummary: gateItem.landmark,
          walkNote: gateItem.walkNote || `Exit via ${gateItem.gate} for ${destinationQuery}`,
          isDirectFob: gateItem.isDirectFob,
          stationName: record.stationName,
          lineName: record.lineName,
          allGates: allGatesList,
        };
      }
    }
  }

  // 3. Fallback to default gate recommendations for this station
  // Mark the default gate as recommended
  const defaultGateFound = allGatesList.find((ag) =>
    record.defaultExitGate.toLowerCase().includes(ag.gate.toLowerCase())
  );
  if (defaultGateFound) {
    defaultGateFound.isRecommended = true;
  }

  return {
    gate: record.defaultExitGate,
    landmarkSummary: record.defaultLandmarkSummary,
    walkNote: record.defaultWalkNote,
    isDirectFob: record.gates.some((g) => g.isDirectFob),
    stationName: record.stationName,
    lineName: record.lineName,
    allGates: allGatesList,
  };
}
