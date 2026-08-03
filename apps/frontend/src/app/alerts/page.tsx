"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function AlertsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-[32px] font-bold text-[#c3f5ff] mb-1">Network Alerts</h2>
              <p className="text-[16px] text-[#bac9cc]">Real-time status updates and personal notifications.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 pb-2">
              <button className="px-6 py-2 rounded-full bg-[#c3f5ff] text-[#00363d] font-bold text-sm">All</button>
              <button className="px-6 py-2 rounded-full glass-panel text-[#dfe2ee] font-semibold text-sm border border-white/10 hover:bg-white/10">Service</button>
              <button className="px-6 py-2 rounded-full glass-panel text-[#dfe2ee] font-semibold text-sm border border-white/10 hover:bg-white/10">Personal</button>
            </div>

            {/* Alert List */}
            <div className="space-y-4">
              {/* Red Line Delay */}
              <div className="glass-panel p-6 rounded-xl border-l-4 border-l-[#ffb4ab]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#93000a]/40 flex items-center justify-center text-[#ffb4ab] shrink-0 font-bold">
                    ⚠️
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[18px] font-semibold text-[#dfe2ee]">Red Line - Severe Delays</h3>
                      <span className="text-[12px] text-[#bac9cc]">10 MINS AGO</span>
                    </div>
                    <p className="text-[14px] text-[#bac9cc] mb-3">Signal maintenance near Andheri. Delays up to 20 mins expected.</p>
                    <span className="px-2.5 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] text-[12px] font-bold">Red Line</span>
                  </div>
                </div>
              </div>

              {/* Yellow Line Minor Delay */}
              <div className="glass-panel p-6 rounded-xl border-l-4 border-l-[#fec931]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#fec931]/20 flex items-center justify-center text-[#fec931] shrink-0 font-bold">
                    ⏱
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[18px] font-semibold text-[#dfe2ee]">Yellow Line - Minor Delays</h3>
                      <span className="text-[12px] text-[#bac9cc]">45 MINS AGO</span>
                    </div>
                    <p className="text-[14px] text-[#bac9cc] mb-3">Reduced train speeds near Dahisar due to scheduled track inspection.</p>
                    <span className="px-2.5 py-1 rounded bg-[#EAB308]/20 text-[#EAB308] text-[12px] font-bold">Yellow Line</span>
                  </div>
                </div>
              </div>

              {/* Escalator Maintenance */}
              <div className="glass-panel p-6 rounded-xl border-l-4 border-l-[#c3f5ff]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#c3f5ff]/20 flex items-center justify-center text-[#c3f5ff] shrink-0 font-bold">
                    🛠
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[18px] font-semibold text-[#dfe2ee]">Station Maintenance</h3>
                      <span className="text-[12px] text-[#bac9cc]">2 HRS AGO</span>
                    </div>
                    <p className="text-[14px] text-[#bac9cc] mb-3">Escalator #2 under maintenance at Kashmere Gate. Use Gate C elevators.</p>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-[#dfe2ee] text-[12px] font-bold">Kashmere Gate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
