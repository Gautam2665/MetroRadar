/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StationSearchInput, StationItem } from "./StationSearchInput";
import { useAssistantUi } from "../contexts/AssistantUiContext";
import { useInfoModal } from "../contexts/InfoModalContext";
import { Sparkles, Info } from "lucide-react";

interface HeaderProps {
  activeCity?: string;
  onCityChange?: (city: string) => void;
  onSelectStation?: (station: StationItem) => void;
}

const CITIES = [
  { code: "mumbai", name: "Mumbai, MH", badge: "Live" },
  { code: "pune", name: "Pune, MH", badge: "Live" },
  { code: "nagpur", name: "Nagpur, MH", badge: "Live" },
  { code: "navi_mumbai", name: "Navi Mumbai, MH", badge: "Live" },
  { code: "delhi", name: "Delhi, IN", badge: "Live" },
  { code: "bengaluru", name: "Bengaluru, IN", badge: "Certified" },
  { code: "hyderabad", name: "Hyderabad, IN", badge: "Certified" },
  { code: "chennai", name: "Chennai, IN", badge: "Certified" },
  { code: "ahmedabad", name: "Ahmedabad, IN", badge: "Certified" },
  { code: "kochi", name: "Kochi, KL", badge: "Certified" },
];

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  navi_mumbai: { lat: 19.0400, lng: 73.0650 },
  delhi: { lat: 28.6139, lng: 77.209 },
  kochi: { lat: 9.9816, lng: 76.2999 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
};

/** Weather cache: city → { temp, icon, fetchedAt } */
const weatherCache = new Map<string, { temp: string; icon: string; fetchedAt: number }>();
const WEATHER_TTL_MS = 15 * 60 * 1000; // 15 minutes

function resolveWeatherIcon(code: number): string {
  if (code === 0) return "wb_sunny";
  if (code <= 2) return "partly_cloudy_day";
  if (code <= 3) return "cloud";
  if (code <= 67) return "rainy";
  if (code <= 77) return "weather_snowy";
  if (code <= 82) return "rainy";
  return "thunderstorm";
}

export function Header({ activeCity = "mumbai", onCityChange, onSelectStation }: HeaderProps) {
  const { toggleAssistant, isOpen: isAssistantOpen } = useAssistantUi();
  const { openInfoModal } = useInfoModal();
  const [openCityMenu, setOpenCityMenu] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [weather, setWeather] = useState<{ temp: string; icon: string }>({ temp: "--°C", icon: "wb_sunny" });

  const currentCityObj = CITIES.find((c) => c.code === activeCity) || CITIES[0];

  // Fetch live weather with 15-minute cache
  useEffect(() => {
    const timer = setTimeout(() => {
      const city = activeCity.toLowerCase();
      const cached = weatherCache.get(city);
      if (cached && Date.now() - cached.fetchedAt < WEATHER_TTL_MS) {
        setWeather({ temp: cached.temp, icon: cached.icon });
        return;
      }

    const coords = CITY_COORDS[city] || CITY_COORDS.mumbai;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Weather service status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.current_weather?.temperature !== undefined) {
          const temp = `${Math.round(data.current_weather.temperature)}°C`;
          const icon = resolveWeatherIcon(data.current_weather.weathercode ?? 0);
          weatherCache.set(city, { temp, icon, fetchedAt: Date.now() });
          setWeather({ temp, icon });
        }
      })
      .catch(() => {
        setWeather({ temp: "--°C", icon: "wb_sunny" });
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeCity]);

  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-[#080C14]/90 backdrop-blur-md sticky top-0 z-40 border-b border-white/10">
      <div className="flex-1 flex items-center gap-4">
        {/* Dynamic Station Search Bar */}
        <div className="w-96 hidden lg:block">
          <StationSearchInput
            value={searchVal}
            onChange={(val) => setSearchVal(val)}
            activeCity={activeCity}
            onSelectStation={(stn) => {
              if (onSelectStation) onSelectStation(stn);
              setSearchVal(stn.name);
            }}
            placeholder="Search for a station, place or line..."
            inputClassName="w-full bg-[#1c2028]/80 border border-white/10 rounded-full py-2 pl-4 pr-4 text-sm focus:outline-none focus:border-[#00e5ff] text-[#dfe2ee] placeholder:text-[#bac9cc]/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Live Weather — 15-minute cache */}
        <div className="flex items-center gap-2 hidden sm:flex">
          <span className="material-symbols-outlined text-[#fec931] text-[20px]">{weather.icon}</span>
          <div className="text-right">
            <p className="text-[14px] font-semibold text-[#dfe2ee]">{weather.temp}</p>
            <p className="text-[10px] text-[#bac9cc] leading-none">{currentCityObj.name}</p>
          </div>
        </div>

        {/* Transit AI Assistant Button */}
        <button
          onClick={toggleAssistant}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 text-xs font-semibold ${
            isAssistantOpen
              ? "bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.4)]"
              : "bg-gradient-to-r from-[#00e5ff]/15 to-[#7000ff]/15 border-[#00e5ff]/30 text-[#00e5ff] hover:border-[#00e5ff]/60 hover:bg-[#00e5ff]/20"
          }`}
          title="Open MetroRadar Transit AI Assistant"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAssistantOpen ? "text-black animate-spin" : "text-[#00e5ff] animate-pulse"}`} />
          <span className="tracking-wide">Transit AI</span>
        </button>

        {/* City Indicator (Locked to Mumbai, MH) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#c3f5ff] text-[13px] font-semibold">
          <span className="material-symbols-outlined text-sm text-[#00e5ff]">location_on</span>
          <span>Mumbai, MH</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={openInfoModal}
            className="flex items-center justify-center text-[#bac9cc] hover:text-[#00e5ff] hover:bg-white/10 transition-colors w-8 h-8 rounded-full"
            title="System Specs & Information"
            aria-label="System Specs & Information"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
