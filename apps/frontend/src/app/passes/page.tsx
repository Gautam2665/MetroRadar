"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { CITY_METADATA } from "../../config/cityMetadata";

export default function TicketsAndPassesPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [walletBalance, setWalletBalance] = useState(256.4);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState("200");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const handleAddMoney = () => {
    const val = parseFloat(addAmount);
    if (!isNaN(val) && val > 0) {
      setWalletBalance((prev) => prev + val);
      setShowAddMoneyModal(false);
    }
  };

  const transactions = [
    {
      id: "tx-1",
      title: "Metro Ride",
      route: `${currentMeta.upcomingJourney.from} ➔ ${currentMeta.upcomingJourney.to}`,
      time: "Today, 9:47 AM",
      amount: "- ₹27",
      type: "debit",
      icon: "subway",
    },
    {
      id: "tx-2",
      title: "Add Money",
      route: "NCMC Wallet Top-Up",
      time: "18 May, 8:12 PM",
      amount: "+ ₹200",
      type: "credit",
      icon: "add_card",
    },
    {
      id: "tx-3",
      title: "Metro Ride",
      route: `${currentMeta.quickPills[1] || "Rajiv Chowk"} ➔ ${currentMeta.quickPills[0]}`,
      time: "18 May, 6:32 PM",
      amount: "- ₹27",
      type: "debit",
      icon: "subway",
    },
    {
      id: "tx-4",
      title: "Pass Renewal",
      route: `${currentMeta.code} Monthly Metro Pass`,
      time: "15 May, 11:30 AM",
      amount: "- ₹840",
      type: "debit",
      icon: "autorenew",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">Tickets & Passes</h1>
            <p className="text-sm text-[#bac9cc] mt-1">
              Manage your active smart passes, digital NCMC wallet, and ride tickets for {currentMeta.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Active Pass & Other Passes (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Active Monthly Pass Card */}
              <div className="glass-card rounded-2xl p-6 border border-[#00e5ff]/30 bg-gradient-to-br from-[#1c2028]/90 to-[#0f131c] relative overflow-hidden shadow-2xl">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#00e5ff]/10 to-transparent pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#dfe2ee]">{currentMeta.code} Monthly Metro Pass</h3>
                    <p className="text-xs text-[#bac9cc] mt-1">Valid till 25 Aug 2026</p>
                  </div>
                  <div className="bg-[#10B981]/20 px-3 py-1 rounded-full border border-[#10B981]/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span className="text-xs font-bold text-[#10B981]">Active</span>
                  </div>
                </div>

                <div className="space-y-4 my-4">
                  <span className="text-3xl font-bold text-[#00e5ff]">₹840</span>

                  <div>
                    <div className="flex justify-between text-xs text-[#bac9cc] mb-1 font-bold">
                      <span>48 / 60 Journeys Used</span>
                      <span className="text-[#00e5ff]">80%</span>
                    </div>
                    <div className="w-full h-2 bg-[#31353e] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00e5ff] rounded-full w-[80%]"></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 mt-2 border-t border-white/10">
                  <button className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors">
                    View Pass QR
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-[#00e5ff] text-[#00363d] text-sm font-bold hover:bg-[#00daf3] transition-colors shadow">
                    Renew Pass
                  </button>
                </div>
              </div>

              {/* Other Passes */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Other Available Passes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Weekly Pass */}
                  <div className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#00e5ff]/40 transition-all flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#7000ff]/20 flex items-center justify-center text-[#d1bcff]">
                        <span className="material-symbols-outlined">confirmation_number</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#dfe2ee] text-sm">Weekly Pass</h4>
                        <p className="text-xs text-[#bac9cc]">Unlimited 7-Day Trips</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-[#dfe2ee] block">₹250</span>
                      <button className="text-xs text-[#00e5ff] font-bold hover:underline">Buy Now</button>
                    </div>
                  </div>

                  {/* Daily Pass */}
                  <div className="glass-card rounded-xl p-4 border border-white/10 hover:border-[#00e5ff]/40 transition-all flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#00e5ff]/20 flex items-center justify-center text-[#00e5ff]">
                        <span className="material-symbols-outlined">confirmation_number</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#dfe2ee] text-sm">Daily Tourist Pass</h4>
                        <p className="text-xs text-[#bac9cc]">1-Day Unlimited</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-[#dfe2ee] block">₹60</span>
                      <button className="text-xs text-[#00e5ff] font-bold hover:underline">Buy Now</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: NCMC Wallet & Transactions (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Wallet Summary */}
              <div className="glass-card rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-[#bac9cc]">
                    <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                    <span className="text-xs font-bold uppercase tracking-wider">NCMC Virtual Card</span>
                  </div>
                  <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/20 px-2 py-0.5 rounded">Linked</span>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-[#bac9cc] mb-1">Current Balance</p>
                    <h3 className="text-3xl font-bold text-[#dfe2ee]">₹{walletBalance.toFixed(2)}</h3>
                  </div>
                  <button
                    onClick={() => setShowAddMoneyModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#00e5ff] text-[#00363d] font-bold text-sm hover:bg-[#00daf3] transition-colors shadow"
                  >
                    + Add Money
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="glass-card rounded-2xl p-6 border border-white/10 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Recent Transactions</h3>
                  <button className="text-xs text-[#00e5ff] font-bold hover:underline">View All</button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1 scrollbar-hide">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-3 bg-[#181c24]/50 rounded-xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#262a33] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#00e5ff] text-lg">{tx.icon}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#dfe2ee]">{tx.title}</h4>
                          <p className="text-xs text-[#bac9cc]">{tx.route}</p>
                          <p className="text-[10px] text-[#bac9cc]/70 mt-0.5">{tx.time}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${tx.type === "credit" ? "text-[#10B981]" : "text-[#dfe2ee]"}`}>
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Money Modal */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card bg-[#1c2028] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-in">
            <h3 className="text-lg font-bold text-[#dfe2ee] mb-2">Recharge NCMC Wallet</h3>
            <p className="text-xs text-[#bac9cc] mb-6">Enter top-up amount for instant NFC metro tap access.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#bac9cc] font-bold block mb-1">Enter Amount (₹)</label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full bg-[#181c24] border border-white/10 rounded-xl p-3 text-lg font-bold text-[#00e5ff] focus:outline-none focus:border-[#00e5ff]"
                />
              </div>

              <div className="flex gap-2">
                {["100", "200", "500", "1000"].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAddAmount(amt)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-[#dfe2ee] hover:bg-white/10"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowAddMoneyModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMoney}
                  className="flex-1 py-3 rounded-xl bg-[#00e5ff] text-[#00363d] text-sm font-bold hover:bg-[#00daf3]"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
