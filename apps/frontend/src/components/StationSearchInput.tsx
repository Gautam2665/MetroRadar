"use client";

import { useState, useRef, useEffect } from "react";

export type StationItem = {
  id: string;
  name: string;
  code: string;
  line: string;
  lineColor: string;
  city: string;
  coordinates: [number, number];
};

export const ALL_STATIONS: StationItem[] = [
  // Delhi
  { id: "del-1", name: "Kashmere Gate", code: "KG", line: "Red / Yellow / Violet", lineColor: "#EAB308", city: "delhi", coordinates: [77.2285, 28.6665] },
  { id: "del-2", name: "HUDA City Centre", code: "HCC", line: "Yellow Line", lineColor: "#EAB308", city: "delhi", coordinates: [77.0726, 28.4595] },
  { id: "del-3", name: "Rajiv Chowk", code: "RC", line: "Yellow / Blue Line", lineColor: "#3B82F6", city: "delhi", coordinates: [77.2183, 28.6328] },
  { id: "del-4", name: "IGI Airport T3", code: "APT", line: "Orange Airport Express", lineColor: "#F97316", city: "delhi", coordinates: [77.0869, 28.5562] },
  { id: "del-5", name: "Chandni Chowk", code: "CC", line: "Yellow Line", lineColor: "#EAB308", city: "delhi", coordinates: [77.2305, 28.6578] },
  { id: "del-6", name: "Central Secretariat", code: "CS", line: "Yellow / Violet Line", lineColor: "#8B5CF6", city: "delhi", coordinates: [77.2119, 28.6186] },
  { id: "del-7", name: "INA", code: "INA", line: "Yellow / Pink Line", lineColor: "#EC4899", city: "delhi", coordinates: [77.2096, 28.5752] },
  { id: "del-8", name: "Hauz Khas", code: "HK", line: "Yellow / Magenta Line", lineColor: "#D946EF", city: "delhi", coordinates: [77.2065, 28.5433] },

  // Kochi
  { id: "koc-1", name: "Aluva", code: "ALV", line: "Cyan Line", lineColor: "#00e5ff", city: "kochi", coordinates: [76.3475, 10.1098] },
  { id: "koc-2", name: "SN Junction", code: "SNJ", line: "Cyan Line", lineColor: "#00e5ff", city: "kochi", coordinates: [76.3468, 9.9524] },
  { id: "koc-3", name: "Edapally", code: "EPL", line: "Cyan Line", lineColor: "#00e5ff", city: "kochi", coordinates: [76.3079, 10.0253] },
  { id: "koc-4", name: "MG Road", code: "MGR", line: "Cyan Line", lineColor: "#00e5ff", city: "kochi", coordinates: [76.2829, 9.9723] },
  { id: "koc-5", name: "Vytilla Water Hub", code: "VYT", line: "Water Metro", lineColor: "#00daf3", city: "kochi", coordinates: [76.3195, 9.9671] },

  // Hyderabad
  { id: "hyd-1", name: "Miyapur", code: "MYP", line: "Red Line", lineColor: "#EF4444", city: "hyderabad", coordinates: [78.3614, 17.4969] },
  { id: "hyd-2", name: "Raidurg", code: "RDG", line: "Blue Line", lineColor: "#3B82F6", city: "hyderabad", coordinates: [78.3768, 17.4428] },
  { id: "hyd-3", name: "Secunderabad", code: "SCB", line: "Blue / Green Line", lineColor: "#3B82F6", city: "hyderabad", coordinates: [78.5034, 17.4344] },
  { id: "hyd-4", name: "LB Nagar", code: "LBN", line: "Red Line", lineColor: "#EF4444", city: "hyderabad", coordinates: [78.5529, 17.3457] },

  // Bengaluru
  { id: "blr-1", name: "Nadaprabhu Kempegowda (Majestic)", code: "MAJ", line: "Purple / Green Line", lineColor: "#8B5CF6", city: "bengaluru", coordinates: [77.5732, 12.9782] },
  { id: "blr-2", name: "Whitefield", code: "WFD", line: "Purple Line", lineColor: "#8B5CF6", city: "bengaluru", coordinates: [77.7499, 12.9698] },
  { id: "blr-3", name: "Indiranagar", code: "IND", line: "Purple Line", lineColor: "#8B5CF6", city: "bengaluru", coordinates: [77.6386, 12.9784] },
  { id: "blr-4", name: "MG Road", code: "MGB", line: "Purple Line", lineColor: "#8B5CF6", city: "bengaluru", coordinates: [77.6067, 12.9756] },

  // Chennai
  { id: "chn-1", name: "Chennai Central", code: "MAS", line: "Blue / Green Line", lineColor: "#3B82F6", city: "chennai", coordinates: [80.2755, 13.0818] },
  { id: "chn-2", name: "Airport", code: "MAA", line: "Blue Line", lineColor: "#3B82F6", city: "chennai", coordinates: [80.1633, 12.9806] },
  { id: "chn-3", name: "Guindy", code: "GDY", line: "Blue Line", lineColor: "#3B82F6", city: "chennai", coordinates: [80.2078, 13.0098] },
  { id: "chn-4", name: "Koyambedu", code: "CMBT", line: "Green Line", lineColor: "#10B981", city: "chennai", coordinates: [80.1947, 13.0732] },

  // Ahmedabad
  { id: "ahm-1", name: "Old High Court", code: "OHC", line: "Blue / Red Line", lineColor: "#EF4444", city: "ahmedabad", coordinates: [72.5684, 23.0378] },
  { id: "ahm-2", name: "Motera Stadium", code: "MTR", line: "Red Line", lineColor: "#EF4444", city: "ahmedabad", coordinates: [72.5975, 23.0911] },
  { id: "ahm-3", name: "Thaltej", code: "TLJ", line: "Blue Line", lineColor: "#3B82F6", city: "ahmedabad", coordinates: [72.5186, 23.0504] },
  { id: "ahm-4", name: "Vastral Gam", code: "VST", line: "Blue Line", lineColor: "#3B82F6", city: "ahmedabad", coordinates: [72.6598, 23.0019] },
];

type StationSearchInputProps = {
  value: string;
  onChange: (val: string) => void;
  onSelectStation?: (station: StationItem) => void;
  placeholder?: string;
  label?: string;
  activeCity?: string;
  className?: string;
  inputClassName?: string;
};

export function StationSearchInput({
  value,
  onChange,
  onSelectStation,
  placeholder = "Search for a station...",
  label,
  activeCity,
  className = "",
  inputClassName = "",
}: StationSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter stations based on user input and active city
  const cityFiltered = activeCity
    ? ALL_STATIONS.filter((s) => s.city.toLowerCase() === activeCity.toLowerCase())
    : ALL_STATIONS;

  const filteredStations = value.trim()
    ? cityFiltered.filter(
        (s) =>
          s.name.toLowerCase().includes(value.toLowerCase()) ||
          s.code.toLowerCase().includes(value.toLowerCase()) ||
          s.line.toLowerCase().includes(value.toLowerCase())
      )
    : cityFiltered.slice(0, 6);

  return (
    <div ref={wrapperRef} className={`relative w-full ${isOpen ? "z-50" : "z-10"} ${className}`}>
      {label && <p className="text-[10px] text-[#bac9cc] mb-1 font-bold">{label}</p>}

      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={
          inputClassName ||
          "w-full bg-[#1c2028]/80 border border-white/10 rounded-xl py-2.5 pl-4 pr-4 text-sm text-[#dfe2ee] placeholder:text-[#bac9cc]/50 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
        }
      />

      {isOpen && filteredStations.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#1c2028] border border-white/10 rounded-xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto scrollbar-hide animate-slide-in">
          <div className="px-3 py-1 text-[10px] font-bold text-[#bac9cc] uppercase tracking-wider border-b border-white/5 flex justify-between items-center">
            <span>Matching Stations ({filteredStations.length})</span>
            <span className="text-[#00e5ff]">{activeCity ? activeCity.toUpperCase() : "ALL"}</span>
          </div>

          {filteredStations.map((station) => (
            <button
              key={station.id}
              onClick={() => {
                onChange(station.name);
                if (onSelectStation) onSelectStation(station);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00e5ff] text-base">location_on</span>
                <div>
                  <p className="font-semibold text-[#dfe2ee] leading-tight">{station.name}</p>
                  <p className="text-[11px] text-[#bac9cc]">{station.line}</p>
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-bold"
                style={{
                  backgroundColor: `${station.lineColor}20`,
                  color: station.lineColor,
                  border: `1px solid ${station.lineColor}40`,
                }}
              >
                {station.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
