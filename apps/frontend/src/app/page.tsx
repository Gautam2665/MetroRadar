"use client";

// Page.tsx: DashboardContainer already gets CityProvider + StationProvider from root layout.
// DO NOT wrap with local providers here — that causes a duplicate context reset on every mount.
import { DashboardContainer } from "../containers/DashboardContainer";

export default function HomePage() {
  return <DashboardContainer />;
}
