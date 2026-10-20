export interface LandmarkAccessGate {
  gateId: string;
  gateName: string;
  stationCode: string;
  stationName: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  walkDistanceMeters: number;
  walkTimeSeconds: number;
  corridorType: 'WALK' | 'TRAVELATOR' | 'FOB' | 'SUBWAY';
  corridorNote: string;
  indoorLevel: string;
}

export interface LandmarkRecord {
  id: string;
  name: string;
  aliases: string[];
  category: 'MALL' | 'TOWNSHIP' | 'TRANSIT_HUB' | 'AIRPORT' | 'COMMERCIAL';
  coordinates: [number, number]; // [lon, lat]
  connectedStationCode: string;
  connectedStationName: string;
  connectedLineCode: string;
  connectedLineName: string;
  connectedLineColor: string;
  hasDirectFob: boolean;
  hasDirectAccess: boolean;
  directFobName?: string;
  walkDistanceMeters: number;
  walkTimeSeconds: number;
  corridorNote: string;
  indoorLevel: string;
  accessGates?: LandmarkAccessGate[];
}

export const LANDMARK_REGISTRY: LandmarkRecord[] = [
  {
    id: 'LM_OBEROI_SKY_CITY',
    name: 'Oberoi Sky City (Borivali)',
    aliases: [
      'oberoi sky city',
      'sky city borivali',
      'oberoi borivali',
      'sky city',
      'skycity',
      'oberoi skycity',
      'sky city mall',
    ],
    category: 'TOWNSHIP',
    coordinates: [72.86375, 19.2246],
    connectedStationCode: 'STN_L7_004',
    connectedStationName: 'Devipada',
    connectedLineCode: 'L7',
    connectedLineName: 'Line 7 (Red Line)',
    connectedLineColor: '#ef4444',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Oberoi Sky City Direct Concourse Skywalk',
    walkDistanceMeters: 0,
    walkTimeSeconds: 0,
    corridorNote:
      'Directly connected via the dedicated Level 1 Concourse FOB to Devipada Station. Zero street walking required.',
    indoorLevel: 'Level 1 Concourse / FOB',
  },
  {
    id: 'LM_INFINITI_MALL_MALAD',
    name: 'Infiniti Mall (Malad West)',
    aliases: [
      'infiniti mall',
      'infinity mall',
      'infiniti mall malad',
      'infinity mall malad',
      'infiniti malad',
      'infinity malad',
    ],
    category: 'MALL',
    coordinates: [72.83389, 19.18432],
    connectedStationCode: 'STN_L2A_011',
    connectedStationName: 'Malad (West)',
    connectedLineCode: 'L2A',
    connectedLineName: 'Line 2A (Yellow Line)',
    connectedLineColor: '#facc15',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Infiniti Mall Direct Concourse Plaza',
    walkDistanceMeters: 0,
    walkTimeSeconds: 0,
    corridorNote:
      'Located directly beneath Malad West station concourse. Direct concourse access.',
    indoorLevel: 'Level 1 Concourse',
  },
  {
    id: 'LM_GHATKOPAR_RAILWAY',
    name: 'Ghatkopar Railway Station',
    aliases: [
      'ghatkopar railway station',
      'ghatkopar station',
      'ghatkopar railway',
      'ghatkopar local',
      'ghatkopar suburban',
    ],
    category: 'TRANSIT_HUB',
    coordinates: [72.9079, 19.0862],
    connectedStationCode: 'STN_L1_012',
    connectedStationName: 'Ghatkopar',
    connectedLineCode: 'L1',
    connectedLineName: 'Line 1 (Blue Line)',
    connectedLineColor: '#3b82f6',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Central Railway Interchange FOB',
    walkDistanceMeters: 45,
    walkTimeSeconds: 45,
    corridorNote:
      'Connected via direct elevated FOB to Central Railway Platforms 1-4.',
    indoorLevel: 'Level 1 Concourse / FOB',
  },
  {
    id: 'LM_ANDHERI_RAILWAY',
    name: 'Andheri Railway Station',
    aliases: [
      'andheri railway station',
      'andheri station',
      'andheri railway',
      'andheri local',
    ],
    category: 'TRANSIT_HUB',
    coordinates: [72.8488, 19.1198],
    connectedStationCode: 'STN_L1_004',
    connectedStationName: 'Andheri',
    connectedLineCode: 'L1',
    connectedLineName: 'Line 1 (Blue Line)',
    connectedLineColor: '#3b82f6',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Western Railway Interchange Skywalk',
    walkDistanceMeters: 60,
    walkTimeSeconds: 60,
    corridorNote:
      'Connected via dedicated skywalk to Western Railway Platforms 1-9.',
    indoorLevel: 'Level 1 Concourse / FOB',
  },
  {
    id: 'LM_AIRPORT_T2',
    name: 'CSMIA Terminal 2 (International Airport)',
    aliases: [
      'mumbai airport t2',
      'csmi airport t2',
      'airport t2',
      'terminal 2',
      't2 airport',
      'mumbai international airport',
    ],
    category: 'AIRPORT',
    coordinates: [72.8744, 19.0974],
    connectedStationCode: 'STN_L3_006',
    connectedStationName: 'CSMI Airport T2',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Direct Terminal 2 Pedestrian Underpass',
    walkDistanceMeters: 0,
    walkTimeSeconds: 0,
    corridorNote:
      'Direct underground sub-surface passage into Terminal 2 Arrivals/Departures.',
    indoorLevel: 'Concourse Level -1',
  },
  {
    id: 'LM_AIRPORT_T1',
    name: 'CSMIA Terminal 1 (Domestic Airport)',
    aliases: [
      'mumbai airport t1',
      'csmi airport t1',
      'airport t1',
      'terminal 1',
      'domestic airport',
    ],
    category: 'AIRPORT',
    coordinates: [72.8533, 19.0886],
    connectedStationCode: 'STN_L3_007',
    connectedStationName: 'CSMI Airport T1',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Terminal 1 Pedestrian Subway',
    walkDistanceMeters: 0,
    walkTimeSeconds: 0,
    corridorNote: 'Direct pedestrian subway to Domestic Terminal 1.',
    indoorLevel: 'Concourse Level -1',
  },
  {
    id: 'LM_BKC_JIO',
    name: 'Jio World Centre & Diamond Bourse (BKC)',
    aliases: [
      'bkc',
      'jio world centre',
      'bandra kurla complex',
      'diamond bourse',
      'jio world convention centre',
      'bkc complex',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8643, 19.0625],
    connectedStationCode: 'STN_L3_010',
    connectedStationName: 'Bandra Kurla Complex',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'BKC Sub-surface Concourse Egress',
    walkDistanceMeters: 50,
    walkTimeSeconds: 45,
    corridorNote:
      'Concourse exit directly faces G-Block / Jio World Centre complex.',
    indoorLevel: 'Concourse Level -1',
  },
  {
    id: 'LM_NESCO',
    name: 'NESCO Exhibition Centre (Goregaon)',
    aliases: [
      'nesco',
      'nesco goregaon',
      'bombay exhibition centre',
      'nesco center',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8582, 19.155],
    connectedStationCode: 'STN_L7_009',
    connectedStationName: 'Goregaon (East)',
    connectedLineCode: 'L7',
    connectedLineName: 'Line 7 (Red Line)',
    connectedLineColor: '#ef4444',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'NESCO Direct Highway Footbridge',
    walkDistanceMeters: 50,
    walkTimeSeconds: 40,
    corridorNote:
      'Dedicated pedestrian walkway across WEH directly to NESCO Gate 1.',
    indoorLevel: 'Level 1 Concourse / FOB',
  },
  {
    id: 'LM_INORBIT_MALL',
    name: 'Inorbit Mall (Malad)',
    aliases: ['inorbit mall', 'inorbit malad', 'inorbit'],
    category: 'MALL',
    coordinates: [72.8354, 19.1738],
    connectedStationCode: 'STN_L2A_012',
    connectedStationName: 'Lower Malad',
    connectedLineCode: 'L2A',
    connectedLineName: 'Line 2A (Yellow Line)',
    connectedLineColor: '#facc15',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 120,
    walkTimeSeconds: 90,
    corridorNote: '120m walk via Gate 1 / Mindspace Link Road.',
    indoorLevel: 'Level 0 Street',
  },
  {
    id: 'LM_PHOENIX_MARKETCITY',
    name: 'Phoenix Marketcity (Kurla)',
    aliases: ['phoenix mall', 'phoenix marketcity', 'phoenix kurla'],
    category: 'MALL',
    coordinates: [72.8888, 19.0864],
    connectedStationCode: 'STN_L1_010',
    connectedStationName: 'Asalpha',
    connectedLineCode: 'L1',
    connectedLineName: 'Line 1 (Blue Line)',
    connectedLineColor: '#3b82f6',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 450,
    walkTimeSeconds: 350,
    corridorNote: 'Exit via Gate 2 to LBS Marg.',
    indoorLevel: 'Level 0 Street',
  },
  {
    id: 'LM_BALLARD_ESTATE',
    name: 'Ballard Estate',
    aliases: [
      'ballard estate',
      'ballard pier',
      'rbi fort',
      'horniman circle',
      'asiatic library',
      'mint road',
      'shaheed bhagat singh road',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8378, 18.9348],
    connectedStationCode: 'STN_L3_024',
    connectedStationName: 'Hutatma Chowk',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 300,
    walkTimeSeconds: 240,
    corridorNote:
      'Exit via Gate A4 towards Reserve Bank of India, Ballard Estate & Horniman Circle (~300m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_024_A4',
        gateName: 'Gate A4 (Reserve Bank of India & Ballard Estate)',
        stationCode: 'STN_L3_024',
        stationName: 'Hutatma Chowk',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 300,
        walkTimeSeconds: 240,
        corridorType: 'WALK',
        corridorNote:
          'Exit via Gate A4 towards Ballard Estate, RBI & Horniman Circle (~300m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_FLORA_FOUNTAIN',
    name: 'Flora Fountain',
    aliases: [
      'flora fountain',
      'fountain fort',
      'mg road fort',
      'fountain chowk',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8317, 18.9322],
    connectedStationCode: 'STN_L3_024',
    connectedStationName: 'Hutatma Chowk',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 60,
    walkTimeSeconds: 50,
    corridorNote:
      'Exit via Gate A1 towards Flora Fountain & MG Road (~60m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_024_A1',
        gateName: 'Gate A1 (Flora Fountain & Central Bank)',
        stationCode: 'STN_L3_024',
        stationName: 'Hutatma Chowk',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 60,
        walkTimeSeconds: 50,
        corridorType: 'WALK',
        corridorNote:
          'Exit via Gate A1 for Flora Fountain and MG Road promenade (~60m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_BOMBAY_HIGH_COURT',
    name: 'Bombay High Court',
    aliases: [
      'high court',
      'bombay high court',
      'mumbai high court',
      'oval maidan',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8301, 18.9304],
    connectedStationCode: 'STN_L3_024',
    connectedStationName: 'Hutatma Chowk',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 250,
    walkTimeSeconds: 180,
    corridorNote:
      'Exit via Gate A3 towards Bombay High Court & Oval Maidan (~250m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_024_A3',
        gateName: 'Gate A3 (Bombay High Court & Oval Maidan)',
        stationCode: 'STN_L3_024',
        stationName: 'Hutatma Chowk',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 250,
        walkTimeSeconds: 180,
        corridorType: 'WALK',
        corridorNote:
          'Exit via Gate A3 for Bombay High Court & University of Mumbai (~250m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_CRAWFORD_MARKET',
    name: 'Crawford Market',
    aliases: [
      'crawford market',
      'crawford',
      'manish market',
      'phule mandai',
      'crockery market',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8344, 18.9472],
    connectedStationCode: 'STN_L3_023',
    connectedStationName: 'CSMT Metro',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 220,
    walkTimeSeconds: 160,
    corridorNote:
      'Exit via Gate B1 for Crawford Market & Manish Market (~220m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_023_B1',
        gateName: 'Gate B1 (Crawford Market & Manish Market)',
        stationCode: 'STN_L3_023',
        stationName: 'CSMT Metro',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 220,
        walkTimeSeconds: 160,
        corridorType: 'WALK',
        corridorNote:
          'Direct pedestrian exit to Crawford Market & Manish Market (~220m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_MANTRALAYA',
    name: 'Mantralaya & Vidhan Bhavan',
    aliases: [
      'mantralaya',
      'vidhan bhavan',
      'state assembly',
      'secretariat',
      'nariman point',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8258, 18.9275],
    connectedStationCode: 'STN_L3_026',
    connectedStationName: 'Vidhan Bhawan',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 170,
    walkTimeSeconds: 130,
    corridorNote:
      'Exit via Gate B1 for Vidhan Bhavan & Mantralaya (~170m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_026_B1',
        gateName: 'Gate B1 (Mantralaya & Vidhan Bhavan)',
        stationCode: 'STN_L3_026',
        stationName: 'Vidhan Bhawan',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 170,
        walkTimeSeconds: 130,
        corridorType: 'WALK',
        corridorNote:
          'Exit via Gate B1 for Vidhan Bhavan & Mantralaya Main Gate (~170m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_SIDDHIVINAYAK_TEMPLE',
    name: 'Shree Siddhivinayak Temple',
    aliases: [
      'siddhivinayak temple',
      'siddhivinayak',
      'siddhi vinayak',
      'prabhadevi temple',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8311, 19.0169],
    connectedStationCode: 'STN_L3_014',
    connectedStationName: 'Siddhivinayak',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: false,
    hasDirectAccess: false,
    walkDistanceMeters: 60,
    walkTimeSeconds: 45,
    corridorNote:
      'Exit via Gate B2 for direct access to Shree Siddhivinayak Temple (~60m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_014_B2',
        gateName: 'Gate B2 (Shree Siddhivinayak Temple)',
        stationCode: 'STN_L3_014',
        stationName: 'Siddhivinayak',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 60,
        walkTimeSeconds: 45,
        corridorType: 'WALK',
        corridorNote:
          'Direct pedestrian plaza exit leading directly to Shree Siddhivinayak Temple (~60m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_KAMALA_MILLS',
    name: 'Kamala Mills Compound',
    aliases: [
      'kamala mills',
      'kamala mills compound',
      'high street phoenix',
      'palladium mall',
      'lower parel mills',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8285, 19.0062],
    connectedStationCode: 'STN_L3_015',
    connectedStationName: 'Worli',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Kamala Mills Direct Pedestrian Link',
    walkDistanceMeters: 150,
    walkTimeSeconds: 100,
    corridorNote:
      'Exit via Gate A2 towards Kamala Mills Compound & Lower Parel (~150m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_015_A2',
        gateName: 'Gate A2 (Kamala Mills Compound)',
        stationCode: 'STN_L3_015',
        stationName: 'Worli',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 150,
        walkTimeSeconds: 100,
        corridorType: 'FOB',
        corridorNote:
          'Direct pedestrian exit towards Kamala Mills Compound & Lower Parel (~150m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
  {
    id: 'LM_WORLD_TRADE_CENTRE',
    name: 'World Trade Centre (Cuffe Parade)',
    aliases: [
      'world trade centre',
      'wtc',
      'wtc mumbai',
      'idbi tower',
      'maker arcade',
      'cuffe parade',
    ],
    category: 'COMMERCIAL',
    coordinates: [72.8184, 18.9142],
    connectedStationCode: 'STN_L3_027',
    connectedStationName: 'Cuffe Parade',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'World Trade Centre Direct Plaza',
    walkDistanceMeters: 100,
    walkTimeSeconds: 70,
    corridorNote:
      'Exit via Gate A1 for World Trade Centre & IDBI Tower (~100m walk).',
    indoorLevel: 'Level 0 Street',
    accessGates: [
      {
        gateId: 'ENT_STN_L3_027_A1',
        gateName: 'Gate A1 (World Trade Centre & IDBI Tower)',
        stationCode: 'STN_L3_027',
        stationName: 'Cuffe Parade',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 100,
        walkTimeSeconds: 70,
        corridorType: 'FOB',
        corridorNote:
          'Direct exit to World Trade Centre Mumbai & IDBI Tower (~100m walk).',
        indoorLevel: 'Concourse to Street',
      },
    ],
  },
];

export class LandmarkRegistry {
  static getAll(): LandmarkRecord[] {
    return LANDMARK_REGISTRY;
  }

  static getAccessGates(lm: LandmarkRecord): LandmarkAccessGate[] {
    if (lm.accessGates && lm.accessGates.length > 0) {
      return lm.accessGates;
    }
    return [
      {
        gateId: 'MAIN_GATE',
        gateName: lm.directFobName || `${lm.name} Access`,
        stationCode: lm.connectedStationCode,
        stationName: lm.connectedStationName,
        lineCode: lm.connectedLineCode,
        lineName: lm.connectedLineName,
        lineColor: lm.connectedLineColor,
        walkDistanceMeters: lm.walkDistanceMeters,
        walkTimeSeconds: lm.walkTimeSeconds,
        corridorType: lm.hasDirectFob ? 'FOB' : 'WALK',
        corridorNote: lm.corridorNote,
        indoorLevel: lm.indoorLevel,
      },
    ];
  }

  static findById(id: string): LandmarkRecord | undefined {
    return LANDMARK_REGISTRY.find(
      (l) => l.id.toLowerCase() === id.toLowerCase(),
    );
  }

  static findByNameOrAlias(query: string): LandmarkRecord | undefined {
    const q = query.trim().toLowerCase();
    return LANDMARK_REGISTRY.find(
      (l) =>
        l.id.toLowerCase() === q ||
        l.name.toLowerCase() === q ||
        l.aliases.some((a) => a === q || q.includes(a) || a.includes(q)),
    );
  }

  static search(query: string): LandmarkRecord[] {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    return LANDMARK_REGISTRY.filter((l) => {
      if (l.name.toLowerCase().includes(q)) return true;
      if (l.connectedStationName.toLowerCase().includes(q)) return true;
      return l.aliases.some((alias) => alias.includes(q) || q.includes(alias));
    });
  }

  /**
   * Snaps a GPS coordinate [lon, lat] to the nearest registered landmark if within threshold.
   */
  static snapCoordinateToLandmark(
    lon: number,
    lat: number,
    maxDistanceMeters = 350,
  ): LandmarkRecord | null {
    let closest: LandmarkRecord | null = null;
    let minDistance = Infinity;

    for (const lm of LANDMARK_REGISTRY) {
      const d = LandmarkRegistry.distanceMeters(
        lat,
        lon,
        lm.coordinates[1],
        lm.coordinates[0],
      );
      if (d <= maxDistanceMeters && d < minDistance) {
        minDistance = d;
        closest = lm;
      }
    }

    return closest;
  }

  /**
   * Haversine distance formula in meters
   */
  static distanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}
