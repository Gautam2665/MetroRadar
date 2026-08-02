"use client";

import Header from "@/components/dashboard/Header";
import { JourneyPlannerForm, type JourneyResult, type StationSuggestion } from "@/components/dashboard/JourneyPlanner";
import JourneyTimeline from "@/components/dashboard/JourneyTimeline";
import { useState } from "react";
import { Navigation, Sparkles } from "lucide-react";

export default function PlanPage() {
  const [origin, setOrigin] = useState<StationSuggestion | null>(null);
  const [destination, setDestination] = useState<StationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JourneyResult | null>(null);

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Form Panel */}
        <div className="w-[450px] bg-zinc-950/90 border-r border-zinc-800/80 p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center space-x-2.5 mb-6">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Navigation className="h-5 w-5 rotate-45" />
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-zinc-100">
                Multi-Modal Journey Pathfinder
              </h1>
              <p className="text-xs text-zinc-500">
                Dijkstra pathfinding across all 6 certified Indian metro networks
              </p>
            </div>
          </div>

          <JourneyPlannerForm
            origin={origin}
            setOrigin={setOrigin}
            destination={destination}
            setDestination={setDestination}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            onPlanResult={setResult}
            onBack={() => setResult(null)}
          />
        </div>

        {/* Right Details Panel */}
        <div className="flex-1 bg-zinc-900/30 p-8 overflow-y-auto">
          {result ? (
            <div className="max-w-2xl mx-auto">
              <JourneyTimeline result={result} onClose={() => setResult(null)} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-4">
              <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 text-sky-400">
                <Sparkles size={32} />
              </div>
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                Select Origin & Destination Stations
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm">
                Choose stations from Delhi, Kochi, Hyderabad, Bengaluru, Chennai, or Ahmedabad to calculate step-by-step route timelines and fares.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
