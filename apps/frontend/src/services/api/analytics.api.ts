import { ApiClient, ApiResult } from "./client";

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

export interface PedestrianNetworkGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
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
      sourceType?: string;
      studyArea?: string | null;
      isProvisional?: boolean;
      confidence?: number;
      level?: string | null;
    };
  }>;
  metadata: {
    totalEdges: number;
    totalLengthKm: number;
    elevatedFobCount: number;
    crossingsCount: number;
  };
}

export interface DatasetAuditReport {
  system: {
    name: string;
    city: string;
    canonicalModelVersion: string;
    overallStatus: string;
    dataCompletenessScore: number;
  };
  pedestrianNetwork: {
    source: string;
    filterCriteria: string;
    totalWalkableEdges: number;
    totalNetworkLengthKm: number;
    traversalSpeedStandardMs: number;
    elevatedFobCount: number;
    crossingsCount: number;
    surfaceBreakdown: Record<string, number>;
    impedanceModel: string;
  };
  entranceSnappingAudit: {
    totalActiveEntrances: number;
    snappedWithin100m: number;
    snapSuccessRatePercent: number;
    unsnappedEntrances: any[];
  };
  governanceSummary: {
    tierAOfficialPercent: number;
    tierSynthesizedPercent: number;
    gtfsQualityCheck: string;
    pedestrianConnectivityStatus: string;
  };
}

export class AnalyticsApi {
  static async getStationCatchment(
    stationId: string,
    minutes: number[] = [5, 10]
  ): Promise<ApiResult<StationCatchmentResult>> {
    const minParam = minutes.join(",");
    return ApiClient.get<StationCatchmentResult>(
      `/api/v1/analytics/stations/${encodeURIComponent(stationId)}/catchment?minutes=${minParam}`
    );
  }

  static async getPedestrianNetwork(
    bbox?: string
  ): Promise<ApiResult<PedestrianNetworkGeoJson>> {
    const query = bbox ? `?bbox=${encodeURIComponent(bbox)}` : "";
    return ApiClient.get<PedestrianNetworkGeoJson>(
      `/api/v1/analytics/pedestrian-network${query}`
    );
  }

  static async getDatasetAudit(): Promise<ApiResult<DatasetAuditReport>> {
    return ApiClient.get<DatasetAuditReport>("/api/v1/datasets/audit");
  }
}
