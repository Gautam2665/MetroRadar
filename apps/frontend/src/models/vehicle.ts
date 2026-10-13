export interface RealtimeVehicle {
  id: string;
  tripId?: string | null;
  lineId: string;
  lineName: string;
  lineColor: string;
  lat: number;
  lng: number;
  speedKmH: number | null;
  bearing: number | null;
  timestamp: number | null;
  currentStatus: string | null;
  previousStationName: string | null;
  nextStationName: string | null;
  destination: string | null;
  delayMins: number;
  isEstimated: boolean;
  positionSource: "GPS" | "ESTIMATED";
  status: "On Time" | "Minor Delays" | "Stopped";
}

export function toVehicleModel(dto: Record<string, unknown>, idx: number): RealtimeVehicle | null {
  const rawLat = typeof dto.latitude === "number" ? dto.latitude : typeof dto.lat === "number" ? dto.lat : null;
  const rawLng = typeof dto.longitude === "number" ? dto.longitude : typeof dto.lng === "number" ? dto.lng : null;

  // Never fabricate moving train coordinates if the entity lacks latitude/longitude
  if (rawLat === null || rawLng === null || rawLat === 0 || rawLng === 0) {
    return null;
  }

  const delaySeconds = typeof dto.delaySeconds === "number" ? dto.delaySeconds : 0;
  const delayMins =
    typeof dto.delayMins === "number" ? dto.delayMins : Math.max(0, Math.round(delaySeconds / 60));
  const rawSpeed = typeof dto.speed === "number" ? dto.speed : typeof dto.speedKmH === "number" ? dto.speedKmH : null;
  const rawBearing = typeof dto.bearing === "number" ? dto.bearing : null;
  const rawTimestamp = typeof dto.timestamp === "number" ? dto.timestamp : null;
  const isEstimated = dto.isEstimated === true || dto.positionSource === "ESTIMATED";

  return {
    id: (dto.vehicleId as string) || (dto.id as string) || `v-${idx + 1}`,
    tripId: (dto.tripId as string) || null,
    lineId: (dto.routeId as string) || (dto.lineId as string) || "",
    lineName: (dto.lineName as string) || (dto.routeId as string) || "Metro Train",
    lineColor: (dto.lineColor as string) || "#00E5FF",
    lat: rawLat,
    lng: rawLng,
    speedKmH: rawSpeed !== null ? Math.round(rawSpeed) : null,
    bearing: rawBearing !== null ? Math.round(rawBearing) : null,
    timestamp: rawTimestamp,
    currentStatus: (dto.currentStatus as string) || null,
    previousStationName: (dto.previousStationName as string) || null,
    nextStationName: (dto.nextStationName as string) || null,
    destination: (dto.headsign as string) || (dto.destination as string) || null,
    delayMins,
    isEstimated,
    positionSource: isEstimated ? "ESTIMATED" : "GPS",
    status: delayMins > 3 ? "Minor Delays" : "On Time",
  };
}
