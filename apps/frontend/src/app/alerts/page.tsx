"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { CITY_METADATA } from "../page";

export default function AlertsPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const alertsList = [
    {
      id: "alert-1",
      title: `${currentMeta.lines[0]?.name || "Red Line"} - Severe Delays`,
      time: "10 MINS AGO",
      description: "Signal maintenance between interchange corridors. Expect delays up to 15 minutes. Maintenance crews are on site.",
      type: "critical",
      borderColor: "border-l-[#EF4444]",
      iconBg: "bg-[#EF4444]/20",
      iconColor: "text-[#EF4444]",
      icon: "warning",
      tag: currentMeta.lines[0]?.name || "Red Line",
      tagColor: currentMeta.lines[0]?.color || "#EF4444",
      filterCategory: "Service",
    },
    {
      id: "alert-2",
      title: `${currentMeta.lines[1]?.name || "Yellow Line"} - Minor Track Speed Control`,
      time: "45 MINS AGO",
      description: "Trains running at reduced speed near primary junctions due to scheduled track inspection.",
      type: "warning",
      borderColor: "border-l-[#fec931]",
      iconBg: "bg-[#fec931]/20",
      iconColor: "text-[#fec931]",
      icon: "schedule",
      tag: currentMeta.lines[1]?.name || "Yellow Line",
      tagColor: currentMeta.lines[1]?.color || "#EAB308",
      filterCategory: "Service",
    },
    {
      id: "alert-3",
      title: `Escalator & Elevator Maintenance`,
      time: "2 HRS AGO",
      description: `Escalator #2 under maintenance at ${currentMeta.upcomingJourney.from}. Please use elevators at Gate C.`,
      type: "info",
      borderColor: "border-l-[#00e5ff]",
      iconBg: "bg-[#00e5ff]/20",
      iconColor: "text-[#00e5ff]",
      icon: "build",
      tag: currentMeta.upcomingJourney.from,
      tagColor: "#31353e",
      filterCategory: "Personal",
    },
    {
      id: "alert-4",
      title: `Weekend Special Metro Frequencies`,
      time: "YESTERDAY",
      description: `Increased train frequency on all ${currentMeta.code} lines starting tomorrow for holiday peak hours.`,
      type: "info",
      borderColor: "border-l-[#3B82F6]",
      iconBg: "bg-[#3B82F6]/20",
      iconColor: "text-[#3B82F6]",
      icon: "info",
      tag: `${currentMeta.code} System`,
      tagColor: "#3B82F6",
      filterCategory: "Promotions",
    },
  ];

  const filteredAlerts = selectedFilter === "All"
    ? alertsList
    : alertsList.filter((a) => a.filterCategory.toLowerCase() === selectedFilter.toLowerCase());

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">Network Alerts & Notices</h1>
              <p className="text-sm text-[#bac9cc] mt-1">
                Real-time service updates, delay advisories, and system notices for {currentMeta.name}.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {["All", "Service", "Personal", "Promotions"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                    selectedFilter === filter
                      ? "bg-[#00e5ff] text-[#00363d] shadow"
                      : "bg-white/5 text-[#bac9cc] border border-white/10 hover:bg-white/10 hover:text-[#dfe2ee]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Alert Cards Feed */}
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`glass-card p-5 md:p-6 rounded-xl border-l-4 ${alert.borderColor} border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-full ${alert.iconBg} flex items-center justify-center shrink-0 ${alert.iconColor}`}>
                      <span className="material-symbols-outlined text-2xl">{alert.icon}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-base font-bold text-[#dfe2ee]">{alert.title}</h3>
                        <span className="text-[11px] font-bold text-[#bac9cc] tracking-wider">{alert.time}</span>
                      </div>

                      <p className="text-sm text-[#bac9cc] mb-3 leading-relaxed">{alert.description}</p>

                      <div className="flex gap-2">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold uppercase shadow-sm"
                          style={{
                            backgroundColor: `${alert.tagColor}20`,
                            color: alert.tagColor === "#31353e" ? "#c3f5ff" : alert.tagColor,
                            border: `1px solid ${alert.tagColor}40`,
                          }}
                        >
                          <span className="material-symbols-outlined text-xs">subway</span>
                          {alert.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
