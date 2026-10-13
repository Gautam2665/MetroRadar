import { ApiClient, ApiResult } from "./client";
import { Station, StationDto, toStationModel } from "../../models/station";
import { DigitalTwin, toDigitalTwinModel } from "../../models/digitalTwin";
import { PlaceSuggestion } from "../../models/search";

/** Lightweight search result — what the search index returns */
export interface StationSearchResult {
  id: string;
  stationId?: string;
  name: string;
  address?: string;
  code: string;
  city: string;
  systemId: string;
  lines: Array<{ code: string; name: string; color: string }>;
  lat: number;
  lng: number;
  isLandmark?: boolean;
  type?: "station" | "poi" | "address";
  nearestStation?: {
    id?: string;
    name: string;
    lineName: string;
    lineColor: string;
    walkDistance?: string;
  };
  landmarkDetails?: Record<string, unknown>;
}

export function toPlaceSuggestion(s: StationSearchResult): PlaceSuggestion {
  let cleanName = s.name;
  let address = s.address || "";
  let nearestStation = s.nearestStation;

  // Clean any legacy parenthetical string format e.g. "Oberoi Mall (Nearest Metro: Aarey · ~546m)"
  const match = cleanName.match(
    /^(.*?)\s*\((?:Nearest Metro:\s*([^·)]+)(?:·\s*~?(\d+m?))?|Direct FOB to ([^)]+))\)$/i
  );
  if (match) {
    cleanName = match[1].trim();
    const stnName = (match[2] || match[4] || "").trim();
    const dist = match[3] || (match[4] ? "Direct FOB" : "");
    if (!nearestStation && stnName) {
      const primaryLine = s.lines?.[0];
      nearestStation = {
        name: stnName,
        lineName: primaryLine?.name || "Metro Line",
        lineColor: primaryLine?.color || "#00E5FF",
        walkDistance: dist || undefined,
      };
    }
  }

  if (!address) {
    if (s.isLandmark) {
      address = s.city ? `${s.city.toUpperCase()}, MH` : "Mumbai, Maharashtra";
    } else {
      const lineNames = s.lines?.map((l) => l.name).filter(Boolean).join(" • ") || "Mumbai Metro";
      address = `${lineNames} • Platform & Concourse`;
    }
  }

  return {
    id: s.id,
    name: cleanName,
    address,
    nearestStation,
    type: s.isLandmark ? "poi" : "station",
    rawStationId: s.stationId || s.id,
    code: s.code,
    lines: s.lines,
    lat: s.lat,
    lng: s.lng,
  };
}

function normalizeNameKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function parseSearchFeatures(data: Record<string, unknown> | null | undefined): StationSearchResult[] {
  if (!data || !Array.isArray(data.features)) return [];
  const feats = data.features as Record<string, unknown>[];
  const results: StationSearchResult[] = [];

  for (const f of feats) {
    const props = (f.properties || {}) as Record<string, unknown>;
    const featureType = (props.type as string) || "station";
    if (
      featureType !== "station" &&
      featureType !== "poi" &&
      featureType !== "address" &&
      !props.id
    ) {
      continue;
    }
    if (!props.id) continue;

    const name = ((props.name as string) || "").trim();
    const code = (props.code as string) || "STN";
    const address = (props.address as string) || "";
    const nearestStation = props.nearestStation as StationSearchResult["nearestStation"] | undefined;
    const normKey = normalizeNameKey(name);

    const geom = (f.geometry || {}) as { coordinates?: [number, number] };
    const lines: Array<{ code: string; name: string; color: string }> = Array.isArray(props.lines)
      ? (props.lines as Record<string, unknown>[])
          .filter((l) => l.name)
          .map((l) => ({
            code: (l.code as string) || "",
            name: (l.name as string) || "",
            color: (l.color as string) || "",
          }))
      : [];

    // If a station with this normalized name already exists, merge lines dynamically
    const existing = results.find((r) => normalizeNameKey(r.name) === normKey);
    if (existing) {
      for (const l of lines) {
        if (!existing.lines.some((el) => el.code === l.code || el.name.toLowerCase() === l.name.toLowerCase())) {
          existing.lines.push(l);
        }
      }
      continue;
    }

    const uniqueId = (f.id as string) || `${props.id as string}-${normKey}`;
    results.push({
      id: uniqueId,
      stationId: props.id as string,
      name: name || "Station",
      address,
      code,
      city: ((props.city as string) || "").toLowerCase(),
      systemId: (props.systemId as string) || "",
      lines,
      lat: geom.coordinates?.[1] ?? 0,
      lng: geom.coordinates?.[0] ?? 0,
      isLandmark: Boolean(props.isLandmark),
      type: (props.type as "station" | "poi" | "address") || (props.isLandmark ? "poi" : "station"),
      nearestStation,
      landmarkDetails: props.landmarkDetails as Record<string, unknown> | undefined,
    });
  }

  return results;
}

export class StationApi {
  static async getStations(system: string): Promise<ApiResult<Station[]>> {
    const res = await ApiClient.get<Record<string, unknown>>(`/map/stations`);
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
            city: (props.city as string) || "",
            systemId: (props.systemId as string) || "",
            lat: geom.coordinates?.[1],
            lng: geom.coordinates?.[0],
            lines: (props.lines as any[]) || [],
            lineInfrastructure: (props.lineInfrastructure as any[]) || [],
            system,
          };
        })
      : Array.isArray(res.data)
      ? (res.data as StationDto[])
      : [];

    let stations = rawList.map(toStationModel);

    // Filter by system or city if provided
    if (system) {
      const sysLower = system.toLowerCase().trim();
      stations = stations.filter((st) => {
        const cityMatch = st.city && st.city.toLowerCase().includes(sysLower);
        const sysIdMatch = st.systemId && st.systemId.toLowerCase().includes(sysLower);
        const nameMatch = sysLower === "mumbai" && (st.city.toLowerCase().includes("mumbai") || st.systemId.toLowerCase().includes("mm"));
        return cityMatch || sysIdMatch || nameMatch;
      });
    }

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

  static async getLines(): Promise<ApiResult<MetroLineDto[]>> {
    const res = await ApiClient.get<Record<string, unknown>>('/map/lines');
    if (!res.success || !res.data) {
      return { success: true, data: [] };
    }
    const rawList: MetroLineDto[] = Array.isArray(res.data.features)
      ? (res.data.features as Record<string, unknown>[]).map((f) => {
          const props = (f.properties || {}) as Record<string, unknown>;
          const geom = (f.geometry || {}) as { coordinates?: [number, number][] };
          return {
            id: (props.id as string) || (f.id as string),
            code: (props.code as string) || "",
            name: (props.name as string) || "Line",
            color: (props.color as string) || "#00E5FF",
            systemId: (props.systemId as string) || "",
            coordinates: geom.coordinates || [],
          };
        })
      : [];
    return { success: true, data: rawList };
  }
}

export interface MetroLineDto {
  id: string;
  code: string;
  name: string;
  color: string;
  systemId: string;
  coordinates?: [number, number][];
}
