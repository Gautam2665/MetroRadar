"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInfoModal } from "../contexts/InfoModalContext";

export function Sidebar() {
  const pathname = usePathname();
  const { openInfoModal } = useInfoModal();

  const navItems = [
    { label: "Home", href: "/", icon: "home" },
    { label: "Plan Journey", href: "/plan", icon: "directions" },
    { label: "Explore Lines", href: "/lines", icon: "alt_route" },
    { label: "Explore Stations", href: "/stations", icon: "location_city" },
    { label: "Live Network", href: "/network", icon: "sensors" },
  ];

  return (
    <>
      {/* Desktop SideNavBar */}
      <aside className="hidden md:flex flex-col h-screen pt-5 pb-14 fixed left-0 top-0 w-[260px] bg-[#080E18] border-r border-[#141F30] z-50 transition-all duration-300">
        <div className="px-5 mb-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00D5E8] to-[#2563EB] flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="material-symbols-outlined text-white text-[22px]">subway</span>
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-xl font-bold tracking-tight text-white leading-none">transit</span>
                <span className="text-xl font-extrabold tracking-tight text-[#00D5E8] leading-none">OS</span>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl group transition-all duration-200 text-sm ${
                  isActive
                    ? "bg-gradient-to-r from-[#172242] to-[#121E36] border-l-4 border-[#00D5E8] text-white font-semibold shadow-inner"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40 font-medium"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-colors ${
                    isActive ? "text-[#00D5E8]" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Info / System Specs Modal Trigger */}
          <div className="pt-3 border-t border-[#141F30] space-y-1">
            <button
              onClick={openInfoModal}
              className="w-full flex items-center gap-3 px-3.5 py-2 text-slate-400 hover:text-[#00D5E8] hover:bg-slate-800/40 rounded-xl text-xs font-medium transition-all text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>System Specs & Info</span>
            </button>
          </div>
        </nav>

        {/* Guest Mode Card */}
        <div className="px-3 mt-auto mb-2">
          <div className="bg-[#0D1522] border border-[#19263A] rounded-2xl p-3.5 shadow-md">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-[#00D5E8]">
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white leading-tight">Guest Mode</h4>
                <p className="text-[10px] text-slate-400 leading-tight">Explore without an account</p>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[14px]">check</span>
                <span>Plan journeys</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[14px]">check</span>
                <span>View live network</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[14px] mt-0.5">check</span>
                <div>
                  <span>Save recent journeys</span>
                  <span className="block text-[10px] text-slate-500">(in this browser)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-[#080E18]/95 backdrop-blur-2xl border-t border-[#141F30] md:hidden shadow-xl pb-safe">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${
            pathname === "/" ? "text-[#00D5E8]" : "text-slate-400"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Home</span>
        </Link>
        <Link
          href="/plan"
          className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${
            pathname === "/plan" ? "text-[#00D5E8]" : "text-slate-400"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">directions</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Plan</span>
        </Link>
        <Link
          href="/lines"
          className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${
            pathname === "/lines" ? "text-[#00D5E8]" : "text-slate-400"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">alt_route</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Lines</span>
        </Link>
        <Link
          href="/stations"
          className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${
            pathname === "/stations" ? "text-[#00D5E8]" : "text-slate-400"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">location_city</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Stations</span>
        </Link>
        <Link
          href="/network"
          className={`flex flex-col items-center justify-center w-1/5 h-full transition-colors ${
            pathname === "/network" ? "text-[#00D5E8]" : "text-slate-400"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sensors</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Live</span>
        </Link>
      </nav>
    </>
  );
}
