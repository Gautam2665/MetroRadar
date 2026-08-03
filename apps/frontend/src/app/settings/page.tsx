"use client";

import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <div>
              <h2 className="text-[32px] font-bold text-[#dfe2ee] mb-6">Settings</h2>
            </div>

            {/* Profile Card */}
            <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-white/10">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#c3f5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <img
                  alt="Gautam Mulay Profile"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9V9ms5PUnw2CbJiHOMocoOGvJIvGGqIoxveHvQsbFZlYDR-W3gi4ZyJN85avpBOR8fXcGPaGdJFKhkLNmPK29nEkB5KHADZi3TV-o4YjKGqkxW38rxJDCAahq3lM41qbOCCVZjxW5OYEF_qBz-EAotY91Vo7lgLrOV7kfO7XXUFZna0nu59WL7-1m-_YGc3kX_RfAHLDe-S8dUwZPaA48rHs5TMlN826402yehaf_7Yewc37ERYPW"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-[24px] font-bold text-[#dfe2ee] mb-1">Gautam Mulay</h3>
                <p className="text-[14px] text-[#bac9cc] mb-4">gautam.m@transitos.io</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7000ff]/20 border border-[#7000ff]/30">
                  <span className="text-[#c3f5ff] text-xs font-bold uppercase tracking-wider">NCMC Standard</span>
                </div>
              </div>
              <button className="px-6 py-2 rounded-full glass-card border-[#c3f5ff] text-[#c3f5ff] font-semibold text-sm hover:bg-[#c3f5ff]/10 transition-colors">
                Edit Profile
              </button>
            </div>

            {/* Settings Options */}
            <div className="space-y-4">
              {[
                { title: "Saved Places", desc: "Manage home, work, and frequent destinations", icon: "location_on" },
                { title: "Notification Triggers", desc: "Configure push alerts for delays and arrivals", icon: "notifications_active" },
                { title: "Accessibility", desc: "Step-free routing and high contrast preferences", icon: "accessibility_new" },
                { title: "App Settings", desc: "Language, region, and map display options", icon: "tune" },
                { title: "Help & Support", desc: "FAQs, contact support, and report issues", icon: "help" },
                { title: "About transitOS", desc: "Version 4.2.1, terms of service, and privacy policy", icon: "info" },
              ].map((item, idx) => (
                <div key={idx} className="glass-card rounded-lg p-4 flex items-center justify-between group hover:border-[#c3f5ff]/50 transition-colors cursor-pointer border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#262a33] flex items-center justify-center text-[#c3f5ff]">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-[16px] font-semibold text-[#dfe2ee]">{item.title}</h4>
                      <p className="text-[14px] text-[#bac9cc]">{item.desc}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#bac9cc] group-hover:text-[#c3f5ff] transition-colors">
                    chevron_right
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
