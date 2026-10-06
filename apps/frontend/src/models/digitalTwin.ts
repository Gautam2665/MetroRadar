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
  crowdLevel: "Low" | "Medium" | "High";
  recommendedCoach: string;
}

export interface StationExit {
  gate: string;
  name: string;
  distanceMeter: number;
}

export interface DigitalTwin {
  stationId: string;
  stationName: string;
  levels: DigitalTwinLevel[];
  platformEtas: PlatformEta[];
  exits: StationExit[];
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
        facilities: [],
      };
    });

    return {
      stationId: (stationObj.id as string) || stationId,
      stationName: (stationObj.name as string) || defaultName,
      levels: mappedLevels,
      platformEtas: (dto.platformEtas as PlatformEta[]) || [],
      exits: Array.isArray(dto.entrances)
        ? (dto.entrances as Record<string, unknown>[]).map((e) => ({
            gate: (e.name as string) || "Entrance",
            name: (e.description as string) || (e.name as string) || "Station Gate",
            distanceMeter: 150,
          }))
        : (dto.exits as StationExit[]) || [],
    };
  }

  return {
    stationId,
    stationName: defaultName,
    levels: [],
    platformEtas: [],
    exits: [],
  };
}
