'use client';
import { useState } from 'react';
import { User, Bell, Globe, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [jAlerts, setJAlerts] = useState(true);
  const [dAlerts, setDAlerts] = useState(true);
  const [oAlerts, setOAlerts] = useState(false);

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-8 text-white">Settings</h1>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="flex items-center gap-3 mb-6 text-cyan-400">
            <User className="w-5 h-5" />
            <h2 className="text-xl font-semibold text-white">Profile</h2>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400 border border-zinc-700">
                GS
              </div>
              <div>
                <div className="text-lg font-bold">Gautam Singh</div>
                <div className="text-zinc-400 text-sm">gautam@transit.os</div>
              </div>
            </div>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
              Edit
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="flex items-center gap-3 mb-6 text-cyan-400">
            <Bell className="w-5 h-5" />
            <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Journey Alerts</div>
                <div className="text-sm text-zinc-400">Get notified when you approach your stop</div>
              </div>
              <button 
                onClick={() => setJAlerts(!jAlerts)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${jAlerts ? 'bg-cyan-500' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${jAlerts ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Delay Notifications</div>
                <div className="text-sm text-zinc-400">Service disruptions for favorite routes</div>
              </div>
              <button 
                onClick={() => setDAlerts(!dAlerts)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${dAlerts ? 'bg-cyan-500' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${dAlerts ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Offer SMS</div>
                <div className="text-sm text-zinc-400">Promotional offers and discounts</div>
              </div>
              <button 
                onClick={() => setOAlerts(!oAlerts)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${oAlerts ? 'bg-cyan-500' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${oAlerts ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* App Prefs */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="flex items-center gap-3 mb-6 text-cyan-400">
            <Globe className="w-5 h-5" />
            <h2 className="text-xl font-semibold text-white">App Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Default City</span>
              <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500">
                <option>New Delhi</option>
                <option>Mumbai</option>
                <option>Kochi</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Language</span>
              <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500">
                <option>English</option>
                <option>Hindi</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Theme</span>
              <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500">
                <option>Dark</option>
                <option>Light</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accounts */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="flex items-center gap-3 mb-6 text-cyan-400">
            <LinkIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold text-white">Connected Accounts</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-zinc-800/30">
              <div className="font-medium">Google</div>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Connected
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-zinc-800/30">
              <div className="font-medium">UPI ID</div>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Linked
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
