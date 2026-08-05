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
  geojson?: any;
  routes: RouteOption[];
}

export function toJourneyModel(dto: any, from: string, to: string, mode: "metro" | "multimodal"): JourneyPlan {
  if (dto && dto.journey) {
    const j = dto.journey;
    return {
      from,
      to,
      mode,
      geojson: j.geojson,
      routes: [
        {
          id: `nest-${Date.now()}`,
          duration: `${j.duration || 32} min`,
          fare: mode === "multimodal" ? "Cab: ₹140 • Auto: ₹85" : "₹30",
          smartCardFare: "₹27",
          distance: "18.4 km",
          interchanges: mode === "multimodal" ? 0 : (j.transfers || 2),
          walkDistance: mode === "multimodal" ? "0 m" : "1.1 km",
          crowd: "Low",
          crowdColor: "#4ade80",
          boardCoach: "Coach 3",
          score: j.score || 96,
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
