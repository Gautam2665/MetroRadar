"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Navigation,
  BookmarkCheck,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Map View", icon: Map },
  { href: "/plan", label: "Plan Journey", icon: Navigation },
  { href: "/journeys", label: "My Journeys", icon: BookmarkCheck },
  { href: "/passes", label: "Digital Passes", icon: CreditCard },
  { href: "/payments", label: "Wallet & NCMC", icon: Wallet },
  { href: "/alerts", label: "Line Alerts", icon: AlertTriangle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="h-14 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0 select-none">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center space-x-2 group">
        <div className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 group-hover:bg-sky-500/20 transition">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <span className="text-sm font-black tracking-wider uppercase text-sky-400 group-hover:text-sky-300 transition">
            TransitOS
          </span>
          <span className="text-[9px] font-bold text-zinc-500 block -mt-1 tracking-widest uppercase">
            Urban Mobility Platform
          </span>
        </div>
      </Link>

      {/* Nav Tabs */}
      <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-sky-500/10 border border-sky-400/40 text-sky-400 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              <Icon size={14} className={isActive ? "text-sky-400" : "text-zinc-500"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Network Badge */}
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          ● CTM v1.0 Active
        </span>
      </div>
    </header>
  );
}
