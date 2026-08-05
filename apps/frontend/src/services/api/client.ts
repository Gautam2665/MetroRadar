import { API_CONFIG } from "./config";

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export class ApiClient {
  static async get<T>(endpoint: string): Promise<ApiResult<T>> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_CONFIG.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { success: true, data: data as T };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        success: false,
        error: err.name === "AbortError" ? "Request timed out" : err.message || "Network request failed",
      };
    }
  }

  static async post<T>(endpoint: string, body: any): Promise<ApiResult<T>> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_CONFIG.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return { success: true, data: data as T };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        success: false,
        error: err.name === "AbortError" ? "Request timed out" : err.message || "Network request failed",
      };
    }
  }
}
