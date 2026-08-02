import Link from "next/link";
import { CreditCard, ArrowLeft } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-[#080C14] text-[#f4f4f5] p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md p-8 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-2xl w-fit mx-auto">
          <CreditCard size={28} />
        </div>
        <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">Payments & Wallet</h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Top up your stored-value transit wallet, manage UPI AutoPay mandates, and inspect transaction receipts.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-sky-400 hover:text-sky-300 transition-all"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
