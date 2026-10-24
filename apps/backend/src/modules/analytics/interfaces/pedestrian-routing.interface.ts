export interface PedestrianRouteStep {
  stepIndex: number;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  highwayType: string;
  surface: string | null;
  isElevatedFob: boolean;
  isCrossing: boolean;
  hasTactilePaving: boolean;
  level: string | null;
  sourceType: string;
  startCoordinate: [number, number]; // [lon, lat]
  endCoordinate: [number, number];
}

export interface PedestrianRouteProvenance {
  sourceTypes: string[];
  confidenceScore: number;
  containsProvisionalSegments: boolean;
  hasOfficialOsmSegments: boolean;
  notes: string[];
  validationDate: string;
}

export interface PedestrianRouteResult {
  status:
    'SUCCESS' | 'NO_PATH_FOUND' | 'DISCONNECTED_GRAPH' | 'ENTRANCE_NOT_FOUND';
  originEntrance?: {
    id: string;
    name: string;
    stationName: string;
    latitude: number;
    longitude: number;
    snapDistanceMeters: number;
  };
  destinationEntrance?: {
    id: string;
    name: string;
    stationName: string;
    latitude: number;
    longitude: number;
    snapDistanceMeters: number;
  };
  distanceMeters: number;
  walkDurationSeconds: number;
  transitionDurationSeconds: number;
  totalDurationSeconds: number;
  geometry: {
    type: 'LineString';
    coordinates: number[][]; // [[lon, lat], ...]
  } | null;
  steps: PedestrianRouteStep[];
  provenance: PedestrianRouteProvenance;
  errorMessage?: string;
}

export interface PedestrianRouteOptions {
  allowProvisional?: boolean;
  maxSnapDistanceMeters?: number;
  walkingSpeedMs?: number;
}
