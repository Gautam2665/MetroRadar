"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { CITY_METADATA } from "../../config/cityMetadata";

export default function AnalyticsPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [timeRange, setTimeRange] = useState<"month" | "last_month" | "year">("month");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const topRoutes = [
    { from: currentMeta.upcomingJourney.from, to: currentMeta.upcomingJourney.to, trips: 12, fare: "₹30" },
    { from: currentMeta.quickPills[0], to: currentMeta.quickPills[1] || "Central Station", trips: 5, fare: "₹20" },
    { from: currentMeta.quickPills[1] || "Station A", to: currentMeta.quickPills[2] || "Station B", trips: 3, fare: "₹25" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">Analytics & Eco Impact</h1>
              <p className="text-sm text-[#bac9cc] mt-1">
                Your transit spending insights and environmental footprint reduction for {currentMeta.name}.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#1c2028] border border-white/10 rounded-lg p-1">
              {(["month", "last_month", "year"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${
                    timeRange === range
                      ? "bg-[#353942] text-[#00e5ff] shadow"
                      : "text-[#bac9cc] hover:text-[#dfe2ee]"
                  }`}
                >
                  {range === "month" ? "This Month" : range === "last_month" ? "Last Month" : "Year"}
                </button>
              ))}
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Top Summary Metric Cards */}
            <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Total Journeys */}
              <div className="glass-card rounded-xl p-5 border border-white/10 flex justify-between items-start relative overflow-hidden group">
                <div>
                  <p className="text-xs text-[#bac9cc] font-bold uppercase tracking-wider mb-2">Total Journeys</p>
                  <h3 className="text-3xl font-bold text-[#dfe2ee]">18</h3>
                  <div className="flex items-center gap-1 mt-2 text-[#4ade80] text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>+12% vs last month</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#00e5ff]/20 flex items-center justify-center text-[#00e5ff]">
                  <span className="material-symbols-outlined">route</span>
                </div>
              </div>

              {/* Total Spent */}
              <div className="glass-card rounded-xl p-5 border border-white/10 flex justify-between items-start relative overflow-hidden group">
                <div>
                  <p className="text-xs text-[#bac9cc] font-bold uppercase tracking-wider mb-2">Total Spent</p>
                  <h3 className="text-3xl font-bold text-[#dfe2ee]">₹520</h3>
                  <div className="flex items-center gap-1 mt-2 text-[#00e5ff] text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">trending_down</span>
                    <span>-18% vs last month</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#7000ff]/20 flex items-center justify-center text-[#d1bcff]">
                  <span className="material-symbols-outlined">payments</span>
                </div>
              </div>

              {/* CO2 Saved Quick */}
              <div className="glass-card rounded-xl p-5 border border-white/10 flex justify-between items-start relative overflow-hidden group">
                <div>
                  <p className="text-xs text-[#bac9cc] font-bold uppercase tracking-wider mb-2">CO₂ Saved</p>
                  <h3 className="text-3xl font-bold text-[#dfe2ee]">
                    24.6 <span className="text-sm font-normal text-[#bac9cc]">kg</span>
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-[#4ade80] text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">park</span>
                    <span>≈ 1 Tree Planted</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#4ade80]/20 flex items-center justify-center text-[#4ade80]">
                  <span className="material-symbols-outlined">eco</span>
                </div>
              </div>
            </div>

            {/* Spend Analytics Bar Chart */}
            <div className="md:col-span-8 glass-card rounded-xl p-6 border border-white/10 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Spending Over Time</h3>
                <span className="text-xs text-[#bac9cc]">May 2026</span>
              </div>

              <div className="flex-1 flex items-end justify-between gap-3 h-52 pt-6 relative border-b border-white/10 pb-6">
                {[
                  { day: "1 May", amount: 45, height: "30%" },
                  { day: "5 May", amount: 75, height: "50%" },
                  { day: "10 May", amount: 120, height: "80%" },
                  { day: "15 May", amount: 60, height: "40%" },
                  { day: "20 May", amount: 30, height: "20%" },
                  { day: "25 May", amount: 90, height: "60%" },
                  { day: "30 May", amount: 140, height: "90%" },
                ].map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div
                      className="w-full bg-[#00e5ff]/30 group-hover:bg-[#00e5ff] rounded-t-sm transition-all relative"
                      style={{ height: item.height }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1c2028] px-2 py-0.5 rounded text-[10px] font-bold text-[#00e5ff] opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 whitespace-nowrap shadow">
                        ₹{item.amount}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#bac9cc] font-bold">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Eco Impact Tree Visual */}
            <div className="md:col-span-4 glass-card rounded-xl p-6 border border-white/10 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Environmental Impact</h3>
                <span className="material-symbols-outlined text-[#4ade80]">energy_savings_leaf</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <div className="w-28 h-28 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                  <span className="material-symbols-outlined text-6xl text-[#4ade80]">forest</span>
                </div>
                <div className="text-center">
                  <span className="text-3xl font-bold text-[#dfe2ee]">24.6 <span className="text-sm text-[#bac9cc]">kg</span></span>
                  <p className="text-xs font-bold text-[#4ade80] mt-0.5">CO₂ Offset Achieved</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                <div>
                  <span className="text-[#bac9cc] block">Equivalent to</span>
                  <span className="font-bold text-[#dfe2ee] text-sm">1.2 Trees</span>
                </div>
                <div>
                  <span className="text-[#bac9cc] block">Distance</span>
                  <span className="font-bold text-[#dfe2ee] text-sm">120 km <span className="text-[10px] text-[#bac9cc]">No Car</span></span>
                </div>
              </div>
            </div>

            {/* Mode Breakdown & Top Routes */}
            <div className="md:col-span-6 glass-card rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider mb-4">Journeys by Mode</h3>
              <div className="flex items-center justify-around gap-6">
                <div className="w-28 h-28 rounded-full border-[12px] border-[#00e5ff] border-t-[#7000ff] flex items-center justify-center">
                  <span className="text-xl font-bold text-[#dfe2ee]">18</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#00e5ff]"></span>
                    <span className="text-[#dfe2ee] font-semibold">Metro (65%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#7000ff]"></span>
                    <span className="text-[#dfe2ee] font-semibold">Multi-Modal (25%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#bac9cc]"></span>
                    <span className="text-[#dfe2ee] font-semibold">Walk / Other (10%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Routes Frequency */}
            <div className="md:col-span-6 glass-card rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider mb-4">Top Commute Routes</h3>
              <div className="space-y-3">
                {topRoutes.map((route, i) => (
                  <div key={i} className="p-3 bg-[#181c24]/50 rounded-lg border border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-[#dfe2ee]">{route.from} ➔ {route.to}</h4>
                      <p className="text-xs text-[#bac9cc]">{route.trips} Trips this month</p>
                    </div>
                    <span className="text-sm font-bold text-[#00e5ff]">{route.fare}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
