"use client";

import Header from "@/components/dashboard/Header";
import { AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

type ServiceAlert = {
  id: string;
  system: string;
  line: string;
  color: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  timestamp: string;
};

const ALERTS: ServiceAlert[] = [
  {
    id: "1",
    system: "DMRC (Delhi)",
    line: "Yellow Line",
    color: "#eab308",
    severity: "INFO",
    title: "Scheduled Maintenance at Rajiv Chowk",
    description: "Minor frequency adjustment on Yellow Line. Trains running at 4-minute intervals during off-peak hours.",
    timestamp: "10 mins ago",
  },
  {
    id: "2",
    system: "BMRCL (Bengaluru)",
    line: "Purple Line",
    color: "#805ad5",
    severity: "WARNING",
    title: "Signal Calibration at Majestic",
    description: "Expect 2-3 minute delays between Majestic and MG Road due to signaling calibration.",
    timestamp: "25 mins ago",
  },
  {
    id: "3",
    system: "KMRL (Kochi)",
    line: "Blue Line",
    color: "#3182ce",
    severity: "INFO",
    title: "Normal Service Operations",
    description: "All Kochi Metro services operating on schedule with 6-minute peak headways.",
    timestamp: "1 hour ago",
  },
];

export default function AlertsPage() {
  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-zinc-850">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
              Live Line Status & Service Alerts
            </h1>
            <p className="text-xs text-zinc-500">
              Real-time service advisories, maintenance updates, and delay notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {ALERTS.map((alert) => (
            <div
              key={alert.id}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-black text-white"
                    style={{ backgroundColor: alert.color }}
                  >
                    {alert.line}
                  </span>
                  <span className="text-xs font-bold text-zinc-300">{alert.system}</span>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-zinc-500">
                  <Clock size={12} />
                  <span>{alert.timestamp}</span>
                </div>
              </div>

              <h2 className="text-sm font-bold text-zinc-100">{alert.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">{alert.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
