"use client";

import Header from "@/components/dashboard/Header";
import { BarChart3, Database, Layers, Activity, Sparkles } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full space-y-8">
        <div className="flex items-center space-x-3 pb-4 border-b border-zinc-850">
          <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
              National Transit Infrastructure Analytics
            </h1>
            <p className="text-xs text-zinc-500">
              CTM v1.0 Database Metrics across 6 Certified Metro Networks
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex justify-between text-sky-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">SYSTEMS</span>
              <Database size={16} />
            </div>
            <p className="text-2xl font-black text-white">6</p>
            <p className="text-[10px] text-zinc-500">Certified Metro Networks</p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex justify-between text-emerald-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">STATIONS</span>
              <Layers size={16} />
            </div>
            <p className="text-2xl font-black text-white">290</p>
            <p className="text-[10px] text-zinc-500">PostGIS Geocoded Stations</p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex justify-between text-purple-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">LINES</span>
              <Activity size={16} />
            </div>
            <p className="text-2xl font-black text-white">38</p>
            <p className="text-[10px] text-zinc-500">Active Operational Lines</p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex justify-between text-amber-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">TRIPS</span>
              <Sparkles size={16} />
            </div>
            <p className="text-2xl font-black text-white">5,888</p>
            <p className="text-[10px] text-zinc-500">Seeded Daily Trips</p>
          </div>
        </div>

        {/* Network Breakdown Table */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-200">
            Certified System Health Matrix
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-850">
                  <th className="py-2.5 px-3">System Code</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Source Type</th>
                  <th className="py-2.5 px-3">Trust Tier</th>
                  <th className="py-2.5 px-3 text-right">Quality Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                <tr>
                  <td className="py-3 px-3 font-bold text-sky-400">DMRC</td>
                  <td className="py-3 px-3">Delhi-NCR</td>
                  <td className="py-3 px-3">OFFICIAL</td>
                  <td className="py-3 px-3"><span className="text-emerald-400 font-bold">TIER A</span></td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">90/100 🥇</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-sky-400">KMRL</td>
                  <td className="py-3 px-3">Kochi</td>
                  <td className="py-3 px-3">OFFICIAL</td>
                  <td className="py-3 px-3"><span className="text-emerald-400 font-bold">TIER A</span></td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">90/100 🥇</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-sky-400">HMRL</td>
                  <td className="py-3 px-3">Hyderabad</td>
                  <td className="py-3 px-3">OFFICIAL</td>
                  <td className="py-3 px-3"><span className="text-emerald-400 font-bold">TIER A</span></td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">100/100 🥇</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-sky-400">BMRCL</td>
                  <td className="py-3 px-3">Bengaluru</td>
                  <td className="py-3 px-3">COMMUNITY</td>
                  <td className="py-3 px-3"><span className="text-indigo-400 font-bold">TIER B</span></td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">100/100 🥇</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-sky-400">CMRL</td>
                  <td className="py-3 px-3">Chennai</td>
                  <td className="py-3 px-3">COMMUNITY</td>
                  <td className="py-3 px-3"><span className="text-indigo-400 font-bold">TIER B</span></td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">100/100 🥇</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-sky-400">GMRC</td>
                  <td className="py-3 px-3">Ahmedabad</td>
                  <td className="py-3 px-3">COMMUNITY</td>
                  <td className="py-3 px-3"><span className="text-indigo-400 font-bold">TIER B</span></td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400">85/100 🥈</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
