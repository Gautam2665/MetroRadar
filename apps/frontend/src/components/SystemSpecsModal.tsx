"use client";

import React, { useEffect } from "react";
import { useInfoModal } from "../contexts/InfoModalContext";
import { 
  X, 
  Terminal, 
  Cpu, 
  Database, 
  MapPin, 
  Code2, 
  Mail, 
  ExternalLink, 
  Bug, 
  ShieldCheck, 
  Layers,
  Sparkles,
  Radio
} from "lucide-react";

export function SystemSpecsModal() {
  const { isOpen, closeInfoModal } = useInfoModal();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeInfoModal();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, closeInfoModal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click listener */}
      <div className="fixed inset-0" onClick={closeInfoModal} />

      {/* Modal Dialog */}
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-[#0A101C] border border-[#1E2E48] rounded-2xl shadow-[0_0_50px_rgba(0,213,232,0.15)] overflow-hidden text-slate-200 z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142035] bg-[#0E1626]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00D5E8]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">transitOS</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-[#00D5E8] border border-cyan-500/30 font-semibold">
                  v0.4.0-beta
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Urban Mobility & Spatial Intelligence Platform</p>
            </div>
          </div>

          <button
            onClick={closeInfoModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* System Overview */}
          <div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>System Overview</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[12px]">
              TransitOS is an urban spatial intelligence platform modeling multi-modal metro transit networks, 
              station entry/exit micro-geometries, and voice-assisted route navigation. It blends mathematical 
              pathfinding algorithms (Dijkstra/Yen’s K-shortest) with an LLM Gateway pattern that never hallucinates schedules.
            </p>
          </div>

          {/* Architecture Stack Pills */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Architecture & Engineering Stack</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "NestJS 11", sub: "Modular Core" },
                { label: "React 19 & Next.js 16", sub: "Turbopack" },
                { label: "PostgreSQL & PostGIS", sub: "Spatial Engine" },
                { label: "Dijkstra & Yen's K", sub: "Deterministic Routing" },
                { label: "Gemini 2.0 Flash", sub: "Intent Gateway" },
                { label: "Google Places API", sub: "Locality Geocoding" },
                { label: "GTFS & GTFS-RT", sub: "Live Telemetry" },
                { label: "MapLibre GL", sub: "Vector Mapping" },
                { label: "Redis 7", sub: "Telemetry Cache" },
              ].map((stack) => (
                <span
                  key={stack.label}
                  className="px-2.5 py-1 rounded-md bg-[#131D30] border border-[#1E2E48] text-slate-200 text-[11px] font-mono flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D5E8]" />
                  <span className="font-semibold text-white">{stack.label}</span>
                  <span className="text-[10px] text-slate-400">({stack.sub})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Data Provenance & Scope */}
          <div className="p-3 rounded-xl bg-[#0E1626]/70 border border-[#1E2E48]/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data Provenance & Current Scope</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Active footprint is focused on <strong>Mumbai Metro (Lines 1, 2A, 7, & Aqua Line 3)</strong>. 
              Station entry/exit gates, physical foot overbridges (FOBs), and platform alignments are mapped 
              from verified field and spatial datasets. Wheelchair accessibility tagging (lifts vs. escalators) 
              is continuously verified.
            </p>
          </div>

          {/* Feedback & Bug Reporting */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/30 to-blue-950/20 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Bug className="w-3.5 h-3.5 text-[#00D5E8]" />
                <span>Engineer Feedback & Issues</span>
              </div>
              <span className="text-[10px] text-cyan-300 font-mono">Open Source</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Found a routing edge case, missing gate geometry, or latency issue? File a bug or inspect the codebase directly.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://github.com/Gautam2665/MetroRadar/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#142035] hover:bg-[#1A2A44] border border-[#243552] text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub Issues</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="mailto:mulaygautam7@gmail.com?subject=TransitOS%20Feedback%20%26%20Engineering%20Notes"
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#142035] hover:bg-[#1A2A44] border border-[#243552] text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Email Developer</span>
              </a>
            </div>
          </div>

          {/* Developer Attribution */}
          <div className="pt-2 border-t border-[#142035] flex items-center justify-between text-[11px] text-slate-400">
            <div>
              Built by <span className="text-white font-semibold">Gautam Mulay</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Gautam2665"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Gautam2665</span>
              </a>
              <span>•</span>
              <a
                href="mailto:mulaygautam7@gmail.com"
                className="hover:text-cyan-400 transition-colors"
              >
                mulaygautam7@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
