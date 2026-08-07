export interface StationDto {
  id: string;
  name: string;
  code?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  lines?: string[];
  system?: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  lines: string[];
  system: string;
}

export function toStationModel(dto: StationDto): Station {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code || dto.name.substring(0, 3).toUpperCase(),
    lat: dto.latitude ?? dto.lat ?? 28.6665,
    lng: dto.longitude ?? dto.lng ?? 77.2285,
    lines: dto.lines || [],
    system: dto.system || "",
  };
}
