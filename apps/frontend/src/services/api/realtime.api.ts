import { ApiClient, ApiResult } from "./client";
import { RealtimeVehicle, toVehicleModel } from "../../models/vehicle";

export class RealtimeApi {
  static async getRealtimeVehicles(system: string): Promise<ApiResult<RealtimeVehicle[]>> {
    const res = await ApiClient.get<any>(`/realtime/vehicles?system=${encodeURIComponent(system)}`);
    if (!res.success) {
      return { success: true, data: [] };
    }
    const rawList = Array.isArray(res.data) ? res.data : res.data?.vehicles || [];
    const vehicles = rawList.map(toVehicleModel);
    return { success: true, data: vehicles };
  }
}
