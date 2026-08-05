import { ApiClient, ApiResult } from "./client";
import { Station, StationDto, toStationModel } from "../../models/station";
import { DigitalTwin, toDigitalTwinModel } from "../../models/digitalTwin";

export class StationApi {
  static async getStations(system: string): Promise<ApiResult<Station[]>> {
    const res = await ApiClient.get<any>(`/map/stations?system=${encodeURIComponent(system)}`);
    if (!res.success) {
      return res;
    }
    const rawList: StationDto[] = res.data?.features
      ? res.data.features.map((f: any) => ({
          id: f.properties?.id || f.id,
          name: f.properties?.name || "Station",
          code: f.properties?.code,
          lat: f.geometry?.coordinates?.[1],
          lng: f.geometry?.coordinates?.[0],
          lines: f.properties?.lines || ["Red Line"],
          system,
        }))
      : Array.isArray(res.data)
      ? res.data
      : [];

    const stations = rawList.map(toStationModel);
    return { success: true, data: stations };
  }

  static async getDigitalTwin(stationId: string, defaultName: string = "Station"): Promise<ApiResult<DigitalTwin>> {
    const res = await ApiClient.get<any>(`/stations/${encodeURIComponent(stationId)}/digital-twin`);
    if (!res.success) {
      // Fallback adapter mode
      return { success: true, data: toDigitalTwinModel(null, stationId, defaultName) };
    }
    return { success: true, data: toDigitalTwinModel(res.data, stationId, defaultName) };
  }
}
