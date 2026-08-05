"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { JourneyPlannerContainer } from "../../containers/JourneyPlannerContainer";

export default function JourneyPlannerPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [routeGeojson, setRouteGeojson] = useState<any>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Split View Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left Panel: Dynamic Journey Planner Container */}
          <div className="w-full lg:w-[420px] flex-shrink-0 bg-[#0f131c]/90 backdrop-blur-md border-r border-white/10 flex flex-col h-full z-10 scrollbar-hide overflow-y-auto">
            <JourneyPlannerContainer
              activeCity={activeCity}
              onGeojsonUpdate={(geojson) => setRouteGeojson(geojson)}
            />
          </div>

          {/* Right Panel: Map Canvas */}
          <div className="flex-1 relative bg-[#0a0e14]">
            <div className="w-full h-full relative">
              <MapContainer
                activeCity={activeCity}
                activeLayers={["lines", "stations", "realtime"]}
                selectedStationId={selectedStationId}
                onStationSelect={(id) => setSelectedStationId(id)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
