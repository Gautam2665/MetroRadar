'use client';
import { useState } from 'react';
import { MapPin, ArrowUpDown, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PlanPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [activeMode, setActiveMode] = useState('Metro');
  const [showResults, setShowResults] = useState(true);

  const modes = ['Metro', 'Bus', 'Train', 'Ferry', 'Multi-Modal'];

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-6 text-white">Journey Planner</h1>
      
      {/* Form */}
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
          <div className="flex-1 flex flex-col gap-4 relative w-full">
            <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 focus-within:border-cyan-500/50 transition-colors">
              <MapPin className="text-zinc-400 w-5 h-5" />
              <input type="text" placeholder="From..." className="bg-transparent outline-none w-full" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <button className="absolute left-8 top-1/2 -translate-y-1/2 z-10 bg-zinc-800 p-2 rounded-full border border-zinc-700 hover:text-cyan-400 transition-colors">
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 focus-within:border-cyan-500/50 transition-colors">
              <MapPin className="text-zinc-400 w-5 h-5" />
              <input type="text" placeholder="To..." className="bg-transparent outline-none w-full" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              <Calendar className="text-zinc-400 w-5 h-5" />
              <input type="date" className="bg-transparent outline-none w-full text-zinc-300" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              <Clock className="text-zinc-400 w-5 h-5" />
              <input type="time" className="bg-transparent outline-none w-full text-zinc-300" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {modes.map(mode => (
            <button 
              key={mode} 
              onClick={() => setActiveMode(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeMode === mode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800'}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <button onClick={() => setShowResults(true)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-xl transition-colors">
          Search Routes
        </button>
      </div>

      {showResults && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Suggested Routes</h2>
          
          {/* Route 1 */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md overflow-hidden flex cursor-pointer hover:border-zinc-700/60 transition-colors">
            <div className="w-2 bg-red-500"></div>
            <div className="p-5 flex-1 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-lg">Red Line</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Best Route</span>
                </div>
                <div className="text-zinc-400 text-sm flex items-center gap-2">
                  <span>3 stops</span>
                  <span>•</span>
                  <span>Board Coach 3 Platform 2</span>
                </div>
              </div>
              <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-1">
                <span className="text-2xl font-bold">32 min</span>
                <span className="text-zinc-400 font-medium">₹30</span>
              </div>
            </div>
          </div>

          {/* Route 2 */}
          <Link href="/plan/multimodal" className="block">
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md overflow-hidden flex cursor-pointer hover:border-zinc-700/60 transition-colors">
              <div className="w-2 bg-violet-500"></div>
              <div className="p-5 flex-1 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-bold text-lg">Multi-Modal</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Fastest</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">Multi-Modal</span>
                  </div>
                  <div className="text-zinc-400 text-sm flex items-center gap-2">
                    <span>Walk + Yellow + Red Lines</span>
                  </div>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-1">
                  <span className="text-2xl font-bold">28 min</span>
                  <span className="text-zinc-400 font-medium">₹45</span>
                </div>
              </div>
            </div>
          </Link>

        </div>
      )}
    </div>
  );
}
