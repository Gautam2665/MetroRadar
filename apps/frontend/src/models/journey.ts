export interface RouteLeg {
  mode: "subway" | "walk" | "cab" | "auto";
  line: string;
  color: string;
  durationMins?: number;
}

export interface RouteOption {
  id: string;
  duration: string;
  fare: string;
  smartCardFare?: string;
  distance: string;
  interchanges: number;
  walkDistance: string;
  crowd: "Low" | "Medium" | "High";
  crowdColor: string;
  boardCoach: string;
  score: number;
  legs: RouteLeg[];
}

export interface JourneyPlan {
  from: string;
  to: string;
  mode: "metro" | "multimodal";
  geojson?: GeoJSON.FeatureCollection | Record<string, unknown>;
  routes: RouteOption[];
}

export function toJourneyModel(dto: Record<string, unknown> | null | undefined, from: string, to: string, mode: "metro" | "multimodal"): JourneyPlan {
  if (dto && typeof dto === "object" && "journey" in dto && dto.journey && typeof dto.journey === "object") {
    const j = dto.journey as Record<string, unknown>;
    const dynamicLegs: RouteLeg[] = Array.isArray(j.legs)
      ? j.legs.map((leg: unknown) => {
          const l = (leg && typeof leg === "object" ? leg : {}) as Record<string, unknown>;
          return {
            mode: (l.mode as RouteLeg["mode"]) || "subway",
            line: (l.lineName as string) || (l.line as string) || "Metro Line",
            color: (l.lineColor as string) || (l.color as string) || "#38bdf8",
            durationMins: l.durationMins as number | undefined,
          };
        })
      : [{ mode: "subway", line: "Metro Route", color: "#38bdf8" }];

    return {
      from,
      to,
      mode,
      geojson: j.geojson as Record<string, unknown> | undefined,
      routes: [
        {
          id: `nest-${Date.now()}`,
          duration: `${(j.duration as number) || 32} min`,
          fare: mode === "multimodal" ? "Cab: ₹140 • Auto: ₹85" : `₹${(j.fare as number) || 30}`,
          smartCardFare: typeof j.fare === "number" ? `₹${Math.round(j.fare * 0.9)}` : "₹27",
          distance: j.distanceKm ? `${j.distanceKm as number} km` : "18.4 km",
          interchanges: mode === "multimodal" ? 0 : ((j.transfers as number) || 0),
          walkDistance: mode === "multimodal" ? "0 m" : "300 m",
          crowd: "Low",
          crowdColor: "#4ade80",
          boardCoach: "Coach 3",
          score: typeof j.score === "number" ? j.score : 96,
          legs: dynamicLegs,
        },
      ],
    };
  }

  return {
    from,
    to,
    mode,
    routes: [
      {
        id: `fallback-${Date.now()}`,
        duration: mode === "multimodal" ? "26 min" : "32 min",
        fare: mode === "multimodal" ? "Cab: ₹140 • Auto: ₹85" : "₹30",
        smartCardFare: "₹27",
        distance: "18.6 km",
        interchanges: mode === "multimodal" ? 0 : 2,
        walkDistance: mode === "multimodal" ? "0 m" : "1.2 km",
        crowd: "Low",
        crowdColor: "#4ade80",
        boardCoach: "Coach 3",
        score: 96,
        legs: mode === "multimodal"
          ? [{ mode: "walk", line: "Direct Cab/Auto Shuttle", color: "#00e5ff" }]
          : [
              { mode: "subway", line: "Red Line", color: "#EF4444" },
              { mode: "subway", line: "Violet Line", color: "#8B5CF6" },
              { mode: "subway", line: "Yellow Line", color: "#EAB308" },
            ],
      },
    ],
  };
}
