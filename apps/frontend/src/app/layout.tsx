import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TransitOS — Urban Mobility Intelligence",
  description: "AI-powered urban transit intelligence platform for India's metro networks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-[#080C14] text-white antialiased">
        {/* Fixed left sidebar */}
        <Sidebar />
        {/* Main content area offset by sidebar width */}
        <div className="pl-64 flex flex-col min-h-screen">
          {/* Sticky top header */}
          <Header />
          {/* Page content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
