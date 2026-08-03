"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function PaymentsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-[32px] font-bold text-[#dfe2ee]">Payments & Wallet</h2>
              <p className="text-[16px] text-[#bac9cc]">Manage your NCMC smart card balance and transit pass transactions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Wallet Card */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-card rounded-xl p-6 border border-white/10 relative overflow-hidden">
                  <p className="text-[14px] text-[#bac9cc] mb-1">Wallet Balance</p>
                  <h3 className="text-[32px] font-bold text-[#c3f5ff] mb-6">₹256.40</h3>
                  <button className="w-full py-3 bg-[#c3f5ff] text-[#00363d] rounded-lg font-bold text-[16px] hover:opacity-90 transition-opacity">
                    + Add Money
                  </button>
                </div>

                <div className="glass-card rounded-xl p-6 border border-white/10">
                  <h3 className="text-[18px] font-semibold text-[#dfe2ee] mb-4">Saved Payment Methods</h3>
                  <div className="space-y-3">
                    <div className="p-4 glass-panel rounded-lg flex items-center justify-between border border-white/10">
                      <div>
                        <h4 className="font-semibold text-[#dfe2ee]">NCMC Standard Card</h4>
                        <p className="text-[12px] text-[#bac9cc]">Default Transit Smart Card</p>
                      </div>
                      <span className="text-[#c3f5ff] font-bold text-xs">ACTIVE</span>
                    </div>
                    <div className="p-4 glass-panel rounded-lg flex items-center justify-between border border-white/5">
                      <div>
                        <h4 className="font-semibold text-[#dfe2ee]">UPI AutoPay</h4>
                        <p className="text-[12px] text-[#bac9cc]">gautam@okaxis</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="lg:col-span-8">
                <div className="glass-card rounded-xl p-6 border border-white/10 h-full flex flex-col">
                  <h3 className="text-[18px] font-semibold text-[#dfe2ee] mb-4">Recent Transactions</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-hide">
                    {[
                      { title: "Metro Ride - Andheri to BKC", time: "Today, 09:15 AM", amount: "-₹45.00", color: "#ffb4ab" },
                      { title: "Wallet Auto-Recharge (UPI)", time: "Yesterday", amount: "+₹500.00", color: "#c3f5ff" },
                      { title: "Bus Ticket - Route 4L", time: "Mon, 14 Aug", amount: "-₹15.00", color: "#ffb4ab" },
                      { title: "Metro Ride - BKC to Andheri", time: "Mon, 14 Aug", amount: "-₹45.00", color: "#ffb4ab" },
                    ].map((tx, idx) => (
                      <div key={idx} className="p-4 glass-panel rounded-lg flex items-center justify-between border border-white/5 hover:bg-white/5 transition-colors">
                        <div>
                          <h4 className="text-[16px] font-semibold text-[#dfe2ee]">{tx.title}</h4>
                          <p className="text-[12px] text-[#bac9cc]">{tx.time}</p>
                        </div>
                        <span className="text-[16px] font-bold" style={{ color: tx.color }}>
                          {tx.amount}
                        </span>
                      </div>
                    ))}
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
