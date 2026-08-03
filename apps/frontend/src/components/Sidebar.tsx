"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/", icon: "home" },
    { label: "Plan Journey", href: "/plan", icon: "directions" },
    { label: "Live Network", href: "/?mode=live", icon: "sensors" },
    { label: "My Journeys", href: "/journeys", icon: "route" },
    { label: "Tickets & Passes", href: "/passes", icon: "confirmation_number" },
    { label: "Alerts", href: "/alerts", icon: "notifications_active" },
    { label: "Analytics", href: "/analytics", icon: "analytics" },
    { label: "Payments", href: "/payments", icon: "payments" },
    { label: "Settings", href: "/settings", icon: "settings" },
  ];

  return (
    <>
      {/* Desktop SideNavBar */}
      <aside className="hidden md:flex flex-col h-screen py-6 fixed left-0 top-0 w-[260px] bg-[#1c2028]/80 backdrop-blur-[20px] border-r border-white/10 z-50 transition-all duration-300">
        <div className="px-6 mb-8">
          <Link href="/">
            <h1 className="text-[24px] font-bold text-[#c3f5ff] tracking-tight hover:opacity-90 transition-opacity cursor-pointer">
              transitOS
            </h1>
          </Link>
          <p className="text-[14px] text-[#bac9cc]">Urban Mobility Platform</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg group transition-colors duration-200 ${
                  isActive
                    ? "bg-[#7000ff]/20 text-[#c3f5ff] border-l-4 border-[#c3f5ff] font-semibold"
                    : "text-[#bac9cc] hover:bg-white/5 hover:text-[#c3f5ff]"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="text-[14px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 mt-auto space-y-4">
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[#c3f5ff] text-[32px]">
                account_circle
              </span>
              <div>
                <p className="text-[16px] font-semibold text-[#dfe2ee]">Gautam Mulay</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></span>
                  <p className="text-[10px] font-bold tracking-wider text-[#4ade80]">NCMC ACTIVE</p>
                </div>
              </div>
            </div>
            <Link
              href="/settings"
              className="w-full py-2 text-[14px] text-[#bac9cc] hover:text-[#c3f5ff] transition-colors flex items-center justify-center gap-2 border-t border-white/5 pt-2"
            >
              <span className="material-symbols-outlined text-sm">settings</span> Account Settings
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 bg-[#31353e]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-xl md:hidden shadow-xl pb-safe">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-colors ${
            pathname === "/" ? "text-[#c3f5ff]" : "text-[#bac9cc]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Home</span>
        </Link>
        <Link
          href="/plan"
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-colors ${
            pathname === "/plan" ? "text-[#c3f5ff]" : "text-[#bac9cc]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">directions</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Plan</span>
        </Link>
        <Link
          href="/passes"
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-colors ${
            pathname === "/passes" ? "text-[#c3f5ff]" : "text-[#bac9cc]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Tickets</span>
        </Link>
        <Link
          href="/alerts"
          className={`flex flex-col items-center justify-center w-1/4 h-full transition-colors ${
            pathname === "/alerts" ? "text-[#c3f5ff]" : "text-[#bac9cc]"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">Alerts</span>
        </Link>
      </nav>
    </>
  );
}
