"use client";

import Header from "@/components/dashboard/Header";
import { Wallet, Shield, Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useState } from "react";

export default function PaymentsPage() {
  const [balance, setBalance] = useState(550);

  const topUpWallet = (amount: number) => {
    setBalance((prev) => prev + amount);
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-zinc-850">
          <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
              TransitOS Stored-Value Wallet & NCMC Card
            </h1>
            <p className="text-xs text-zinc-500">
              Pre-loaded stored-value wallet for zero-friction tap & go fare deductions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wallet Balance Card */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                TRANSITOS STORED BALANCE
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>

            <div>
              <p className="text-3xl font-black text-white">₹{balance}.00</p>
              <p className="text-xs text-zinc-500 mt-1">Instant gate deductions across all 6 networks</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => topUpWallet(100)}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <Plus size={14} />
                <span>Add ₹100</span>
              </button>
              <button
                onClick={() => topUpWallet(500)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                <Plus size={14} />
                <span>Add ₹500</span>
              </button>
            </div>
          </div>

          {/* NCMC Card Integration */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Linked NCMC Card
              </h2>
              <Shield size={16} className="text-sky-400" />
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                National Common Mobility Card
              </p>
              <p className="text-sm font-mono font-bold text-zinc-200">
                •••• •••• •••• 9012
              </p>
              <p className="text-[10px] text-zinc-400">Issued by SBI / TransitOS Partner</p>
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              NCMC cards support offline EMV contact/contactless gate taps. Top-up through TransitOS updates your stored wallet balance instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
