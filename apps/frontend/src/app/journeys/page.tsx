"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function JourneysPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-[32px] font-bold text-[#dfe2ee]">My Journeys</h2>
                <p className="text-[16px] text-[#bac9cc]">Manage saved daily commutes and review past travel logs.</p>
              </div>
            </div>

            {/* Saved Commutes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Home to Work */}
              <div className="glass-card rounded-xl p-5 border border-white/10 flex flex-col justify-between hover:border-[#c3f5ff]/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#dfe2ee]">Home to Work (BKC)</h3>
                    <p className="text-[12px] text-[#4ade80] font-bold mt-1">● On Time</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#1c2028] p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-[#bac9cc] uppercase font-bold">Est. Duration</p>
                    <p className="text-[24px] font-bold text-[#dfe2ee]">42 <span className="text-xs font-normal">min</span></p>
                  </div>
                  <div className="bg-[#1c2028] p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-[#bac9cc] uppercase font-bold">Distance</p>
                    <p className="text-[24px] font-bold text-[#dfe2ee]">18.6 <span className="text-xs font-normal">km</span></p>
                  </div>
                </div>
                <button className="w-full py-3 rounded-lg bg-[#c3f5ff] text-[#00363d] font-bold text-[14px] hover:bg-[#00daf3] transition-colors">
                  Start Route Navigation
                </button>
              </div>

              {/* Dahisar to Andheri */}
              <div className="glass-card rounded-xl p-5 border border-white/10 flex flex-col justify-between hover:border-[#c3f5ff]/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#dfe2ee]">Dahisar to Andheri</h3>
                    <p className="text-[12px] text-[#fec931] font-bold mt-1">● Minor Delays</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#1c2028] p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-[#bac9cc] uppercase font-bold">Est. Duration</p>
                    <p className="text-[24px] font-bold text-[#dfe2ee]">35 <span className="text-xs font-normal">min</span></p>
                  </div>
                  <div className="bg-[#1c2028] p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] text-[#bac9cc] uppercase font-bold">Distance</p>
                    <p className="text-[24px] font-bold text-[#dfe2ee]">15.2 <span className="text-xs font-normal">km</span></p>
                  </div>
                </div>
                <button className="w-full py-3 rounded-lg bg-[#c3f5ff] text-[#00363d] font-bold text-[14px] hover:bg-[#00daf3] transition-colors">
                  Start Route Navigation
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
