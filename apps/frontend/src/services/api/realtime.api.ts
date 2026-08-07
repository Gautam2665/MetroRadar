import { ApiClient, ApiResult } from "./client";
import { RealtimeVehicle, toVehicleModel } from "../../models/vehicle";

export class RealtimeApi {
  static async getRealtimeVehicles(system: string): Promise<ApiResult<RealtimeVehicle[]>> {
    const res = await ApiClient.get<Record<string, unknown>>(`/realtime/vehicles?system=${encodeURIComponent(system)}`);
    if (!res.success) {
      return { success: true, data: [] };
    }
    const rawList = Array.isArray(res.data)
      ? res.data
      : (res.data && typeof res.data === "object" && "vehicles" in res.data && Array.isArray((res.data as Record<string, unknown>).vehicles))
      ? ((res.data as Record<string, unknown>).vehicles as Record<string, unknown>[])
      : [];
    const vehicles = rawList.map((v: Record<string, unknown>, idx: number) => toVehicleModel(v, idx));
    return { success: true, data: vehicles };
  }
}
