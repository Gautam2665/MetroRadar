"use client";

import Header from "@/components/dashboard/Header";
import { BookmarkCheck, MapPin, ArrowRight, Clock, Trash2 } from "lucide-react";
import { useState } from "react";

type SavedJourney = {
  id: string;
  fromName: string;
  toName: string;
  city: string;
  duration: number;
  transfers: number;
  dateSaved: string;
};

const INITIAL_SAVED: SavedJourney[] = [
  { id: "1", fromName: "Rajiv Chowk", toName: "HUDA City Centre", city: "Delhi", duration: 42, transfers: 0, dateSaved: "2026-08-01" },
  { id: "2", fromName: "Aluva", toName: "SN Junction", city: "Kochi", duration: 38, transfers: 0, dateSaved: "2026-07-29" },
  { id: "3", fromName: "Miyapur", toName: "LB Nagar", city: "Hyderabad", duration: 45, transfers: 0, dateSaved: "2026-08-01" },
  { id: "4", fromName: "Majestic", toName: "Whitefield", city: "Bengaluru", duration: 52, transfers: 1, dateSaved: "2026-08-01" },
];

export default function JourneysPage() {
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>(INITIAL_SAVED);

  const removeJourney = (id: string) => {
    setSavedJourneys((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-850">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <BookmarkCheck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
                My Saved & Frequent Journeys
              </h1>
              <p className="text-xs text-zinc-500">
                Quick access to your bookmarked routes across Indian metro networks
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
            {savedJourneys.length} Saved Routes
          </span>
        </div>

        {savedJourneys.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 space-y-2">
            <p className="text-xs">No saved journeys found.</p>
            <p className="text-[10px] text-zinc-600">Plan a journey and click "Save Route" to pin it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedJourneys.map((j) => (
              <div
                key={j.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-sky-500/40 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      {j.city} Metro
                    </span>
                    <button
                      onClick={() => removeJourney(j.id)}
                      className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-850 transition"
                      title="Remove saved route"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-zinc-100 mb-2">
                    <span>{j.fromName}</span>
                    <ArrowRight size={14} className="text-zinc-500" />
                    <span>{j.toName}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-1">
                    <Clock size={12} className="text-zinc-500" />
                    <span>{j.duration} mins ({j.transfers} transfers)</span>
                  </div>
                  <span className="text-[10px] text-zinc-600">{j.dateSaved}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
