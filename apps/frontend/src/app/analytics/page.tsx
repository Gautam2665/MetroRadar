'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Leaf, Navigation, MapPin } from 'lucide-react';

const spendingData = [
  { name: 'Mon', amount: 45 },
  { name: 'Tue', amount: 80 },
  { name: 'Wed', amount: 30 },
  { name: 'Thu', amount: 120 },
  { name: 'Fri', amount: 90 },
  { name: 'Sat', amount: 150 },
  { name: 'Sun', amount: 5 },
];

const pieData = [
  { name: 'Metro', value: 65, color: '#06B6D4' },
  { name: 'Bus', value: 25, color: '#8B5CF6' },
  { name: 'Other', value: 10, color: '#71717A' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('This Month');
  const periods = ['This Month', 'Last Month', 'Year'];

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto text-zinc-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white">Analytics & Impact</h1>
        <div className="flex gap-2 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/60">
          {periods.map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="text-zinc-400 text-sm mb-2">Total Journeys</div>
          <div className="text-4xl font-bold">18</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="text-zinc-400 text-sm mb-2">Total Spent</div>
          <div className="text-4xl font-bold text-cyan-400">₹520</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <div className="text-zinc-400 text-sm mb-2">CO₂ Saved</div>
          <div className="text-4xl font-bold text-emerald-400">24.6 kg</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <h2 className="text-lg font-semibold mb-6">Spending Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip 
                  cursor={{ fill: '#27272a' }} 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <h2 className="text-lg font-semibold mb-6">Mode Split</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-3">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-zinc-300">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-2xl backdrop-blur-md p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="text-emerald-400 w-6 h-6" />
            <h2 className="text-xl font-bold text-emerald-400">Environmental Impact</h2>
          </div>
          <p className="text-zinc-300 mb-6">By choosing public transit this month, you've made a real difference!</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-950/30 rounded-xl border border-emerald-900/50">
              <div className="text-2xl mb-2">🌳</div>
              <div className="font-bold text-lg text-white">1.2</div>
              <div className="text-xs text-emerald-300">Trees saved</div>
            </div>
            <div className="text-center p-4 bg-emerald-950/30 rounded-xl border border-emerald-900/50">
              <div className="text-2xl mb-2">🚗</div>
              <div className="font-bold text-lg text-white">120</div>
              <div className="text-xs text-emerald-300">km no car</div>
            </div>
            <div className="text-center p-4 bg-emerald-950/30 rounded-xl border border-emerald-900/50">
              <div className="text-2xl mb-2">☁️</div>
              <div className="font-bold text-lg text-white">24.6</div>
              <div className="text-xs text-emerald-300">kg CO₂</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md p-6">
          <h2 className="text-lg font-semibold mb-6">Top Routes</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center"><Navigation className="w-4 h-4"/></div>
                <div>
                  <div className="font-medium">Kashmere Gate → HUDA City</div>
                  <div className="text-xs text-zinc-400">Yellow Line</div>
                </div>
              </div>
              <div className="font-semibold">8 trips</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center"><Navigation className="w-4 h-4"/></div>
                <div>
                  <div className="font-medium">Rajiv Chowk → Airport</div>
                  <div className="text-xs text-zinc-400">Orange Line</div>
                </div>
              </div>
              <div className="font-semibold">5 trips</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
