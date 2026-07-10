"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  database: string;
  redis: string;
  version: string;
};

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkHealth = async () => {
    try {
      const response = await fetch("http://localhost:3001/health");
      setBackendOnline(true);
      const data = await response.json();
      setHealth(data);
    } catch {
      setBackendOnline(false);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkHealth();
    }, 0);
    const intervalId = setInterval(checkHealth, 3000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const isDbConnected = health?.database === "connected";
  const isRedisConnected = health?.redis === "connected";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#09090b] text-[#f4f4f5] px-4 font-sans relative overflow-hidden">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="w-full max-w-lg p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2.5 bg-zinc-800/40 rounded-xl border border-zinc-700/50 mb-4">
            <span className="text-3xl">🚇</span>
            <span className="text-lg font-bold text-sky-400 ml-2 tracking-widest uppercase">Radar</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            MetroRadar
          </h1>
          <p className="mt-2 text-zinc-400 font-medium tracking-wide">
            Urban Mobility Intelligence Platform
          </p>
        </div>

        {/* Status Dashboard Panel */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            System Infrastructure Status
          </h2>

          {/* Backend Status Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 transition-all hover:bg-zinc-800/20">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚙️</span>
              <div>
                <p className="font-semibold text-zinc-100">Backend API</p>
                <p className="text-xs text-zinc-500">Port 3001 — NestJS</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} block`} />
              <span className={`text-sm font-medium ${backendOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {loading ? 'Probing...' : backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Database Status Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 transition-all hover:bg-zinc-800/20">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🐘</span>
              <div>
                <p className="font-semibold text-zinc-100">Database</p>
                <p className="text-xs text-zinc-500">PostgreSQL + PostGIS</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} block`} />
              <span className={`text-sm font-medium ${isDbConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {loading ? 'Probing...' : isDbConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Redis Status Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 transition-all hover:bg-zinc-800/20">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="font-semibold text-zinc-100">Cache Cache</p>
                <p className="text-xs text-zinc-500">Redis In-Memory</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isRedisConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} block`} />
              <span className={`text-sm font-medium ${isRedisConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {loading ? 'Probing...' : isRedisConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-zinc-800 text-center text-xs text-zinc-600 flex justify-between">
          <span>Sprint 1 — Foundation</span>
          <span>v{health?.version || "0.1.0"}</span>
        </div>
      </main>
    </div>
  );
}
