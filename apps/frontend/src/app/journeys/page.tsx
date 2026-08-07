"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { CITY_METADATA } from "../../config/cityMetadata";

export default function MyJourneysPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [activeTab, setActiveTab] = useState<"saved" | "past">("saved");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const savedCommutes = [
    {
      id: "commute-1",
      title: "Daily Office Commute",
      icon: "work",
      from: currentMeta.quickPills[0] || "Origin Station",
      to: currentMeta.quickPills[1] || "Destination Station",
      status: "On Time",
      statusColor: "#4ade80",
      avgDuration: "32 mins",
      transfers: "1 Transfer",
      lines: [{ name: "Red Line", code: "RED", color: "#EF4444" }],
      frequentTime: "08:45 AM & 06:15 PM",
      favorite: true,
    },
    {
      id: "commute-2",
      title: "Airport Express Run",
      icon: "flight",
      from: currentMeta.quickPills[0] || "Origin Station",
      to: "Airport Terminal T3",
      status: "Minor Delays",
      statusColor: "#fec931",
      avgDuration: "24 mins",
      transfers: "Direct Express",
      lines: [{ name: "Express Line", code: "EXP", color: "#F97316" }],
      frequentTime: "Weekend Travel",
      favorite: false,
    },
    {
      id: "commute-3",
      title: "Central Market / Hub",
      icon: "shopping_bag",
      from: currentMeta.quickPills[1] || "Central Station",
      to: currentMeta.quickPills[2] || "City Center",
      status: "Good Service",
      statusColor: "#4ade80",
      avgDuration: "18 mins",
      transfers: "Direct Metro",
      lines: [{ name: "Yellow Line", code: "YLW", color: "#EAB308" }],
      frequentTime: "Evening Commute",
      favorite: true,
    },
  ];

  const pastTrips = [
    {
      id: "trip-101",
      date: "Today, 08:45 AM",
      from: currentMeta.quickPills[0] || "Origin Station",
      to: currentMeta.quickPills[1] || "Destination Station",
      mode: "Metro Direct",
      duration: "32 mins",
      fare: "₹30.00",
      status: "Completed",
      ncmcUsed: true,
    },
    {
      id: "trip-102",
      date: "Yesterday, 06:15 PM",
      from: currentMeta.quickPills[1] || "Destination Station",
      to: currentMeta.quickPills[0] || "Origin Station",
      mode: "Multi-Modal (Metro + Cab)",
      duration: "26 mins",
      fare: "₹140.00",
      status: "Completed",
      ncmcUsed: false,
    },
    {
      id: "trip-103",
      date: "01 Aug 2026, 02:30 PM",
      from: currentMeta.quickPills[0] || "Origin Station",
      to: currentMeta.quickPills[3] || "Airport T3",
      mode: "Express Metro",
      duration: "22 mins",
      fare: "₹60.00",
      status: "Completed",
      ncmcUsed: true,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          {/* Page Header & Tabs */}
          <div className="mb-8 flex flex-col md:flex-row justify-between gap-4 md:items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">My Journeys</h1>
              <p className="text-sm text-[#bac9cc] mt-1">
                Manage your regular commutes and review past trip history for {currentMeta.name}.
              </p>
            </div>

            {/* Top Tabs Selector */}
            <div className="flex p-1 bg-[#181c24]/80 rounded-xl border border-white/10 backdrop-blur-md w-full md:w-auto">
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "saved"
                    ? "bg-white/10 text-[#00e5ff] border border-[#00e5ff]/30 shadow"
                    : "text-[#bac9cc] hover:text-[#dfe2ee] hover:bg-white/5"
                }`}
              >
                Saved Commutes
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "past"
                    ? "bg-white/10 text-[#00e5ff] border border-[#00e5ff]/30 shadow"
                    : "text-[#bac9cc] hover:text-[#dfe2ee] hover:bg-white/5"
                }`}
              >
                Past Trips
              </button>
            </div>
          </div>

          {/* TAB 1: Saved Commutes */}
          {activeTab === "saved" && (
            <div className="space-y-6 animate-slide-in">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">
                  Frequent Routes ({savedCommutes.length})
                </h2>
                <button className="px-4 py-2 rounded-lg bg-[#00e5ff] text-[#00363d] font-bold text-xs hover:bg-[#00daf3] transition-colors flex items-center gap-1.5 shadow">
                  <span className="material-symbols-outlined text-sm">add</span> Add New Commute
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedCommutes.map((commute) => (
                  <div
                    key={commute.id}
                    className="glass-card rounded-xl p-5 border border-white/10 hover:border-[#00e5ff]/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center border border-white/10">
                          <span className="material-symbols-outlined text-[#00e5ff] text-xl">{commute.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[#dfe2ee] text-base">{commute.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: commute.statusColor }}></span>
                            <span className="text-xs font-semibold text-[#bac9cc]">{commute.status}</span>
                          </div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-lg cursor-pointer" style={{ color: commute.favorite ? "#fec931" : "#bac9cc" }}>
                        star
                      </span>
                    </div>

                    <div className="my-3 p-3 bg-[#181c24] rounded-lg border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#bac9cc]">From</span>
                        <span className="font-bold text-[#dfe2ee]">{commute.from}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#bac9cc]">To</span>
                        <span className="font-bold text-[#dfe2ee]">{commute.to}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5 text-xs text-[#bac9cc]">
                      <span>{commute.avgDuration} • {commute.transfers}</span>
                      <a href="/plan" className="px-3 py-1.5 rounded-full bg-white/5 text-[#00e5ff] font-bold hover:bg-white/10 transition-colors border border-white/10">
                        Start Route ➔
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Past Trips */}
          {activeTab === "past" && (
            <div className="space-y-6 animate-slide-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {["All", "Metro", "Multi-Modal"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        selectedFilter === filter
                          ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40"
                          : "bg-white/5 text-[#bac9cc] border border-white/5 hover:bg-white/10"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[#bac9cc]">Showing {pastTrips.length} recent trips</span>
              </div>

              <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {pastTrips.map((trip) => (
                    <div key={trip.id} className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center border border-white/10">
                          <span className="material-symbols-outlined text-[#00e5ff] text-xl">history</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[#dfe2ee] text-sm">{trip.from} ➔ {trip.to}</h4>
                            {trip.ncmcUsed && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold">NCMC Paid</span>
                            )}
                          </div>
                          <p className="text-xs text-[#bac9cc] mt-0.5">{trip.date} • {trip.mode}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-auto">
                        <div className="text-right">
                          <span className="text-base font-bold text-[#00e5ff] block">{trip.fare}</span>
                          <span className="text-xs text-[#bac9cc] block">{trip.duration}</span>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-[#bac9cc] transition-colors">
                          <span className="material-symbols-outlined text-sm">receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
