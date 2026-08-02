import Link from 'next/link';
import { ArrowLeft, Navigation, Train, Bus, MapPin, Search } from 'lucide-react';

export default function MultiModalPage() {
  return (
    <div className="px-6 py-6 max-w-2xl mx-auto text-zinc-100 flex flex-col min-h-[calc(100vh-48px)]">
      <Link href="/plan" className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Routes</span>
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
          <Navigation className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Multi-Modal Concierge</h1>
          <p className="text-zinc-400">Your seamless multi-leg journey plan</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {/* Step 1 */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-4 flex gap-4">
          <div className="w-1 bg-zinc-600 rounded-full shrink-0"></div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin className="w-4 h-4 text-zinc-400"/> Walk to Kashmere Gate</h3>
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300">3 min</span>
            </div>
            <p className="text-zinc-400 text-sm">Head south on Main Road for 300m</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-4 flex gap-4">
          <div className="w-1 bg-red-500 rounded-full shrink-0"></div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Train className="w-4 h-4 text-red-400"/> Board Red Line</h3>
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300">24 min</span>
            </div>
            <p className="text-zinc-300 font-medium mb-1">To Rajiv Chowk</p>
            <div className="flex items-center gap-3 text-zinc-400 text-sm">
              <span>12 stops</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
              <span>Coach 3 recommended</span>
            </div>
            <div className="mt-3 inline-block px-2 py-1 rounded bg-zinc-800/80 text-xs font-medium border border-zinc-700/50">₹30</div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-4 flex gap-4">
          <div className="w-1 bg-zinc-600 rounded-full shrink-0"></div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin className="w-4 h-4 text-zinc-400"/> Transfer</h3>
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300">4 min</span>
            </div>
            <p className="text-zinc-400 text-sm">Walk through concourse to Platform 1</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-4 flex gap-4">
          <div className="w-1 bg-yellow-500 rounded-full shrink-0"></div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Train className="w-4 h-4 text-yellow-400"/> Board Yellow Line</h3>
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300">16 min</span>
            </div>
            <p className="text-zinc-300 font-medium mb-1">To HUDA City Centre</p>
            <div className="flex items-center gap-3 text-zinc-400 text-sm">
              <span>8 stops</span>
            </div>
            <div className="mt-3 inline-block px-2 py-1 rounded bg-zinc-800/80 text-xs font-medium border border-zinc-700/50">₹22</div>
          </div>
        </div>
        
        {/* Step 5 */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-4 flex gap-4 items-center">
          <div className="w-4 h-4 rounded-full border-4 border-cyan-500 bg-zinc-900 shrink-0 -ml-1.5"></div>
          <h3 className="font-semibold text-lg text-cyan-400">Arrived at Destination</h3>
        </div>
      </div>

      <div className="sticky bottom-6 mt-8 bg-zinc-900/90 border border-zinc-700/60 rounded-2xl backdrop-blur-xl p-4 flex items-center justify-between shadow-2xl">
        <div>
          <div className="text-zinc-400 text-sm mb-1">Total Trip</div>
          <div className="flex items-center gap-3 font-bold">
            <span className="text-xl">44 min</span>
            <span className="text-zinc-500">|</span>
            <span className="text-xl text-cyan-400">₹52</span>
          </div>
        </div>
        <button className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Start Navigation
        </button>
      </div>
    </div>
  );
}
