export interface SystemCapabilities {
  static: boolean;
  realtimeOfficial: boolean;
  realtimeEstimated: boolean;
  fare: boolean;
  accessibility: boolean;
  indoor: boolean;
  commercial: boolean;
  tdse: boolean;
}

export interface CapabilityRegistryEntry {
  systemCode: string;
  cityName: string;
  sourceType: 'OFFICIAL' | 'COMMUNITY' | 'SYNTHESIZED' | 'TRANSITOS_GENERATED';
  trustTier: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_X';
  badgeTier: 'Gold' | 'Silver' | 'Bronze' | 'Uncertified';
  capabilities: SystemCapabilities;
}

export const NATIONAL_CAPABILITY_REGISTRY: Record<string, CapabilityRegistryEntry> = {
  DMRC: {
    systemCode: 'DMRC',
    cityName: 'Delhi-NCR',
    sourceType: 'OFFICIAL',
    trustTier: 'TIER_A',
    badgeTier: 'Gold',
    capabilities: {
      static: true,
      realtimeOfficial: false,
      realtimeEstimated: true,
      fare: true,
      accessibility: true,
      indoor: true,
      commercial: true,
      tdse: false,
    },
  },
  KMRL: {
    systemCode: 'KMRL',
    cityName: 'Kochi',
    sourceType: 'OFFICIAL',
    trustTier: 'TIER_A',
    badgeTier: 'Gold',
    capabilities: {
      static: true,
      realtimeOfficial: false,
      realtimeEstimated: true,
      fare: true,
      accessibility: true,
      indoor: true,
      commercial: false,
      tdse: false,
    },
  },
  HMRL: {
    systemCode: 'HMRL',
    cityName: 'Hyderabad',
    sourceType: 'OFFICIAL',
    trustTier: 'TIER_A',
    badgeTier: 'Gold',
    capabilities: {
      static: true,
      realtimeOfficial: false,
      realtimeEstimated: true,
      fare: true,
      accessibility: true,
      indoor: false,
      commercial: false,
      tdse: false,
    },
  },
  BMRCL: {
    systemCode: 'BMRCL',
    cityName: 'Bengaluru',
    sourceType: 'COMMUNITY',
    trustTier: 'TIER_B',
    badgeTier: 'Silver',
    capabilities: {
      static: true,
      realtimeOfficial: false,
      realtimeEstimated: true,
      fare: false,
      accessibility: false,
      indoor: false,
      commercial: false,
      tdse: true,
    },
  },
  CMRL: {
    systemCode: 'CMRL',
    cityName: 'Chennai',
    sourceType: 'COMMUNITY',
    trustTier: 'TIER_B',
    badgeTier: 'Silver',
    capabilities: {
      static: true,
      realtimeOfficial: false,
      realtimeEstimated: true,
      fare: false,
      accessibility: false,
      indoor: false,
      commercial: false,
      tdse: true,
    },
  },
  GMRC: {
    systemCode: 'GMRC',
    cityName: 'Ahmedabad',
    sourceType: 'COMMUNITY',
    trustTier: 'TIER_B',
    badgeTier: 'Silver',
    capabilities: {
      static: true,
      realtimeOfficial: false,
      realtimeEstimated: true,
      fare: false,
      accessibility: false,
      indoor: false,
      commercial: false,
      tdse: true,
    },
  },
  MMRDA: {
    systemCode: 'MMRDA',
    cityName: 'Mumbai',
    sourceType: 'SYNTHESIZED',
    trustTier: 'TIER_X',
    badgeTier: 'Uncertified',
    capabilities: {
      static: false,
      realtimeOfficial: false,
      realtimeEstimated: false,
      fare: false,
      accessibility: false,
      indoor: false,
      commercial: false,
      tdse: true,
    },
  },
};
