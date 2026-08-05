"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { CITY_METADATA } from "../../config/cityMetadata";

export default function PaymentsPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [autoTopUp, setAutoTopUp] = useState(true);
  const [walletBalance, setWalletBalance] = useState(256.4);
  const [selectedMethod, setSelectedMethod] = useState("upi");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const paymentMethods = [
    { id: "upi", name: "Google Pay / BHIM UPI", detail: "gautam@okaxis", icon: "qr_code_2", default: true },
    { id: "card", name: "HDFC Bank Credit Card", detail: "•••• 4092", icon: "credit_card", default: false },
    { id: "netbanking", name: "State Bank of India", detail: "Net Banking", icon: "account_balance", default: false },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">Payments & Auto-Reload</h1>
            <p className="text-sm text-[#bac9cc] mt-1">
              Manage NCMC wallet auto-reload rules, UPI links, and billing history for {currentMeta.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Wallet & Auto-Reload Settings (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* NCMC Card & Balance */}
              <div className="glass-card rounded-2xl p-6 border border-[#00e5ff]/30 bg-gradient-to-r from-[#1c2028] via-[#181c24] to-[#0f131c] shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-bold text-[#00e5ff] uppercase tracking-wider">National Common Mobility Card</span>
                    <h3 className="text-2xl font-bold text-[#dfe2ee] mt-1">NCMC Virtual Pass</h3>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-[#00e5ff]">contactless</span>
                </div>

                <div className="flex justify-between items-end my-4">
                  <div>
                    <p className="text-xs text-[#bac9cc]">Available Wallet Balance</p>
                    <h2 className="text-4xl font-bold text-[#dfe2ee]">₹{walletBalance.toFixed(2)}</h2>
                  </div>
                  <button
                    onClick={() => setWalletBalance((prev) => prev + 200)}
                    className="px-5 py-2.5 rounded-xl bg-[#00e5ff] text-[#00363d] font-bold text-sm hover:bg-[#00daf3] transition-colors shadow"
                  >
                    + Quick ₹200 Top-Up
                  </button>
                </div>
              </div>

              {/* Auto-Reload Rules */}
              <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-[#dfe2ee]">Auto-Reload Protection</h3>
                    <p className="text-xs text-[#bac9cc] mt-0.5">Automatically top-up wallet when balance drops below threshold.</p>
                  </div>
                  <button
                    onClick={() => setAutoTopUp(!autoTopUp)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${autoTopUp ? "bg-[#00e5ff]" : "bg-[#31353e]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-[#080C14] transition-transform ${autoTopUp ? "translate-x-6" : "translate-x-0"}`}></div>
                  </button>
                </div>

                {autoTopUp && (
                  <div className="p-4 bg-[#181c24] rounded-xl border border-white/5 space-y-3 animate-slide-in">
                    <div className="flex justify-between text-xs text-[#bac9cc] font-semibold">
                      <span>Trigger Threshold: <strong className="text-[#dfe2ee]">₹100</strong></span>
                      <span>Reload Amount: <strong className="text-[#00e5ff]">₹300</strong></span>
                    </div>
                    <p className="text-[11px] text-[#bac9cc]/70">Drawn via primary UPI link (gautam@okaxis) with zero transaction fee.</p>
                  </div>
                )}
              </div>

              {/* Saved Payment Methods */}
              <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Saved Payment Methods</h3>
                  <button className="text-xs text-[#00e5ff] font-bold hover:underline">+ Add New Method</button>
                </div>

                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                        selectedMethod === method.id
                          ? "border-[#00e5ff]/50 bg-white/5 shadow"
                          : "border-white/5 bg-[#181c24]/50 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center text-[#00e5ff]">
                          <span className="material-symbols-outlined">{method.icon}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#dfe2ee]">{method.name}</h4>
                          <p className="text-xs text-[#bac9cc]">{method.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.default && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-bold">Default</span>
                        )}
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === method.id ? "border-[#00e5ff] bg-[#00e5ff]" : "border-white/20"}`}>
                          {selectedMethod === method.id && <span className="w-1.5 h-1.5 rounded-full bg-[#080C14]"></span>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Billing History (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="glass-card rounded-2xl p-6 border border-white/10 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Billing Statements</h3>
                  <button className="text-xs text-[#00e5ff] font-bold hover:underline">Download PDF</button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1 scrollbar-hide">
                  {[
                    { id: "b1", desc: "Auto-Reload (UPI Top-Up)", date: "02 Aug 2026, 09:12 AM", amount: "+ ₹300.00", status: "Success" },
                    { id: "b2", desc: "Monthly Metro Pass Renewal", date: "25 Jul 2026, 04:30 PM", amount: "- ₹840.00", status: "Success" },
                    { id: "b3", desc: "NCMC Tap Fare Deduct", date: "24 Jul 2026, 08:45 AM", amount: "- ₹27.00", status: "Success" },
                    { id: "b4", desc: "NCMC Tap Fare Deduct", date: "23 Jul 2026, 06:15 PM", amount: "- ₹30.00", status: "Success" },
                  ].map((item) => (
                    <div key={item.id} className="p-3 bg-[#181c24]/50 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#dfe2ee]">{item.desc}</h4>
                        <p className="text-xs text-[#bac9cc] mt-0.5">{item.date}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold block ${item.amount.startsWith("+") ? "text-[#10B981]" : "text-[#dfe2ee]"}`}>
                          {item.amount}
                        </span>
                        <span className="text-[10px] text-[#10B981] font-bold">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
