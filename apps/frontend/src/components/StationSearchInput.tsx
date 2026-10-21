"use client";

import { useState, useRef, useEffect } from "react";
import { useStationsSearch } from "../hooks/useStationsSearch";
import { StationSearchResult, toPlaceSuggestion } from "../services/api/station.api";
import { PlaceSuggestion } from "../models/search";
import { PlaceSuggestionItem } from "./PlaceSuggestionItem";
import { formatShortLineName } from "../utils/transitFormatter";

/** Public type that consumers receive when a station is selected */
export type StationItem = {
  id: string;
  name: string;
  code: string;
  line: string;
  lineColor: string;
  city: string;
  systemId: string;
  coordinates: [number, number];
  isLandmark?: boolean;
  landmarkDetails?: Record<string, unknown>;
};

export function toStationItem(s: StationSearchResult): StationItem {
  const primary = s.lines[0];
  const uniqueLineNames = Array.from(
    new Set(s.lines.map((l) => formatShortLineName(l.name)).filter(Boolean))
  );
  return {
    id: s.stationId || s.id,
    name: s.name,
    code: s.code,
    city: s.city,
    systemId: s.systemId,
    line: uniqueLineNames.join(" / ") || "Metro Line",
    lineColor: primary?.color || "#00e5ff",
    coordinates: [s.lng, s.lat],
    isLandmark: s.isLandmark,
    landmarkDetails: s.landmarkDetails,
  };
}

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
  const { results, loading, search, clear } = useStationsSearch(activeCity);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setIsOpen(true);
    search(val);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (value.trim().length >= 2) {
      search(value);
    } else if (value.trim().length === 0) {
      // Show city stations on empty focus using city name as query seed
      search(activeCity || "Mumbai");
    }
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    onChange(place.name);
    if (onSelectStation) {
      onSelectStation({
        id:
          place.type === "poi" || place.isLandmark
            ? (place.lat && place.lng ? `${place.lat.toFixed(5)},${place.lng.toFixed(5)}` : place.id)
            : (place.rawStationId || place.id),
        name: place.name,
        code: place.code || "STN",
        city: activeCity || "mumbai",
        systemId: activeCity || "mumbai",
        line: place.nearestStation?.lineName || "Metro Line",
        lineColor: place.nearestStation?.lineColor || "#00e5ff",
        coordinates: [place.lng || 0, place.lat || 0],
        isLandmark: place.type === "poi",
      });
    }
    setIsOpen(false);
    clear();
  };

  const showDropdown = isOpen && (loading || results.length > 0 || value.trim().length >= 2);

  return (
    <div ref={wrapperRef} className={`relative w-full ${isOpen ? "z-50" : "z-10"} ${className}`}>
      {label && <p className="text-[10px] text-[#bac9cc] mb-1 font-bold">{label}</p>}

      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        suppressHydrationWarning
        className={
          inputClassName ||
          "w-full bg-[#1c2028]/80 border border-white/10 rounded-xl py-2.5 pl-4 pr-4 text-sm text-[#dfe2ee] placeholder:text-[#bac9cc]/50 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
        }
      />

      {showDropdown && (
        <div className="absolute left-0 -right-10 top-full mt-2 bg-[#1c2028] border border-white/10 rounded-xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto scrollbar-hide">
          {/* Header */}
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#bac9cc] uppercase tracking-wider border-b border-white/5 flex justify-between items-center">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-[#00e5ff] border-t-transparent rounded-full animate-spin inline-block" />
                Searching stations...
              </span>
            ) : (
              <span>
                {results.length > 0
                  ? `${results.length} Station${results.length !== 1 ? "s" : ""}`
                  : value.trim().length >= 2
                  ? "No stations found"
                  : "Type to search"}
              </span>
            )}
            {activeCity && (
              <span className="text-[#00e5ff]">{activeCity.toUpperCase()}</span>
            )}
          </div>

          {/* Skeleton rows while loading */}
          {loading && ["", "", ""].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-2 w-20 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
            </div>
          ))}

          {/* Results — Google Maps 2-Line Structure */}
          {!loading &&
            results.map((station) => {
              const suggestion = toPlaceSuggestion(station);
              return (
                <PlaceSuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  onSelect={handleSelectPlace}
                />
              );
            })}

          {/* Empty state */}
          {!loading && results.length === 0 && value.trim().length >= 2 && (
            <div className="px-4 py-5 text-center">
              <span className="material-symbols-outlined text-2xl text-[#bac9cc]/30 block mb-1">search_off</span>
              <p className="text-xs text-[#bac9cc]">No stations found for &quot;{value}&quot;</p>
              <p className="text-[11px] text-[#bac9cc]/50 mt-0.5">Try a different name or check spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
