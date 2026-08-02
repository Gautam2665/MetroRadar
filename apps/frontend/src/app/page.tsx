'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Train, MapPin, Navigation, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [77.2090, 28.6139], // Delhi
      zoom: 10,
      attributionControl: false
    });

    map.current.on('load', () => {
      // Fetch lines
      fetch('http://localhost:3001/map/lines')
        .then(res => res.json())
        .then(data => {
          map.current?.addSource('lines', { type: 'geojson', data });
          map.current?.addLayer({
            id: 'lines-layer',
            type: 'line',
            source: 'lines',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 4
            }
          });
        }).catch(err => console.log('Lines fetch error', err));

      // Fetch stations
      fetch('http://localhost:3001/map/stations')
        .then(res => res.json())
        .then(data => {
          map.current?.addSource('stations', { type: 'geojson', data });
          map.current?.addLayer({
            id: 'stations-layer',
            type: 'circle',
            source: 'stations',
            paint: {
              'circle-radius': 5,
              'circle-color': '#ffffff',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#000000'
            }
          });
        }).catch(err => console.log('Stations fetch error', err));
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="h-[calc(100vh-48px)] px-6 py-6 flex flex-col md:flex-row gap-6 text-zinc-100">
      
      {/* Left Panel: Stats */}
      <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold mb-4">Network Pulse</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4">
              <div className="text-2xl font-bold text-cyan-400">5,444</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Live Trains</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4">
              <div className="text-2xl font-bold">6</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Cities</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4">
              <div className="text-2xl font-bold">194</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Stations</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4">
              <div className="text-2xl font-bold">6</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Lines</div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Recent Journeys</h3>
            <Link href="/analytics" className="text-xs text-cyan-400 hover:underline">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <div className="p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="text-sm font-medium truncate">Kashmere Gate → HUDA City</div>
              <div className="flex justify-between text-xs text-zinc-400 mt-2">
                <span>32 min</span>
                <span className="font-semibold text-zinc-300">₹30</span>
              </div>
            </div>
            <div className="p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="text-sm font-medium truncate">Rajiv Chowk → Airport</div>
              <div className="flex justify-between text-xs text-zinc-400 mt-2">
                <span>45 min</span>
                <span className="font-semibold text-zinc-300">₹60</span>
              </div>
            </div>
            <div className="p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="text-sm font-medium truncate">Kochi Central → Aluva</div>
              <div className="flex justify-between text-xs text-zinc-400 mt-2">
                <span>18 min</span>
                <span className="font-semibold text-zinc-300">₹20</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Map */}
      <div className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden relative min-h-[400px]">
        <div ref={mapContainer} className="absolute inset-0" />
        <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-md rounded-xl p-3 shadow-xl z-10 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Live Telemetry Active</span>
        </div>
      </div>

      {/* Right Panel: Plan & Alerts */}
      <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
          <h2 className="text-lg font-semibold mb-4">Quick Plan</h2>
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 focus-within:border-cyan-500/50">
              <MapPin className="text-zinc-400 w-4 h-4 shrink-0" />
              <input type="text" placeholder="Where from?" className="bg-transparent outline-none w-full text-sm" value={from} onChange={e=>setFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50 focus-within:border-cyan-500/50">
              <MapPin className="text-zinc-400 w-4 h-4 shrink-0" />
              <input type="text" placeholder="Where to?" className="bg-transparent outline-none w-full text-sm" value={to} onChange={e=>setTo(e.target.value)} />
            </div>
          </div>
          <Link href="/plan" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            <Navigation className="w-4 h-4" />
            Search Routes
          </Link>
        </div>

        <div className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500"/> Live Alerts</h3>
            <Link href="/alerts" className="text-xs text-zinc-400 hover:text-white">All Alerts</Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <div className="p-3 bg-zinc-800/40 rounded-xl border-l-2 border-red-500 border-t border-r border-b border-zinc-700/30">
              <div className="text-xs font-bold text-red-400 mb-1">CRITICAL</div>
              <div className="text-sm font-medium">Red Line Delay</div>
              <div className="text-xs text-zinc-400 mt-1 truncate">Platform 3 signal fault. 15 min delays.</div>
            </div>
            <div className="p-3 bg-zinc-800/40 rounded-xl border-l-2 border-yellow-500 border-t border-r border-b border-zinc-700/30">
              <div className="text-xs font-bold text-yellow-400 mb-1">WARNING</div>
              <div className="text-sm font-medium">Yellow Line Maint.</div>
              <div className="text-xs text-zinc-400 mt-1 truncate">Sat 02:00-05:00 reduced service.</div>
            </div>
            <div className="p-3 bg-zinc-800/40 rounded-xl border-l-2 border-emerald-500 border-t border-r border-b border-zinc-700/30">
              <div className="text-xs font-bold text-emerald-400 mb-1">INFO</div>
              <div className="text-sm font-medium">New Stations Open</div>
              <div className="text-xs text-zinc-400 mt-1 truncate">Janakpuri West extension is live.</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
