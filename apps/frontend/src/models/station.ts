export interface StationDto {
  id: string;
  name: string;
  code?: string;
  city?: string;
  systemId?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  lines?: any[];
  lineInfrastructure?: any[];
  system?: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  city: string;
  systemId: string;
  lat: number;
  lng: number;
  lines: any[];
  lineInfrastructure: any[];
  system: string;
}

export function toStationModel(dto: StationDto): Station {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code || dto.name.substring(0, 3).toUpperCase(),
    city: dto.city || "",
    systemId: dto.systemId || "",
    lat: dto.latitude ?? dto.lat ?? 28.6665,
    lng: dto.longitude ?? dto.lng ?? 77.2285,
    lines: dto.lines || [],
    lineInfrastructure: dto.lineInfrastructure || [],
    system: dto.system || "",
  };
}
