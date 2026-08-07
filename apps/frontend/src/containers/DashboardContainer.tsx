"use client";

import { useRouter } from "next/navigation";
import { useCityContext } from "../contexts/CityContext";
import { useStationContext } from "../contexts/StationContext";
import { useRealtime } from "../hooks/useRealtime";
import { useStations } from "../hooks/useStations";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import MapContainer from "../components/map/MapContainer";
import { JourneyPlannerContainer } from "./JourneyPlannerContainer";
import { CITY_METADATA } from "../config/cityMetadata";
import Link from "next/link";

export function DashboardContainer() {
  const router = useRouter();
  const { activeCity, setActiveCity } = useCityContext();
  const { selectedStationId, setSelectedStation } = useStationContext();
  const { data: vehicles } = useRealtime(activeCity, 10000);
  const { data: stations } = useStations(activeCity);

  const meta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const statCards = [
    {
      label: "Next Train",
      value: "5 min",
      sub: `→ ${meta.quickPills[1] || "Central Station"}`,
      icon: "directions_subway",
      iconColor: "text-[#00e5ff]",
      iconBg: "bg-[#00e5ff]/10",
      href: "/plan",
    },
    {
      label: "Smart Card",
      value: "₹256.40",
      sub: "NCMC Balance",
      icon: "credit_card",
      iconColor: "text-[#d1bcff]",
      iconBg: "bg-[#7000ff]/10",
      href: "/passes",
    },
    {
      label: "CO₂ Saved",
      value: "24.6 kg",
      sub: "≈ 1 Tree Planted",
      icon: "eco",
      iconColor: "text-[#4ade80]",
      iconBg: "bg-[#4ade80]/10",
      href: "/analytics",
    },
    {
      label: "Money Saved",
      value: "₹1,320",
      sub: "vs. Cab / Auto",
      icon: "savings",
      iconColor: "text-[#fec931]",
      iconBg: "bg-[#fec931]/10",
      href: "/analytics",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          {/* Greeting */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">
                Good Morning, Gautam 👋
              </h1>
              <p className="text-sm text-[#bac9cc] mt-1">
                {meta.name} · Live Telemetry Active ·{" "}
                <span className="text-[#00e5ff] font-semibold">{vehicles.length} Trains Live</span>
              </p>
            </div>
            <span className="text-xs font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-3 py-1.5 rounded-full border border-[#00e5ff]/30">
              {meta.code} ACTIVE
            </span>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Map Canvas — 8 cols */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10 h-[440px] relative">
                <MapContainer
                  activeCity={activeCity}
                  activeLayers={["lines", "stations", "realtime"]}
                  selectedStationId={selectedStationId}
                  onStationSelect={(id) => {
                    const s = stations.find((st) => st.id === id);
                    const name = s?.name || "Station";
                    setSelectedStation(id, name);
                    router.push(`/network?stationId=${id}&stationName=${encodeURIComponent(name)}`);
                  }}
                />
              </div>

              {/* 4 Stat Cards below the map */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {statCards.map((card) => (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#00e5ff]/30 transition-all group flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-xs text-[#bac9cc] font-bold uppercase tracking-wider leading-tight">{card.label}</p>
                      <div className={`w-8 h-8 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined text-sm ${card.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {card.icon}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#dfe2ee] group-hover:text-[#00e5ff] transition-colors">{card.value}</p>
                      <p className="text-[11px] text-[#bac9cc] mt-0.5">{card.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Journey Planner Panel — 4 cols */}
            <div className="lg:col-span-4 glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col">
              <div className="p-5 pb-0 border-b border-white/5">
                <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Plan a Journey</h3>
                <p className="text-xs text-[#bac9cc] mt-0.5">Dijkstra pathfinder · {meta.name}</p>
              </div>
              <JourneyPlannerContainer activeCity={activeCity} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
