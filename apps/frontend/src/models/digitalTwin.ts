export interface DigitalTwinLevel {
  id: string;
  name: string;
  levelNumber?: number;
  lineId?: string | null;
  lineCode?: string | null;
  lineName?: string | null;
  lineColor?: string | null;
  evidenceStatus?: string;
  facilities: string[];
}

export interface PlatformEta {
  platform: string;
  towards: string;
  etaMins: number;
  crowdLevel?: "Low" | "Medium" | "High" | null;
  recommendedCoach: string;
}

export interface StationExit {
  gate: string;
  name: string;
  distanceMeter?: number | null;
}

export interface DigitalTwin {
  stationId: string;
  stationName: string;
  code?: string;
  city?: string;
  wheelchairAccessible?: boolean;
  lines: Array<{ code: string; name: string; color: string }>;
  levels: DigitalTwinLevel[];
  platformEtas: PlatformEta[];
  exits: StationExit[];
  rawDto?: Record<string, unknown>;
}

export function toDigitalTwinModel(dto: Record<string, unknown> | null | undefined, stationId: string, defaultName: string): DigitalTwin {
  if (dto && typeof dto === "object" && "station" in dto && dto.station && typeof dto.station === "object") {
    const stationObj = dto.station as Record<string, unknown>;
    const physical = (dto.physical && typeof dto.physical === "object")
      ? dto.physical as Record<string, unknown>
      : {};
    const rawLevels = Array.isArray(physical.levels) ? physical.levels : [];
    const mappedLevels: DigitalTwinLevel[] = rawLevels.map((l: unknown) => {
      const lvl = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
      const line = (lvl.line && typeof lvl.line === "object" ? lvl.line : {}) as Record<string, unknown>;
      return {
        id: (lvl.id as string) || `lvl-${lvl.levelNumber || 0}`,
        name: (lvl.name as string) || `Level ${lvl.levelNumber || 0}`,
        levelNumber: typeof lvl.levelNumber === "number" ? lvl.levelNumber : undefined,
        lineId: typeof lvl.lineId === "string" ? lvl.lineId : null,
        lineCode: typeof line.code === "string" ? line.code : null,
        lineName: typeof line.name === "string" ? line.name : null,
        lineColor: typeof line.color === "string" ? line.color : null,
        evidenceStatus: typeof lvl.evidenceStatus === "string" ? lvl.evidenceStatus : "UNVERIFIED",
        facilities: Array.isArray((lvl as any).facilities) && (lvl as any).facilities.length > 0
          ? ((lvl as any).facilities as string[])
          : Array.isArray((lvl as any).amenities) && (lvl as any).amenities.length > 0
          ? ((lvl as any).amenities as any[]).map((a: any) => (a.name || a.type) as string)
          : [],
      };
    });

    const rawLines = Array.isArray(stationObj.lines) ? stationObj.lines : [];
    const mappedLines: Array<{ code: string; name: string; color: string }> = rawLines.map((l: unknown) => {
      const item = l as Record<string, unknown>;
      return {
        code: (item?.code as string) || "",
        name: (item?.name as string) || "",
        color: (item?.color as string) || "#00e5ff",
      };
    });

    const physicalRecord = physical as Record<string, unknown>;

    return {
      stationId: (stationObj.id as string) || stationId,
      stationName: (stationObj.name as string) || defaultName,
      code: (stationObj.code as string) || "",
      city: (stationObj.city as string) || "",
      wheelchairAccessible: Boolean(stationObj.wheelchairAccessible),
      lines: mappedLines,
      levels: mappedLevels,
      platformEtas: (dto.platformEtas as PlatformEta[]) || [],
      exits: Array.isArray(dto.exits) && (dto.exits as unknown[]).length > 0
        ? (dto.exits as Record<string, unknown>[]).map((e, idx) => ({
            gate: (e.gate as string) || (e.name as string) || `Gate ${idx + 1}`,
            name: (e.name as string) || `Exit ${idx + 1}`,
            distanceMeter: typeof e.distanceMeter === "number" && e.distanceMeter > 0 ? e.distanceMeter : null,
          }))
        : Array.isArray(physicalRecord.entrances)
        ? (physicalRecord.entrances as Record<string, unknown>[]).map((e, idx) => ({
            gate: (e.name as string) || `Gate ${idx + 1}`,
            name: (e.description as string) || (e.name as string) || "Station Gate",
            distanceMeter: null,
          }))
        : [],
      rawDto: dto,
    };
  }

  return {
    stationId,
    stationName: defaultName,
    code: "",
    city: "",
    wheelchairAccessible: false,
    lines: [],
    levels: [],
    platformEtas: [],
    exits: [],
  };
}
