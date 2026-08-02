'use client';
import { useState } from 'react';
import { CreditCard, Wallet, Plus, Zap } from 'lucide-react';

export default function PassesPage() {
  const [activeTab, setActiveTab] = useState('My Passes');
  const tabs = ['Tickets', 'My Passes'];

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-6 text-white">Passes & Wallet</h1>
      
      <div className="flex gap-2 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/60 w-fit mb-8">
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Passes */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Active Passes</h2>
          <div className="bg-purple-900/40 border border-purple-700/40 rounded-2xl backdrop-blur-md p-6 relative overflow-hidden shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2 inline-block">Active</span>
                <h3 className="text-xl font-bold text-white">Monthly Metro Pass</h3>
                <div className="text-purple-200 mt-1">Valid till 28 Aug 2026</div>
              </div>
              <div className="text-2xl font-bold">₹840</div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2 text-purple-200">
                <span>Trips Used</span>
                <span className="font-medium text-white">48 / 60</span>
              </div>
              <div className="w-full bg-purple-950/50 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-xl transition-colors border border-white/10">
                View Pass
              </button>
              <button className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-xl transition-colors">
                Recharge
              </button>
            </div>
          </div>

          <h2 className="text-xl font-semibold mt-8">Available Passes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col justify-between h-40 hover:border-zinc-700 transition-colors">
              <div>
                <h4 className="font-semibold text-lg">Weekly Pass</h4>
                <div className="text-zinc-400 text-sm mt-1">Unlimited trips for 7 days</div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="font-bold text-xl">₹250</span>
                <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700">Buy</button>
              </div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col justify-between h-40 hover:border-zinc-700 transition-colors">
              <div>
                <h4 className="font-semibold text-lg">Daily Pass</h4>
                <div className="text-zinc-400 text-sm mt-1">24h unlimited access</div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="font-bold text-xl">₹60</span>
                <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700">Buy</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Wallet */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">NCMC Wallet</h2>
          <div className="bg-zinc-900/80 border border-cyan-900/50 rounded-2xl backdrop-blur-md p-6 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(6,182,212,0.2)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-3 mb-6 text-cyan-400">
              <Wallet className="w-6 h-6" />
              <span className="font-medium">Transit Wallet</span>
            </div>

            <div className="mb-8">
              <div className="text-zinc-400 text-sm mb-1">Available Balance</div>
              <div className="text-5xl font-bold text-white tracking-tight">₹256<span className="text-3xl text-zinc-500">.40</span></div>
            </div>

            <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              Add Money
            </button>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              {[
                { title: 'Trip: Kashmere Gate', time: 'Today, 09:42 AM', amount: '-₹30', type: 'trip' },
                { title: 'Wallet Top-up', time: 'Yesterday, 14:20', amount: '+₹200', type: 'add', text: 'text-emerald-400' },
                { title: 'Trip: Rajiv Chowk', time: '12 Aug, 18:15', amount: '-₹45', type: 'trip' },
                { title: 'Trip: HUDA City', time: '11 Aug, 08:30', amount: '-₹30', type: 'trip' },
                { title: 'Wallet Top-up', time: '01 Aug, 10:00', amount: '+₹500', type: 'add', text: 'text-emerald-400' },
              ].map((tx, i) => (
                <div key={i} className="flex justify-between items-center pb-4 border-b border-zinc-800/50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      {tx.type === 'add' ? <Plus className="w-4 h-4 text-emerald-400"/> : <Zap className="w-4 h-4 text-zinc-400"/>}
                    </div>
                    <div>
                      <div className="font-medium">{tx.title}</div>
                      <div className="text-xs text-zinc-500">{tx.time}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.text || 'text-zinc-200'}`}>{tx.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
