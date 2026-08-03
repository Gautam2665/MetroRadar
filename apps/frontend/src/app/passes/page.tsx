"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function PassesPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-[32px] font-bold text-[#dfe2ee] mb-1">Tickets & Passes</h2>
              <p className="text-[16px] text-[#bac9cc]">NCMC Smart Passes, Single Journey QR Tickets, and Unlimited Day Passes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#7000ff]/20 to-transparent">
                <span className="text-[12px] font-bold text-[#c3f5ff] uppercase tracking-wider">Active Smart Pass</span>
                <h3 className="text-[24px] font-bold text-[#dfe2ee] mt-2">NCMC All-Metro Pass</h3>
                <p className="text-[14px] text-[#bac9cc] mt-1">Valid across Delhi, Mumbai, Bengaluru & Kochi networks</p>
                <div className="mt-8 flex justify-between items-end">
                  <span className="text-[20px] font-bold text-[#c3f5ff]">₹256.40 Balance</span>
                  <span className="text-[12px] text-[#4ade80] font-bold">● ACTIVE</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[12px] font-bold text-[#fec931] uppercase tracking-wider">QR Mobile Ticket</span>
                  <h3 className="text-[24px] font-bold text-[#dfe2ee] mt-2">Kashmere Gate ➔ BKC</h3>
                  <p className="text-[14px] text-[#bac9cc] mt-1">Single Journey • Valid for 180 Mins</p>
                </div>
                <button className="w-full py-3 mt-6 bg-[#c3f5ff] text-[#00363d] rounded-lg font-bold hover:bg-[#00daf3] transition-colors">
                  View QR Ticket
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
