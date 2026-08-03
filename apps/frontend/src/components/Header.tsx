"use client";

import { useState } from "react";
import Link from "next/link";

interface HeaderProps {
  activeCity?: string;
  onCityChange?: (city: string) => void;
}

const CITIES = [
  { code: "mumbai", name: "Mumbai, MH", badge: "Live" },
  { code: "delhi", name: "Delhi, IN", badge: "Certified" },
  { code: "kochi", name: "Kochi, KL", badge: "Certified" },
  { code: "hyderabad", name: "Hyderabad, IN", badge: "Certified" },
  { code: "bengaluru", name: "Bengaluru, IN", badge: "Certified" },
  { code: "chennai", name: "Chennai, IN", badge: "Certified" },
  { code: "ahmedabad", name: "Ahmedabad, IN", badge: "Certified" },
];

export function Header({ activeCity = "delhi", onCityChange }: HeaderProps) {
  const [openCityMenu, setOpenCityMenu] = useState(false);
  const currentCityObj = CITIES.find((c) => c.code === activeCity) || CITIES[1];

  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-[#080C14]/90 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
      <div className="flex-1 flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative w-96 hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bac9cc] text-sm">
            search
          </span>
          <input
            className="w-full bg-[#1c2028]/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[14px] focus:outline-none focus:border-[#c3f5ff]/50 text-[#dfe2ee] placeholder:text-[#bac9cc]/50"
            placeholder="Search for a station, place or line..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Weather Status */}
        <div className="flex items-center gap-2 hidden sm:flex">
          <span className="material-symbols-outlined text-[#fec931] text-[20px]">wb_sunny</span>
          <div className="text-right">
            <p className="text-[14px] font-semibold text-[#dfe2ee]">28°C</p>
            <p className="text-[10px] text-[#bac9cc] leading-none">{currentCityObj.name}</p>
          </div>
        </div>

        {/* Dynamic City Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenCityMenu(!openCityMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#c3f5ff]/50 transition-colors text-[#c3f5ff] text-[14px] font-semibold"
          >
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span>{currentCityObj.name}</span>
            <span className="material-symbols-outlined text-xs">expand_more</span>
          </button>

          {openCityMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#1c2028] border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-slide-in">
              <div className="px-3 py-1 text-[10px] font-bold text-[#bac9cc] uppercase tracking-wider border-b border-white/5">
                Certified Metro Networks
              </div>
              {CITIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    if (onCityChange) onCityChange(c.code);
                    setOpenCityMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[14px] flex items-center justify-between hover:bg-white/5 transition-colors ${
                    activeCity === c.code ? "text-[#c3f5ff] font-bold bg-white/5" : "text-[#dfe2ee]"
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c3f5ff]/10 text-[#c3f5ff] border border-[#c3f5ff]/30">
                    {c.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Link href="/alerts" className="relative text-[#bac9cc] hover:text-[#c3f5ff] transition-colors p-2 rounded-full hover:bg-white/5">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ffb4ab] rounded-full"></span>
          </Link>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
            <img
              alt="Gautam Mulay Avatar"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC28bNDbt1eYF5GFk5J8vr0g9_MjbfaNe6NI7CVAYFFyqdFnGjQRpMW93Go6mxvoRAfQg0Bv9eYl9sHjlJxehFWTWeIuIx-YK9vUcMB3sU5LMUGjPWjzzXq0n50Wrb3xY-9dt3o2Yujcgwv8r9NPskDFyp4hSt02EerwBGG9W1xgbO0fQ7wk4BHLm0nP7tZGCW5lihiUh73Kz1SnPAOq86067_XmtlJg7uc5qPLYXG0HhZUkk4HMGZf"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
