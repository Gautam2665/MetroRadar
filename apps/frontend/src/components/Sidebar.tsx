"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInfoModal } from "../contexts/InfoModalContext";

export function Sidebar() {
  const pathname = usePathname();
  const { openInfoModal } = useInfoModal();

  const desktopNavItems = [
    { label: "Live Map", href: "/", icon: "map" },
    { label: "Plan Journey", href: "/plan", icon: "directions" },
    { label: "Explore Lines", href: "/lines", icon: "alt_route" },
    { label: "Explore Stations", href: "/stations", icon: "location_city" },
    { label: "Live Radar", href: "/network", icon: "sensors" },
  ];

  const mobileNavItems = [
    { label: "Explore", href: "/", icon: "explore" },
    { label: "Plan", href: "/plan", icon: "route" },
    { label: "Lines", href: "/lines", icon: "alt_route" },
    { label: "Stations", href: "/stations", icon: "location_city" },
    { label: "Live", href: "/network", icon: "sensors" },
  ];

  return (
    <>
      {/* Desktop SideNavBar: Compact 64px Icon Rail */}
      <aside className="hidden md:flex flex-col h-screen py-4 fixed left-0 top-0 w-16 bg-[#080E18]/95 backdrop-blur-xl border-r border-[#141F30] z-50 items-center justify-between transition-all duration-300 select-none">
        {/* Brand Icon */}
        <div className="flex flex-col items-center">
          <Link
            href="/"
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00D5E8] to-[#2563EB] shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform"
            title="transitOS Home"
          >
            <span className="material-symbols-outlined text-white text-[22px]">subway</span>
            <span className="absolute left-14 px-2 py-1 bg-[#0D1522] border border-[#1F2E44] text-[11px] font-bold text-white rounded-md shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              transit<span className="text-[#00D5E8]">OS</span>
            </span>
          </Link>
        </div>

        {/* Navigation Items (Icon Only + Tooltip on Hover) */}
        <nav className="flex flex-col items-center space-y-3">
          {desktopNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-tr from-[#00D5E8]/20 to-[#2563EB]/25 text-[#00D5E8] border border-[#00D5E8]/40 shadow-[0_0_12px_rgba(0,213,232,0.25)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px] transition-colors"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>

                {/* Floating Tooltip */}
                <span className="absolute left-14 px-2.5 py-1 bg-[#0D1522]/98 border border-[#1F2E44] text-xs font-semibold text-white rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility: Mobility Intelligence Workbench & System Info */}
        <div className="flex flex-col items-center space-y-2">
          <Link
            href="/analytics"
            className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
              pathname.startsWith("/analytics")
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-amber-400 hover:bg-slate-800/60"
            }`}
            title="TransitOS Mobility Intelligence"
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="absolute left-14 px-2.5 py-1 bg-[#0D1522]/98 border border-[#1F2E44] text-xs font-semibold text-white rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              TransitOS Mobility Intelligence
            </span>
          </Link>

          <button
            onClick={openInfoModal}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#00D5E8] hover:bg-slate-800/60 transition cursor-pointer"
            title="System Specs & Info"
          >
            <span className="material-symbols-outlined text-[20px]">info</span>
            <span className="absolute left-14 px-2.5 py-1 bg-[#0D1522]/98 border border-[#1F2E44] text-xs font-semibold text-white rounded-lg shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              System Specs & Info
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile BottomNavBar: 5 Native Tabs with Safe Area Inset Support */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center min-h-[64px] bg-[#080E18]/95 backdrop-blur-2xl border-t border-[#141F30] md:hidden shadow-xl pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                isActive ? "text-[#00D5E8]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
