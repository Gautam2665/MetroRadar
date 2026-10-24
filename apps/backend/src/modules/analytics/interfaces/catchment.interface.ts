export interface CatchmentIsochrone {
  minutes: number;
  seconds: number;
  reachedEdgesCount: number;
  walkableNetworkLengthKm: number;
  networkAreaSqKm: number;
  euclideanRadiusMeters: number;
  euclideanAreaSqKm: number;
  severanceRatio: number;
  dataCompleteness?: 'VALIDATED_URBAN_GRID' | 'LOCAL_STATION_ENVELOPE_ONLY';
  densityKmPerSqKm?: number;
  polygonGeoJson: Record<string, unknown> | null;
  reachedEdgesGeoJson?: Record<string, unknown> | null;
}

export interface StationCatchmentResult {
  station: {
    id: string;
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    activeEntrancesCount: number;
    connectedEntrancesCount?: number;
    connectivityPercent?: number;
    entrances: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      snappedNodeId: string | null;
      snapDistanceMeters: number | null;
      isConnected?: boolean;
      reachableNodesCount?: number;
      level?: string;
    }>;
  };
  metadata: {
    pedestrianSpeedMs: number;
    impedanceModel: string;
    bufferWidthMeters: number;
    algorithm: string;
    calculationTimestamp: string;
  };
  isochrones: CatchmentIsochrone[];
}

export interface PedestrianEdgeFeature {
  type: 'Feature';
  geometry: Record<string, unknown>;
  properties: {
    id: string;
    osmId: string | null;
    highwayType: string;
    surface: string | null;
    lengthMeters: number;
    traversalTimeSeconds: number;
    isCrossing: boolean;
    isElevatedFob: boolean;
    hasTactilePaving: boolean;
    lit: boolean | null;
    sourceType?: string;
    studyArea?: string | null;
    isProvisional?: boolean;
    confidence?: number;
    level?: string | null;
  };
}

export interface PedestrianNetworkGeoJson {
  type: 'FeatureCollection';
  features: PedestrianEdgeFeature[];
  metadata: {
    totalEdges: number;
    totalLengthKm: number;
    elevatedFobCount: number;
    crossingsCount: number;
  };
}
