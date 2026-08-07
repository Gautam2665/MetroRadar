import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CityProvider } from "../contexts/CityContext";
import { StationProvider } from "../contexts/StationContext";
import { JourneyProvider } from "../contexts/JourneyContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "transitOS — Urban Mobility Intelligence",
  description: "Urban Mobility Intelligence & Transit OS Platform — Real-time Metro Tracking for Indian Cities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col font-sans bg-[#080C14] text-[#dfe2ee]"
        suppressHydrationWarning
      >
        {/* Global State Providers — consumed by any page without prop-drilling */}
        <CityProvider>
          <StationProvider>
            <JourneyProvider>
              {children}
            </JourneyProvider>
          </StationProvider>
        </CityProvider>
      </body>
    </html>
  );
}
