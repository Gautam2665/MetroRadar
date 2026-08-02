import { CreditCard, Smartphone, Plus } from 'lucide-react';

export default function PaymentsPage() {
  const transactions = [
    { date: '14 Aug', route: 'Kashmere Gate → HUDA City', mode: 'Metro', amount: '₹30', status: 'Completed' },
    { date: '12 Aug', route: 'Rajiv Chowk → Airport', mode: 'Multi', amount: '₹45', status: 'Completed' },
    { date: '10 Aug', route: 'Wallet Top-up', mode: 'UPI', amount: '₹200', status: 'Completed' },
    { date: '08 Aug', route: 'Kochi Central → Aluva', mode: 'Metro', amount: '₹20', status: 'Completed' },
    { date: '05 Aug', route: 'Daily Pass', mode: 'Pass', amount: '₹60', status: 'Refunded' },
    { date: '02 Aug', route: 'MG Road → Cyber City', mode: 'Metro', amount: '₹25', status: 'Completed' },
    { date: '01 Aug', route: 'Wallet Top-up', mode: 'Card', amount: '₹500', status: 'Pending' },
    { date: '28 Jul', route: 'Sector 55 → Sikanderpur', mode: 'Metro', amount: '₹15', status: 'Completed' },
  ];

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto text-zinc-100">
      <h1 className="text-3xl font-bold mb-8 text-white">Payments</h1>

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-white">Payment Methods</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-cyan-500/50 transition-colors cursor-pointer">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors"></div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-zinc-400" />
              <span className="font-semibold">Visa Card</span>
            </div>
            <div className="font-mono text-zinc-400 mt-4">**** **** **** 4242</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-cyan-500/50 transition-colors cursor-pointer">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors"></div>
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-zinc-400" />
              <span className="font-semibold">Google Pay</span>
            </div>
            <div className="text-zinc-400 mt-4 text-sm">gautam@okaxis</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-cyan-500/50 transition-colors cursor-pointer">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-xl group-hover:bg-blue-400/20 transition-colors"></div>
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-zinc-400" />
              <span className="font-semibold">Paytm</span>
            </div>
            <div className="text-zinc-400 mt-4 text-sm">+91 98765 43210</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center h-32 hover:bg-zinc-800/50 hover:border-zinc-600 transition-colors cursor-pointer text-zinc-400 hover:text-white">
            <Plus className="w-6 h-6 mb-2" />
            <span className="font-medium text-sm">Add New</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Transaction History</h2>
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800/80 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Mode</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 text-zinc-400">{tx.date}</td>
                    <td className="px-6 py-4 font-medium">{tx.route}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300">{tx.mode}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{tx.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        tx.status === 'Refunded' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
