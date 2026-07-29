"use client";

import { useState } from "react";
import {
  Home,
  Navigation,
  Train,
  CreditCard,
  Bell,
  BarChart3,
  User,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Award,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  DollarSign,
  Maximize2,
  Compass,
} from "lucide-react";

export type MobileScreenId =
  | "dashboard"
  | "plan"
  | "journey"
  | "tracking"
  | "station"
  | "station3d"
  | "passes"
  | "payments"
  | "analytics"
  | "alerts"
  | "profile"
  | "multimodal";

export default function MobileViewSwitcher() {
  const [activeScreen, setActiveScreen] = useState<MobileScreenId>("dashboard");

  const screens: { id: MobileScreenId; name: string; icon: any }[] = [
    { id: "dashboard", name: "Home", icon: Home },
    { id: "plan", name: "Plan", icon: Navigation },
    { id: "journey", name: "Route", icon: Compass },
    { id: "tracking", name: "Live HUD", icon: Train },
    { id: "station", name: "Station", icon: MapPin },
    { id: "station3d", name: "3D Map", icon: Maximize2 },
    { id: "passes", name: "Passes", icon: QrCode },
    { id: "payments", name: "Wallet", icon: CreditCard },
    { id: "analytics", name: "Impact", icon: BarChart3 },
    { id: "alerts", name: "Alerts", icon: Bell },
    { id: "profile", name: "Profile", icon: User },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden border-l border-zinc-800/80 shadow-2xl">
      
      {/* ── MOBILE HEADER (Top Navigation Bar) ── */}
      <div className="px-4 py-3 bg-zinc-950/90 border-b border-zinc-850 flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-sm font-black tracking-wider uppercase text-zinc-100 font-mono">
            transitOS <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded ml-1">PWA</span>
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
          Mumbai / Delhi Region
        </span>
      </div>

      {/* ── MAIN CONTENT AREA FOR ACTIVE SCREEN ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">

        {/* SCREEN 1: Dashboard (Home) */}
        {activeScreen === "dashboard" && (
          <div className="space-y-4 animate-slide-in">
            {/* Greeting Header */}
            <div className="flex justify-between items-center bg-gradient-to-r from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-zinc-850">
              <div>
                <h3 className="text-lg font-black text-zinc-100">Good Morning, Gautam 👋</h3>
                <p className="text-xs text-zinc-400">Mumbai Metropolitan Region</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-400">28°C</span>
                <span className="text-[10px] text-zinc-500 block">Clear sky</span>
              </div>
            </div>

            {/* Where do you want to go Search bar */}
            <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 flex items-center space-x-3 text-xs text-zinc-400">
              <Search className="h-4 w-4 text-sky-400 shrink-0" />
              <input
                type="text"
                placeholder="Where do you want to go?"
                className="bg-transparent border-none outline-none text-zinc-100 w-full placeholder-zinc-500 font-medium"
              />
            </div>

            {/* Quick Actions Grid */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">Quick Actions</span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <button onClick={() => setActiveScreen("plan")} className="p-3 bg-zinc-900/60 hover:bg-zinc-850 rounded-2xl border border-zinc-800 flex flex-col items-center gap-1 transition">
                  <Navigation className="h-5 w-5 text-sky-400" />
                  <span className="font-bold text-zinc-300">Plan Journey</span>
                </button>
                <button onClick={() => setActiveScreen("tracking")} className="p-3 bg-zinc-900/60 hover:bg-zinc-850 rounded-2xl border border-zinc-800 flex flex-col items-center gap-1 transition">
                  <Train className="h-5 w-5 text-emerald-400" />
                  <span className="font-bold text-zinc-300">Live Status</span>
                </button>
                <button onClick={() => setActiveScreen("passes")} className="p-3 bg-zinc-900/60 hover:bg-zinc-850 rounded-2xl border border-zinc-800 flex flex-col items-center gap-1 transition">
                  <QrCode className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-zinc-300">Buy Ticket</span>
                </button>
                <button onClick={() => setActiveScreen("payments")} className="p-3 bg-zinc-900/60 hover:bg-zinc-850 rounded-2xl border border-zinc-800 flex flex-col items-center gap-1 transition">
                  <CreditCard className="h-5 w-5 text-violet-400" />
                  <span className="font-bold text-zinc-300">My Passes</span>
                </button>
              </div>
            </div>

            {/* Live Network Status & Smart Card Widget */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-850 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Live Network Status</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Red Line</span>
                    <span className="text-[9px] text-emerald-400 font-bold">Good Service</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Yellow Line</span>
                    <span className="text-[9px] text-amber-400 font-bold">Minor Delays</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Violet Line</span>
                    <span className="text-[9px] text-emerald-400 font-bold">Good Service</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-sky-950/60 to-zinc-900/80 rounded-2xl border border-sky-800/40 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase text-sky-400">NCMC Smart Card</span>
                  <p className="text-xl font-black text-zinc-100 font-mono mt-1">₹256.40</p>
                  <p className="text-[9px] text-zinc-400">Kashmere Gate Entry in 23 min</p>
                </div>
                <button onClick={() => setActiveScreen("payments")} className="mt-2 py-1.5 w-full bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl transition">
                  Add Money
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: Plan Journey (Results) */}
        {activeScreen === "plan" && (
          <div className="space-y-3 animate-slide-in">
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-zinc-400">From: <strong className="text-zinc-100">Kashmere Gate</strong></span>
                <span className="text-zinc-400">To: <strong className="text-zinc-100">HUDA City Centre</strong></span>
              </div>
              <div className="flex gap-2 text-[10px]">
                <span className="px-2 py-1 bg-sky-500/10 text-sky-400 rounded-lg font-bold border border-sky-500/20">Metro Only</span>
                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded-lg font-bold">Leave Now</span>
              </div>
            </div>

            {/* Route Options List */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Recommended Routes</span>

              {/* Option 1 */}
              <div onClick={() => setActiveScreen("journey")} className="p-4 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-2xl space-y-2 transition cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-black bg-yellow-500">Yellow Line</span>
                    <ArrowRight className="h-3 w-3 text-zinc-500" />
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white bg-violet-600">Violet Line</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">₹30</span>
                    <span className="text-[10px] text-zinc-500 block">32 min · 18.6 km</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span>2 Interchanges · 1.2 km walk</span>
                  <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 font-bold rounded">Board Coach 3</span>
                </div>
              </div>

              {/* Option 2 */}
              <div onClick={() => setActiveScreen("journey")} className="p-4 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-2xl space-y-2 transition cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white bg-red-600">Red Line</span>
                    <ArrowRight className="h-3 w-3 text-zinc-500" />
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white bg-violet-600">Violet</span>
                    <ArrowRight className="h-3 w-3 text-zinc-500" />
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-black bg-yellow-500">Yellow</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">₹30</span>
                    <span className="text-[10px] text-zinc-500 block">28 min · 17.1 km</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span>3 Interchanges · 900 m walk</span>
                  <span className="px-2 py-0.5 bg-sky-950/60 text-sky-400 font-bold rounded">Board Coach 1</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: Journey Details */}
        {activeScreen === "journey" && (
          <div className="space-y-4 animate-slide-in">
            <div className="p-4 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-sky-400 font-mono font-bold uppercase">Optimal Route Selected</span>
                <h4 className="text-base font-black text-zinc-100 mt-0.5">Kashmere Gate → HUDA City Centre</h4>
              </div>
              <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">32 min</span>
            </div>

            {/* Timeline */}
            <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-850 space-y-4 relative">
              <div className="flex items-start space-x-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-500/20" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-zinc-100">Kashmere Gate</span>
                    <span className="text-[10px] text-zinc-500 font-mono">9:15 AM</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Board Yellow Line towards Samaypur Badli (Platform 2)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-3 w-3 rounded-full bg-violet-500 mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-zinc-100">Central Secretariat</span>
                    <span className="text-[10px] text-zinc-500 font-mono">9:27 AM</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Change to Violet Line towards Raja Nahar Singh · Walk 120m</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-3 w-3 rounded-full bg-amber-500 mt-1 shrink-0 ring-4 ring-amber-500/20" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-zinc-100">HUDA City Centre</span>
                    <span className="text-[10px] text-zinc-500 font-mono">9:47 AM</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Exit Gate 3 · Arrival at destination</p>
                </div>
              </div>
            </div>

            <button onClick={() => setActiveScreen("tracking")} className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition">
              Start Live Navigation Cockpit
            </button>
          </div>
        )}

        {/* SCREEN 4: Live Train Tracking HUD */}
        {activeScreen === "tracking" && (
          <div className="space-y-4 animate-slide-in">
            {/* Cockpit Visual Header */}
            <div className="h-44 w-full rounded-2xl bg-zinc-900 border border-zinc-800 relative overflow-hidden flex flex-col justify-between p-4">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/60 to-transparent" />
              
              <div className="relative z-10 flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-black bg-yellow-500">Yellow Line</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ON TIME</span>
              </div>

              {/* Metro Train Speedometer HUD */}
              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Current Train Speed</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black font-mono text-sky-400">42</span>
                    <span className="text-xs font-bold text-zinc-400">km/h</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Next Stop: Civil Lines</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">2 min</div>
                </div>
              </div>
            </div>

            {/* HUD Status Widgets */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block">Next Station</span>
                <span className="text-xs font-black text-zinc-200">Civil Lines</span>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block">Arrival ETA</span>
                <span className="text-xs font-black text-emerald-400">9:18 AM</span>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block">Coach Crowd</span>
                <span className="text-xs font-black text-amber-400">Moderate</span>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 5: Station Details */}
        {activeScreen === "station" && (
          <div className="space-y-4 animate-slide-in">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-zinc-100">Kashmere Gate</h3>
                <span className="text-xs font-mono font-bold text-zinc-500">KSG · Elevated</span>
              </div>
              <div className="flex gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black text-white bg-red-600">Red Line</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black text-white bg-violet-600">Violet Line</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black text-black bg-yellow-500">Yellow Line</span>
              </div>
            </div>

            {/* Facilities Icons */}
            <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-850 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available Facilities</span>
              <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 font-bold text-zinc-300">Escalator</div>
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 font-bold text-zinc-300">Lift</div>
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 font-bold text-zinc-300">Stairs</div>
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 font-bold text-zinc-300">Restrooms</div>
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 font-bold text-zinc-300">ATM</div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 6: Interactive 3D Station Map */}
        {activeScreen === "station3d" && (
          <div className="space-y-4 animate-slide-in">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono text-sky-400 font-bold uppercase">3D Spatial Digital Twin</span>
                <h4 className="text-base font-black text-zinc-100">Kashmere Gate Multi-Level Layout</h4>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-1 rounded">3 Levels</span>
            </div>

            {/* Isometric Cutaway Graphic */}
            <div className="h-64 w-full bg-zinc-950 rounded-2xl border border-zinc-800 relative overflow-hidden flex items-center justify-center p-4">
              <div className="w-full space-y-3">
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex justify-between text-xs font-bold text-emerald-400">
                  <span>Street Level · Exits 1 to 4</span>
                  <span>Exit Gate Active</span>
                </div>
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex justify-between text-xs font-bold text-zinc-300">
                  <span>Concourse Level · Ticketing & Shops</span>
                  <span>Security & Gates</span>
                </div>
                <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl flex justify-between text-xs font-bold text-sky-400">
                  <span>Platform Level · Red & Violet Lines</span>
                  <span>Platforms 1 to 4</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 7: Tickets & Passes */}
        {activeScreen === "passes" && (
          <div className="space-y-4 animate-slide-in">
            <div className="p-5 bg-gradient-to-r from-sky-900 to-indigo-950 rounded-2xl border border-sky-800/60 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-sky-300">Monthly Metro Pass</span>
                  <h4 className="text-lg font-black text-white">₹840 / month</h4>
                </div>
                <QrCode className="h-7 w-7 text-sky-300" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-sky-200">
                  <span>Usage Progress</span>
                  <span>48 / 60 Journeys Used</span>
                </div>
                <div className="h-2 w-full bg-sky-950 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full w-[80%]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 8: Payments & Wallet */}
        {activeScreen === "payments" && (
          <div className="space-y-4 animate-slide-in">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-400 font-mono font-bold">NCMC Wallet Balance</span>
              <div className="text-2xl font-black text-zinc-100 font-mono">₹256.40</div>
            </div>

            <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-850 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Recent Transactions</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-850">
                  <div>
                    <span className="font-bold text-zinc-200 block">Metro Ride</span>
                    <span className="text-[9px] text-zinc-500">Kashmere Gate → HUDA City</span>
                  </div>
                  <span className="font-bold text-red-400 font-mono">-₹27</span>
                </div>
                <div className="flex justify-between py-1">
                  <div>
                    <span className="font-bold text-zinc-200 block">UPI Auto Add</span>
                    <span className="text-[9px] text-zinc-500">NCMC Wallet Recharge</span>
                  </div>
                  <span className="font-bold text-emerald-400 font-mono">+₹200</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 9: Analytics & Environmental Impact */}
        {activeScreen === "analytics" && (
          <div className="space-y-4 animate-slide-in">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block">Total Journeys</span>
                <span className="text-base font-black text-zinc-100">18</span>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block">Total Spent</span>
                <span className="text-base font-black text-emerald-400">₹520</span>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                <span className="text-[9px] text-zinc-500 font-bold block">CO₂ Saved</span>
                <span className="text-base font-black text-sky-400">24.6 kg</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center space-x-3">
              <Award className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-emerald-300">Environmental Impact Leader</h5>
                <p className="text-[10px] text-emerald-400/80">Saved 24.6 kg CO₂ this month (Equivalent to planting 1 tree!)</p>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 10: Disruption & Service Alerts Hub */}
        {activeScreen === "alerts" && (
          <div className="space-y-3 animate-slide-in">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Live Disruption Alerts</span>
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="h-4 w-4" />
                <span>Yellow Line · Minor Delays</span>
              </div>
              <p className="text-[10px] text-amber-300/80">Signal maintenance work at Central Secretariat. Expect +4 min delay.</p>
            </div>
          </div>
        )}

        {/* SCREEN 11: Profile & Settings */}
        {activeScreen === "profile" && (
          <div className="space-y-4 animate-slide-in">
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-sky-500 flex items-center justify-center font-black text-zinc-950 text-sm">
                GM
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100">Gautam Mulay</h4>
                <p className="text-[10px] text-zinc-500">NCMC Standard Card Verified</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MOBILE BOTTOM TAB NAVIGATION BAR (Screen Switcher) ── */}
      <div className="px-2 py-2 bg-zinc-950 border-t border-zinc-850 flex justify-between items-center shrink-0 overflow-x-auto scrollbar-none space-x-1">
        {screens.map((screen) => {
          const Icon = screen.icon;
          const isActive = activeScreen === screen.id;
          return (
            <button
              key={screen.id}
              onClick={() => setActiveScreen(screen.id)}
              className={`flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition ${
                isActive
                  ? "bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] mt-0.5 whitespace-nowrap">{screen.name}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
