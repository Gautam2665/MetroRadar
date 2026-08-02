"use client";

import { useState } from "react";
import { Search, Bell } from "lucide-react";

const CITIES = [
  "Delhi",
  "Kochi",
  "Hyderabad",
  "Bengaluru",
  "Chennai",
  "Ahmedabad",
];

export default function Header() {
  const [city, setCity] = useState("Delhi");
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-zinc-800/60 bg-zinc-950/80 px-5 backdrop-blur-md">

      {/* Left: city selector */}
      <div className="shrink-0">
        <label htmlFor="city-select" className="sr-only">
          Select city
        </label>
        <select
          id="city-select"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="
            cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800
            px-3 py-1.5 text-sm font-medium text-white
            outline-none transition-colors duration-150
            hover:border-zinc-600 hover:bg-zinc-700/80
            focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30
          "
        >
          {CITIES.map((c) => (
            <option key={c} value={c} className="bg-zinc-900">
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Center: search */}
      <div className="relative flex-1 max-w-lg mx-auto">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          strokeWidth={1.8}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stations, routes..."
          aria-label="Search stations and routes"
          className="
            w-full rounded-xl border border-zinc-800/80 bg-zinc-900/60
            py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500
            outline-none backdrop-blur-sm transition-all duration-150
            hover:border-zinc-700 hover:bg-zinc-900/80
            focus:border-cyan-500/50 focus:bg-zinc-900 focus:ring-1 focus:ring-cyan-500/20
          "
        />
      </div>

      {/* Right: chips + avatar */}
      <div className="flex shrink-0 items-center gap-3">

        {/* Weather chip */}
        <span
          aria-label="Current weather: 28 degrees Celsius, partly cloudy"
          className="
            hidden sm:inline-flex items-center gap-1.5
            rounded-full bg-zinc-800 border border-zinc-700/60
            px-3 py-1 text-xs font-medium text-zinc-300
            select-none
          "
        >
          28°C
          <span aria-hidden="true">⛅</span>
        </span>

        {/* Notification bell */}
        <button
          aria-label="Notifications, 3 unread"
          className="
            relative flex h-8 w-8 items-center justify-center rounded-lg
            text-zinc-400 transition-colors duration-150
            hover:bg-zinc-800 hover:text-white
            focus:outline-none focus:ring-1 focus:ring-cyan-500/40
          "
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          <span
            aria-hidden="true"
            className="
              absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center
              rounded-full bg-red-500 text-[9px] font-bold text-white
              ring-1 ring-zinc-950 leading-none
            "
          >
            3
          </span>
        </button>

        {/* User avatar */}
        <button
          aria-label="User menu – Gautam Singh"
          className="
            flex h-8 w-8 items-center justify-center rounded-full
            bg-cyan-500/20 ring-1 ring-cyan-500/30
            text-xs font-bold text-cyan-400 tracking-wide
            transition-colors duration-150
            hover:bg-cyan-500/30 hover:ring-cyan-400/50
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            select-none
          "
        >
          GS
        </button>
      </div>
    </header>
  );
}
