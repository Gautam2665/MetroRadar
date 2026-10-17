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
    id: 'LM_BKC_BULLET_TRAIN',
    name: 'BKC Bullet Train Terminal (MAHSR)',
    aliases: [
      'bkc bullet train',
      'bullet train terminal',
      'mahsr bkc',
      'bullet train',
      'bkc mahsr',
      'mumbai ahmedabad bullet train',
      'mahsr terminal',
      'bkc high speed rail',
    ],
    category: 'TRANSIT_HUB',
    coordinates: [72.8643, 19.0625],
    connectedStationCode: 'STN_L3_010',
    connectedStationName: 'Bandra Kurla Complex',
    connectedLineCode: 'L3',
    connectedLineName: 'Line 3 (Aqua Line)',
    connectedLineColor: '#06b6d4',
    hasDirectFob: true,
    hasDirectAccess: true,
    directFobName: 'Subterranean Travelator & Concourse Connector',
    walkDistanceMeters: 50,
    walkTimeSeconds: 60,
    corridorNote:
      'Direct dual-gate attachment: Gate A connects to Line 2B (50m elevated walk); Gate B connects to Line 3 (700m underground travelator subway).',
    indoorLevel: 'Concourse Level -1',
    accessGates: [
      {
        gateId: 'GATE_A',
        gateName: 'Entrance Gate A (North Concourse)',
        stationCode: 'STN_L2B_BKC',
        stationName: 'BKC (Line 2B)',
        lineCode: 'L2B',
        lineName: 'Line 2B (Yellow Line)',
        lineColor: '#facc15',
        walkDistanceMeters: 50,
        walkTimeSeconds: 60,
        corridorType: 'WALK',
        corridorNote:
          'Entrance Gate A — direct 50m elevated concourse walk to Line 2B elevated station.',
        indoorLevel: 'Level 1 Concourse',
      },
      {
        gateId: 'GATE_B',
        gateName: 'Entrance Gate B (South Underpass)',
        stationCode: 'STN_L3_010',
        stationName: 'Bandra Kurla Complex (Line 3)',
        lineCode: 'L3',
        lineName: 'Line 3 (Aqua Line)',
        lineColor: '#06b6d4',
        walkDistanceMeters: 700,
        walkTimeSeconds: 420,
        corridorType: 'TRAVELATOR',
        corridorNote:
          'Entrance Gate B — 700m climate-controlled underground subway with moving walkway (travelator) directly to Line 3 Aqua Line concourse.',
        indoorLevel: 'Concourse Level -1',
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
