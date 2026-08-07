import { ApiClient, ApiResult } from "./client";
import { Station, StationDto, toStationModel } from "../../models/station";
import { DigitalTwin, toDigitalTwinModel } from "../../models/digitalTwin";

/** Lightweight search result — what the search index returns */
export interface StationSearchResult {
  id: string;
  name: string;
  code: string;
  city: string;
  systemId: string;
  lines: Array<{ code: string; name: string; color: string }>;
  lat: number;
  lng: number;
}

function parseSearchFeatures(data: Record<string, unknown> | null | undefined): StationSearchResult[] {
  if (!data || !Array.isArray(data.features)) return [];
  const feats = data.features as Record<string, unknown>[];
  return feats
    .filter((f) => {
      const props = f.properties as Record<string, unknown> | undefined;
      return props?.type === "station" && props?.id;
    })
    .map((f) => {
      const p = (f.properties || {}) as Record<string, unknown>;
      const geom = (f.geometry || {}) as { coordinates?: [number, number] };
      const lines: Array<{ code: string; name: string; color: string }> = Array.isArray(p.lines)
        ? (p.lines as Record<string, unknown>[]).filter((l) => l.name).map((l) => ({
            code: (l.code as string) || "",
            name: (l.name as string) || "",
            color: (l.color as string) || "",
          }))
        : [];
      return {
        id: p.id as string,
        name: (p.name as string) || "Station",
        code: (p.code as string) || "STN",
        city: ((p.city as string) || "").toLowerCase(),
        systemId: (p.systemId as string) || "",
        lines,
        lat: geom.coordinates?.[1] ?? 0,
        lng: geom.coordinates?.[0] ?? 0,
      } as StationSearchResult;
    });
}

export class StationApi {
  static async getStations(system: string): Promise<ApiResult<Station[]>> {
    const res = await ApiClient.get<Record<string, unknown>>(`/map/stations?system=${encodeURIComponent(system)}`);
    if (!res.success) {
      return res;
    }
    const rawList: StationDto[] = Array.isArray(res.data?.features)
      ? (res.data.features as Record<string, unknown>[]).map((f) => {
          const props = (f.properties || {}) as Record<string, unknown>;
          const geom = (f.geometry || {}) as { coordinates?: [number, number] };
          return {
            id: (props.id as string) || (f.id as string),
            name: (props.name as string) || "Station",
            code: props.code as string | undefined,
            lat: geom.coordinates?.[1],
            lng: geom.coordinates?.[0],
            lines: (props.lines as string[]) || [],
            system,
          };
        })
      : Array.isArray(res.data)
      ? (res.data as StationDto[])
      : [];

    const stations = rawList.map(toStationModel);
    return { success: true, data: stations };
  }

  /**
   * Live station search from backend search index.
   * Requires minimum 2 characters. Optionally filter by city name.
   */
  static async searchStations(
    query: string,
    city?: string
  ): Promise<ApiResult<StationSearchResult[]>> {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }
    const res = await ApiClient.get<Record<string, unknown>>(
      `/map/search?q=${encodeURIComponent(query.trim())}&type=station`
    );
    if (!res.success) {
      return { success: true, data: [] }; // Graceful degradation — don't surface search errors
    }
    let results = parseSearchFeatures(res.data);
    // Filter by city if provided
    if (city) {
      const cityLower = city.toLowerCase();
      results = results.filter((s) => !s.city || s.city.includes(cityLower));
    }
    return { success: true, data: results };
  }

  static async getDigitalTwin(stationId: string, defaultName: string = "Station"): Promise<ApiResult<DigitalTwin>> {
    const res = await ApiClient.get<Record<string, unknown>>(`/stations/${encodeURIComponent(stationId)}/digital-twin`);
    if (!res.success) {
      return { success: true, data: toDigitalTwinModel(null, stationId, defaultName) };
    }
    return { success: true, data: toDigitalTwinModel(res.data, stationId, defaultName) };
  }
}
