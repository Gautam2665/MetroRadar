export interface RealtimeVehicle {
  id: string;
  lineId: string;
  lineName: string;
  lineColor: string;
  lat: number;
  lng: number;
  speedKmH: number;
  bearing: number;
  delayMins: number;
  status: "On Time" | "Minor Delays" | "Stopped";
}

export function toVehicleModel(dto: any, idx: number): RealtimeVehicle {
  return {
    id: dto.vehicleId || dto.id || `v-${idx + 1}`,
    lineId: dto.lineId || "yellow",
    lineName: dto.lineName || "Yellow Line",
    lineColor: dto.lineColor || "#EAB308",
    lat: dto.latitude || dto.lat || 28.6139,
    lng: dto.longitude || dto.lng || 77.209,
    speedKmH: dto.speed || 45,
    bearing: dto.bearing || 90,
    delayMins: dto.delayMins || 0,
    status: dto.delayMins > 3 ? "Minor Delays" : "On Time",
  };
}
