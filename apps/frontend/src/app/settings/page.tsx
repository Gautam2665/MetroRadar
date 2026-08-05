"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { CITY_METADATA } from "../../config/cityMetadata";

export default function SettingsPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [pushNotifs, setPushNotifs] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);
  const [darkTheme, setDarkTheme] = useState(true);

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#dfe2ee] tracking-tight">Account & Platform Settings</h1>
              <p className="text-sm text-[#bac9cc] mt-1">
                Customize your transitOS profile, NCMC smart card rules, and notification preferences.
              </p>
            </div>

            {/* Profile Section */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#00e5ff] shadow">
                  <img
                    alt="Gautam Mulay Avatar"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC28bNDbt1eYF5GFk5J8vr0g9_MjbfaNe6NI7CVAYFFyqdFnGjQRpMW93Go6mxvoRAfQg0Bv9eYl9sHjlJxehFWTWeIuIx-YK9vUcMB3sU5LMUGjPWjzzXq0n50Wrb3xY-9dt3o2Yujcgwv8r9NPskDFyp4hSt02EerwBGG9W1xgbO0fQ7wk4BHLm0nP7tZGCW5lihiUh73Kz1SnPAOq86067_XmtlJg7uc5qPLYXG0HhZUkk4HMGZf"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#dfe2ee]">Gautam Mulay</h3>
                  <p className="text-xs text-[#bac9cc]">gautam.mulay@transitOS.in • +91 98200 12345</p>
                  <span className="inline-block text-[10px] font-bold text-[#10B981] bg-[#10B981]/20 px-2.5 py-0.5 rounded mt-2">
                    Verified Commuter
                  </span>
                </div>
              </div>
              <button className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[#dfe2ee] hover:bg-white/10 transition-colors">
                Edit Profile
              </button>
            </div>

            {/* Default Metro System */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Primary Transit Authority</h3>
              <div className="p-4 bg-[#181c24] rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-[#dfe2ee]">{currentMeta.name}</h4>
                  <p className="text-xs text-[#bac9cc]">{currentMeta.code} Metro Operating Authority</p>
                </div>
                <span className="text-xs font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-3 py-1 rounded-full border border-[#00e5ff]/30">
                  {currentMeta.code} ACTIVE
                </span>
              </div>
            </div>

            {/* Notifications & Alert Preferences */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Notifications & Alerts</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center pt-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#dfe2ee]">Real-time Delay Advisories</h4>
                    <p className="text-xs text-[#bac9cc]">Get push alerts for delays over 10 mins on saved routes.</p>
                  </div>
                  <button
                    onClick={() => setDelayAlerts(!delayAlerts)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${delayAlerts ? "bg-[#00e5ff]" : "bg-[#31353e]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-[#080C14] transition-transform ${delayAlerts ? "translate-x-6" : "translate-x-0"}`}></div>
                  </button>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#dfe2ee]">NCMC Wallet Low Balance Warnings</h4>
                    <p className="text-xs text-[#bac9cc]">Notify when wallet balance falls under ₹100 threshold.</p>
                  </div>
                  <button
                    onClick={() => setPushNotifs(!pushNotifs)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${pushNotifs ? "bg-[#00e5ff]" : "bg-[#31353e]"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-[#080C14] transition-transform ${pushNotifs ? "translate-x-6" : "translate-x-0"}`}></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Interface Theme & System Diagnostics */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Appearance & Diagnostics</h3>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <h4 className="text-sm font-bold text-[#dfe2ee]">Cyber Dark Aesthetic</h4>
                  <p className="text-xs text-[#bac9cc]">OLED black surface system with glassmorphic accents.</p>
                </div>
                <button
                  onClick={() => setDarkTheme(!darkTheme)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${darkTheme ? "bg-[#00e5ff]" : "bg-[#31353e]"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-[#080C14] transition-transform ${darkTheme ? "translate-x-6" : "translate-x-0"}`}></div>
                </button>
              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-xs text-[#bac9cc]">
                <span>transitOS Version 0.3.5 (Build 2026.08)</span>
                <span className="text-[#10B981] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span> All Systems Operational
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
