"use client";

import { useCityContext } from "../contexts/CityContext";
import { useStationContext } from "../contexts/StationContext";
import { useRealtime } from "../hooks/useRealtime";
import { useStations } from "../hooks/useStations";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import MapContainer from "../components/map/MapContainer";
import { DigitalTwinContainer } from "./DigitalTwinContainer";
import { JourneyPlannerContainer } from "./JourneyPlannerContainer";

export function DashboardContainer() {
  const { activeCity, setActiveCity } = useCityContext();
  const { selectedStationId, setSelectedStation } = useStationContext();
  const { data: vehicles } = useRealtime(activeCity, 5000);
  const { data: stations } = useStations(activeCity);

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">
                Good Morning, Gautam 👋
              </h1>
              <p className="text-sm text-[#bac9cc] mt-1">
                {activeCity.toUpperCase()} • Live Metro Telemetry & Pathfinder Active ({vehicles.length} Trains Live)
              </p>
            </div>
            <span className="text-xs font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-3 py-1.5 rounded-full border border-[#00e5ff]/30">
              {activeCity.toUpperCase()} ACTIVE
            </span>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Map Canvas */}
            <div className="lg:col-span-8 glass-card rounded-2xl overflow-hidden border border-white/10 h-[520px] relative">
              <MapContainer
                activeCity={activeCity}
                activeLayers={["lines", "stations", "realtime"]}
                selectedStationId={selectedStationId}
                onStationSelect={(id) => {
                  const s = stations.find((st) => st.id === id);
                  setSelectedStation(id, s?.name || "Station");
                }}
              />
            </div>

            {/* Journey Planner Panel */}
            <div className="lg:col-span-4 glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-[#dfe2ee] p-5 pb-0 uppercase tracking-wider">Plan a Journey</h3>
              <JourneyPlannerContainer activeCity={activeCity} />
            </div>
          </div>
        </main>
      </div>

      {/* 3D Digital Twin Inspector Drawer */}
      <DigitalTwinContainer />
    </div>
  );
}
