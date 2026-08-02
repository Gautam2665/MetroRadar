"use client";

import Header from "@/components/dashboard/Header";
import { Settings, Globe, Bell, Shield, Moon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#f4f4f5]">
      <Header />
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full space-y-8">
        <div className="flex items-center space-x-3 pb-4 border-b border-zinc-850">
          <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
              Platform Settings & Preferences
            </h1>
            <p className="text-xs text-zinc-500">
              Customize UI theme, notification alerts, default networks, and API gateways
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="text-sky-400" size={18} />
              <div>
                <p className="text-xs font-bold text-zinc-100">Default Metro Network</p>
                <p className="text-[10px] text-zinc-500">Initial network loaded on launch</p>
              </div>
            </div>
            <select className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none">
              <option value="delhi">Delhi Metro (DMRC)</option>
              <option value="kochi">Kochi Metro (KMRL)</option>
              <option value="hyderabad">Hyderabad Metro (HMRL)</option>
              <option value="bengaluru">Bengaluru Metro (BMRCL)</option>
              <option value="chennai">Chennai Metro (CMRL)</option>
              <option value="ahmedabad">Ahmedabad Metro (GMRC)</option>
            </select>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="text-sky-400" size={18} />
              <div>
                <p className="text-xs font-bold text-zinc-100">Realtime Delay Alerts</p>
                <p className="text-[10px] text-zinc-500">Receive proactive delay propagation notifications</p>
              </div>
            </div>
            <input type="checkbox" defaultChecked className="accent-sky-500 h-4 w-4 rounded" />
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Moon className="text-sky-400" size={18} />
              <div>
                <p className="text-xs font-bold text-zinc-100">Map Interface Styling</p>
                <p className="text-[10px] text-zinc-500">CartoDB Dark Matter GIS Theme</p>
              </div>
            </div>
            <span className="text-xs font-bold text-sky-400">Dark Mode (Enforced)</span>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="text-sky-400" size={18} />
              <div>
                <p className="text-xs font-bold text-zinc-100">Backend API Gateway URL</p>
                <p className="text-[10px] text-zinc-500">Authoritative NestJS API host</p>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">http://localhost:3001</span>
          </div>
        </div>
      </div>
    </div>
  );
}
