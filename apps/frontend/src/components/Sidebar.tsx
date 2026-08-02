"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Train,
  Navigation,
  MapPin,
  BarChart3,
  CreditCard,
  Bell,
  DollarSign,
  Settings,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard",       href: "/",          icon: Train      },
  { label: "Plan Journey",    href: "/plan",       icon: Navigation },
  { label: "Stations",        href: "/stations",   icon: MapPin     },
  { label: "Analytics",       href: "/analytics",  icon: BarChart3  },
  { label: "Passes & Wallet", href: "/passes",     icon: CreditCard },
  { label: "Alerts",          href: "/alerts",     icon: Bell       },
  { label: "Payments",        href: "/payments",   icon: DollarSign },
  { label: "Settings",        href: "/settings",   icon: Settings   },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-zinc-950/90 border-r border-zinc-800/60 backdrop-blur-md">

      {/* Logo */}
      <div className="flex flex-col gap-1 px-5 pt-6 pb-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 ring-1 ring-cyan-500/30">
            <Train className="h-5 w-5 text-cyan-400" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white font-sans">
            TransitOS
          </span>
        </div>
        <p className="ml-[3.0rem] text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Urban Mobility Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={[
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 pl-[10px]",
                isActive
                  ? "border-l-2 border-cyan-400 bg-cyan-500/10 text-cyan-400"
                  : "border-l-2 border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-white",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-cyan-400"
                    : "text-zinc-500 group-hover:text-white",
                ].join(" ")}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className="truncate">{label}</span>

              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_2px_rgba(6,182,212,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-zinc-800/60 px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30">
            <span className="text-xs font-bold text-cyan-400 tracking-wide">
              GS
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white leading-tight">
              Gautam Singh
            </p>
            <p className="text-[11px] text-zinc-500 leading-tight">
              Passenger
            </p>
          </div>

          <button
            aria-label="Log out"
            className="group flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-150 hover:bg-zinc-800 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}
