"use client";

import Header from "@/components/dashboard/Header";
import { CreditCard, QrCode, ShieldCheck, Sparkles } from "lucide-react";

export default function PassesPage() {
  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-zinc-850">
          <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
              Digital Transit Passes & QR Tickets
            </h1>
            <p className="text-xs text-zinc-500">
              Universal digital pass issuance for KMRL, DMRC, HMRL, and BMRCL networks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Pass Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between h-56">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                  TRANSITOS UNIFIED METRO PASS
                </span>
                <h2 className="text-base font-black text-white mt-1">KMRL & DMRC Network Pass</h2>
              </div>
              <Sparkles className="text-sky-400 h-5 w-5" />
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-xl bg-white text-zinc-950">
                <QrCode size={48} />
              </div>
              <div className="text-xs text-zinc-300 space-y-1">
                <p><span className="text-zinc-500">Pass ID:</span> TR-PASS-8842</p>
                <p><span className="text-zinc-500">Validity:</span> 30 Days Unlimited</p>
                <p><span className="text-zinc-500">Status:</span> <span className="text-emerald-400 font-bold">● ACTIVE</span></p>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-sky-500/20 pt-3 text-[10px] text-zinc-400">
              <span>Holder: Passenger Account</span>
              <span>Expires: Aug 31, 2026</span>
            </div>
          </div>

          {/* Pass Types Overview */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">
              Available Pass Products
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-100">1-Day Tourist Pass</p>
                  <p className="text-[10px] text-zinc-500">Unlimited metro travel for 24 hours</p>
                </div>
                <span className="text-xs font-extrabold text-sky-400">₹200</span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-100">3-Day Unlimited Pass</p>
                  <p className="text-[10px] text-zinc-500">Unlimited metro travel across all lines</p>
                </div>
                <span className="text-xs font-extrabold text-sky-400">₹500</span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-100">30-Day Commuter Pass</p>
                  <p className="text-[10px] text-zinc-500">Monthly pass with 20% fare discount</p>
                </div>
                <span className="text-xs font-extrabold text-sky-400">₹1,800</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
