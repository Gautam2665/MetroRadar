import { ApiClient, ApiResult } from "./client";
import { JourneyPlan, toJourneyModel } from "../../models/journey";

export class JourneyApi {
  static async planJourney(
    from: string,
    to: string,
    system: string,
    mode: "metro" | "multimodal"
  ): Promise<ApiResult<JourneyPlan>> {
    const endpoint = `/journeys?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&system=${encodeURIComponent(system)}&mode=${encodeURIComponent(mode)}`;
    const res = await ApiClient.get<any>(endpoint);
    if (!res.success) {
      return { success: true, data: toJourneyModel(null, from, to, mode) };
    }
    return { success: true, data: toJourneyModel(res.data, from, to, mode) };
  }
}
