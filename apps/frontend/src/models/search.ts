export interface PlaceSuggestion {
  id: string;
  name: string; // Bold title: "Jio World Garden"
  address: string; // Subtitle address: "Bandra Kurla Complex, G Block, Bandra East"
  nearestStation?: {
    id?: string;
    name: string; // "BKC Metro Station"
    lineName: string; // "Aqua Line 3"
    lineColor: string; // "#00b5ad"
    walkDistance?: string; // "900m" or "10 min walk"
  };
  type: "station" | "poi" | "address";
  rawStationId?: string;
  lat?: number;
  lng?: number;
  code?: string;
  lines?: Array<{ code: string; name: string; color: string }>;
}
