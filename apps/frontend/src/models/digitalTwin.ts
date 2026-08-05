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

export function toDigitalTwinModel(dto: any, stationId: string, defaultName: string): DigitalTwin {
  if (dto && dto.station) {
    return {
      stationId: dto.station.id || stationId,
      stationName: dto.station.name || defaultName,
      levels: dto.levels || [
        { id: "G", name: "Ground Concourse", facilities: ["Ticket Counter", "Gate A", "ATM"] },
        { id: "L1", name: "Platform Level 1 (Red Line)", facilities: ["Platform 1", "Platform 2"] },
        { id: "L2", name: "Platform Level 2 (Yellow Line)", facilities: ["Platform 3", "Platform 4"] },
      ],
      platformEtas: dto.platformEtas || [
        { platform: "Platform 2", towards: "HUDA City Centre", etaMins: 4, crowdLevel: "Medium", recommendedCoach: "Coach 3" },
        { platform: "Platform 1", towards: "Samaypur Badli", etaMins: 8, crowdLevel: "Low", recommendedCoach: "Coach 1" },
      ],
      exits: dto.exits || [
        { gate: "Exit 1", name: "Ajmeri Gate Road", distanceMeter: 250 },
        { gate: "Exit 2", name: "Daryaganj Main", distanceMeter: 120 },
        { gate: "Exit 3", name: "ISBT Terminal", distanceMeter: 300 },
      ],
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
