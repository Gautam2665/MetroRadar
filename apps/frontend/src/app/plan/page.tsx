"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function PlanPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-[32px] font-bold text-[#c3f5ff]">Multimodal Journey Pathfinder</h1>
                <p className="text-[16px] text-[#bac9cc]">Find fastest combined Metro, Bus, Train, and Walking routes.</p>
              </div>
            </div>

            {/* Route Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-[20px] font-bold text-[#dfe2ee]">Option 1: Red Line + Yellow Line</h3>
                  <span className="px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold text-xs">
                    Fastest (32 Mins)
                  </span>
                </div>
                <p className="text-[14px] text-[#bac9cc]">From Andheri West to BKC Office Park via Kashmere Gate Transfer</p>
                <div className="flex items-center gap-4 text-xs font-bold text-[#c3f5ff]">
                  <span>⏱ 32 min total</span>
                  <span>↔ 18.6 km</span>
                  <span>💳 ₹30 fare</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-[20px] font-bold text-[#dfe2ee]">Option 2: Direct Metro + Bus Shuttles</h3>
                  <span className="px-3 py-1 rounded-full bg-[#EAB308]/20 text-[#EAB308] font-bold text-xs">
                    Least Walking (38 Mins)
                  </span>
                </div>
                <p className="text-[14px] text-[#bac9cc]">Direct Metro line with 200m final bus transfer</p>
                <div className="flex items-center gap-4 text-xs font-bold text-[#c3f5ff]">
                  <span>⏱ 38 min total</span>
                  <span>↔ 19.2 km</span>
                  <span>💳 ₹35 fare</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
