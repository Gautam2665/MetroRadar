export interface DigitalTwinLevel {
  id: string;
  name: string;
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
    const rawLevels = Array.isArray(dto.levels) ? dto.levels : [];
    const mappedLevels: DigitalTwinLevel[] = rawLevels.map((l: unknown) => {
      const lvl = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
      return {
        id: (lvl.id as string) || `lvl-${lvl.levelNumber || 0}`,
        name: (lvl.name as string) || `Level ${lvl.levelNumber || 0}`,
        facilities: Array.isArray(lvl.platforms)
          ? lvl.platforms.map((p: unknown) => {
              const plt = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
              return (plt.name as string) || `Platform ${plt.platformNumber || ""}`;
            })
          : [],
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
    levels: [
      { id: "G", name: "Ground Concourse", facilities: ["Security Gates", "NCMC Recharge Kiosk"] },
      { id: "L1", name: "Platform Level 1", facilities: ["Northbound Track", "Southbound Track"] },
      { id: "L2", name: "Platform Level 2", facilities: ["Interchange Passageway"] },
    ],
    platformEtas: [
      { platform: "Platform 2", towards: "Terminal Station", etaMins: 5, crowdLevel: "Low", recommendedCoach: "Coach 2" },
    ],
    exits: [
      { gate: "Gate A", name: "Main Boulevard", distanceMeter: 150 },
      { gate: "Gate B", name: "Central Plaza", distanceMeter: 210 },
    ],
  };
}
