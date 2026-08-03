"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-[32px] font-bold text-[#dfe2ee] mb-1">Analytics & Sustainability Impact</h2>
              <p className="text-[16px] text-[#bac9cc]">Track your carbon savings, financial efficiency, and commuting patterns.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card rounded-xl p-6 border border-white/10">
                <p className="text-[12px] font-bold text-[#bac9cc] uppercase">Monthly CO₂ Avoided</p>
                <h3 className="text-[36px] font-bold text-[#4ade80] mt-2">24.6 <span className="text-sm text-[#bac9cc]">kg</span></h3>
                <p className="text-[12px] text-[#bac9cc] mt-2">Equivalent to planting 1 tree</p>
              </div>

              <div className="glass-card rounded-xl p-6 border border-white/10">
                <p className="text-[12px] font-bold text-[#bac9cc] uppercase">Money Saved vs Auto/Cab</p>
                <h3 className="text-[36px] font-bold text-[#c3f5ff] mt-2">₹1,320</h3>
                <p className="text-[12px] text-[#bac9cc] mt-2">Based on 42 completed trips</p>
              </div>

              <div className="glass-card rounded-xl p-6 border border-white/10">
                <p className="text-[12px] font-bold text-[#bac9cc] uppercase">On-Time Reliability</p>
                <h3 className="text-[36px] font-bold text-[#fec931] mt-2">98.4%</h3>
                <p className="text-[12px] text-[#bac9cc] mt-2">Average commute delay &lt; 2 mins</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
