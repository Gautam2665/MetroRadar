import { AlertCircle, AlertTriangle, Info, Filter } from 'lucide-react';

export default function AlertsPage() {
  const tabs = ['All', 'Critical', 'Warning', 'Info'];

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto text-zinc-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Service Alerts</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-zinc-400 hover:text-white transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab, i) => (
          <button 
            key={tab} 
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${i === 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Critical */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md overflow-hidden flex relative">
          <div className="w-1.5 bg-red-500 absolute left-0 top-0 bottom-0"></div>
          <div className="p-5 pl-7 flex-1">
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-3 items-center">
                <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Critical
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300">Red Line</span>
              </div>
              <span className="text-xs text-zinc-500">Just now</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-3 mb-1">Red Line Delay</h3>
            <p className="text-zinc-400 text-sm">Platform 3 signal fault. Expect delays up to 15 mins between Kashmere Gate and Rohini.</p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md overflow-hidden flex relative">
          <div className="w-1.5 bg-yellow-500 absolute left-0 top-0 bottom-0"></div>
          <div className="p-5 pl-7 flex-1">
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-3 items-center">
                <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Warning
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300">Yellow Line</span>
              </div>
              <span className="text-xs text-zinc-500">2h ago</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-3 mb-1">Scheduled Maintenance</h3>
            <p className="text-zinc-400 text-sm">Weekend maintenance on Yellow Line. Sat 02:00-05:00 services will operate at reduced frequency.</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md overflow-hidden flex relative">
          <div className="w-1.5 bg-emerald-500 absolute left-0 top-0 bottom-0"></div>
          <div className="p-5 pl-7 flex-1">
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-3 items-center">
                <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Info
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300">Network Wide</span>
              </div>
              <span className="text-xs text-zinc-500">1d ago</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-3 mb-1">New Stations Open</h3>
            <p className="text-zinc-400 text-sm">The Janakpuri West extension is now fully operational with 3 new stations available for boarding.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
