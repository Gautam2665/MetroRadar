export type StationRef = {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
};

export type JourneyLeg = {
  from: string;
  fromStationName: string;
  to: string;
  toStationName: string;
  type: "TRANSIT" | "TRANSFER" | "WALK";
  duration: number;
  lineId: string | null;
  lineName: string | null;
  lineColor: string | null;
  lineCode: string | null;
  stationsCount: number;
};

export type JourneyResult = {
  metadata: {
    from: StationRef;
    to: StationRef;
    algorithm: string;
    graphVersion: string;
  };
  journey: {
    score: number;
    duration: number;
    durationSeconds: number;
    transfers: number;
    legs: JourneyLeg[];
    stations: StationRef[];
    geojson: GeoJSON.FeatureCollection;
  };
};
