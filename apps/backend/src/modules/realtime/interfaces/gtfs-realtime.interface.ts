export interface NormalizedVehicle {
  vehicleId: string;
  tripId: string | null;
  routeId: string | null;
  latitude: number;
  longitude: number;
  bearing: number | null;
  speed: number | null;
  currentStopSequence: number | null;
  currentStatus: string | null;
  timestamp: number | null;
  // Enriched fields (added by RealtimeService from DB)
  lineName?: string | null;
  lineColor?: string | null;
  nextStationName?: string | null;
}

export interface RealtimeMetadata {
  provider: string;
  system: string;
  generatedAt: string;
  cachedAt: string | null;
  isStale: boolean;
  staleAgeSeconds: number;
  vehicleCount: number;
}

export interface RealtimeFeedResponse {
  system: string;
  provider: string;
  generatedAt: string;
  cachedAt: string | null;
  isStale: boolean;
  staleAgeSeconds: number;
  vehicleCount: number;
  vehicles: NormalizedVehicle[];
}

export interface CachedVehiclePayload {
  vehicles: NormalizedVehicle[];
  cachedAt: string; // ISO timestamp
}
