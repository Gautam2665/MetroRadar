export interface CatchmentIsochrone {
  minutes: number;
  seconds: number;
  reachedEdgesCount: number;
  walkableNetworkLengthKm: number;
  networkAreaSqKm: number;
  euclideanRadiusMeters: number;
  euclideanAreaSqKm: number;
  severanceRatio: number;
  polygonGeoJson: any | null;
  reachedEdgesGeoJson?: any | null;
}

export interface StationCatchmentResult {
  station: {
    id: string;
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    activeEntrancesCount: number;
    entrances: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      snappedNodeId: string | null;
      snapDistanceMeters: number | null;
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
  geometry: any;
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
