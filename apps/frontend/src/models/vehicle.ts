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

export function toVehicleModel(dto: Record<string, unknown>, idx: number): RealtimeVehicle {
  const delayMins = (dto.delayMins as number) || 0;
  return {
    id: (dto.vehicleId as string) || (dto.id as string) || `v-${idx + 1}`,
    lineId: (dto.lineId as string) || "",
    lineName: (dto.lineName as string) || "Metro Train",
    lineColor: (dto.lineColor as string) || "#38bdf8",
    lat: (dto.latitude as number) || (dto.lat as number) || 28.6139,
    lng: (dto.longitude as number) || (dto.lng as number) || 77.209,
    speedKmH: (dto.speed as number) || 45,
    bearing: (dto.bearing as number) || 90,
    delayMins,
    status: delayMins > 3 ? "Minor Delays" : "On Time",
  };
}
