"use client";

import { useEffect, useState, useRef } from "react";
import { Activity } from "lucide-react";

type DiagnosticsHudProps = {
  zoom: number;
  center: [number, number];
  loadedLayersCount: number;
  apiLatency: number;
  cacheHit: boolean;
};

export default function DiagnosticsHud({
  zoom,
  center,
  loadedLayersCount,
  apiLatency,
  cacheHit,
}: DiagnosticsHudProps) {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;

    let animId: number;
    const loop = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-72 p-4 rounded-xl bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md text-xs font-mono text-[#f4f4f5] shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center space-x-1.5 text-sky-400">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="font-bold uppercase tracking-wider">Diagnostics HUD</span>
        </div>
        <span className="text-[10px] text-zinc-500">Ctrl+Shift+D</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-500">Performance (FPS):</span>
          <span className={`font-semibold ${fps >= 50 ? "text-emerald-400" : fps >= 30 ? "text-amber-400" : "text-rose-400"}`}>
            {fps} FPS
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500">Center (Lon, Lat):</span>
          <span className="text-zinc-300">
            {center[0].toFixed(5)}, {center[1].toFixed(5)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500">Zoom Level:</span>
          <span className="text-zinc-300">{zoom.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500">Active GIS Layers:</span>
          <span className="text-zinc-300">{loadedLayersCount}</span>
        </div>

        <div className="flex justify-between border-t border-zinc-900 pt-2 mt-2">
          <span className="text-zinc-500">API Response Time:</span>
          <span className="text-zinc-300">{apiLatency} ms</span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500">Cache Performance:</span>
          <span className={`font-semibold ${cacheHit ? "text-emerald-400" : "text-zinc-400"}`}>
            {cacheHit ? "HIT" : "MISS"}
          </span>
        </div>
      </div>
    </div>
  );
}
