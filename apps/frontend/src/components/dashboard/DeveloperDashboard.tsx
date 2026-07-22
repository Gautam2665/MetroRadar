"use client";

import { useEffect, useState, useCallback } from "react";
import { Database, RefreshCw, Layers, Calendar, Terminal } from "lucide-react";

type SessionLog = {
  id: string;
  type: string;
  filename: string;
  status: string;
  startedAt: string;
  duration: number;
  recordsProcessed: number;
};

type DevDashboardProps = {
  onClose: () => void;
};

type DbStats = {
  systems: number;
  stations: number;
  lines: number;
  trips: number;
  stopTimes: number;
};

export default function DeveloperDashboard({ onClose }: DevDashboardProps) {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<DbStats>({
    systems: 0,
    stations: 0,
    lines: 0,
    trips: 0,
    stopTimes: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      
      // Fetch import sessions
      const sessionsRes = await fetch(`${backendUrl}/ingestion/sessions`);
      const sessionsData = (await sessionsRes.json()) as unknown;
      setSessions(Array.isArray(sessionsData) ? (sessionsData as SessionLog[]).slice(0, 15) : []);

      // Fetch base counts via a lightweight custom query using systems
      const mapRes = await fetch(`${backendUrl}/map/stations`);
      const mapData = (await mapRes.json()) as { features?: unknown[] };
      const stationsCount = mapData.features?.length || 0;

      const linesRes = await fetch(`${backendUrl}/map/lines`);
      const linesData = (await linesRes.json()) as { features?: unknown[] };
      const linesCount = linesData.features?.length || 0;

      const systemsRes = await fetch(`${backendUrl}/map/systems`);
      const systemsData = (await systemsRes.json()) as { features?: unknown[] };
      const systemsCount = systemsData.features?.length || 0;

      setDbStats({
        systems: systemsCount,
        stations: stationsCount,
        lines: linesCount,
        trips: 5888, // seeded reference values
        stopTimes: 139160,
      });
    } catch (err) {
      console.error("Failed to load developer dashboard telemetry:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAsync = async () => {
      if (active) {
        await loadData();
      }
    };
    void fetchAsync();
    return () => {
      active = false;
    };
  }, [loadData]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 text-[#f4f4f5] shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <Terminal className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Developer & Admin Console</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 transition border border-zinc-700/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition text-sm font-medium border border-zinc-700/50"
            >
              Close Console
            </button>
          </div>
        </div>

        {/* Console Workspace */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Diagnostic Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex flex-col">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Systems</span>
              <div className="flex items-baseline space-x-2 mt-auto">
                <Database className="h-4 w-4 text-sky-400" />
                <span className="text-2xl font-bold font-mono">{dbStats.systems}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex flex-col">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Stations</span>
              <div className="flex items-baseline space-x-2 mt-auto">
                <Layers className="h-4 w-4 text-emerald-400" />
                <span className="text-2xl font-bold font-mono">{dbStats.stations}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex flex-col">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Lines</span>
              <div className="flex items-baseline space-x-2 mt-auto">
                <RefreshCw className="h-4 w-4 text-violet-400" />
                <span className="text-2xl font-bold font-mono">{dbStats.lines}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex flex-col">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Seeded Trips</span>
              <div className="flex items-baseline space-x-2 mt-auto">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="text-2xl font-bold font-mono">{dbStats.trips}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 col-span-2 md:col-span-1 flex flex-col">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Seeded StopTimes</span>
              <div className="flex items-baseline space-x-2 mt-auto">
                <Database className="h-4 w-4 text-rose-400" />
                <span className="text-2xl font-bold font-mono">{dbStats.stopTimes.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Import Session logs */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">GTFS Ingestion History</h3>
            
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-semibold uppercase tracking-wider bg-zinc-900/30">
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Processed Records</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Started At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        {loading ? "Loading logs..." : "No import sessions found."}
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-zinc-200">{s.filename}</td>
                        <td className="py-3 px-4 text-zinc-400">{s.type}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === "SUCCESS" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50" : 
                            s.status === "RUNNING" ? "bg-sky-950/60 text-sky-400 border border-sky-800/50 animate-pulse" : 
                            "bg-rose-950/60 text-rose-400 border border-rose-800/50"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">{s.recordsProcessed.toLocaleString()}</td>
                        <td className="py-3 px-4 text-zinc-400">{s.duration ? `${(s.duration / 1000).toFixed(2)}s` : "-"}</td>
                        <td className="py-3 px-4 text-zinc-500">{new Date(s.startedAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
