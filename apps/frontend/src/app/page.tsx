"use client";

import { CityProvider } from "../contexts/CityContext";
import { StationProvider } from "../contexts/StationContext";
import { DashboardContainer } from "../containers/DashboardContainer";

export default function HomePage() {
  return (
    <CityProvider>
      <StationProvider>
        <DashboardContainer />
      </StationProvider>
    </CityProvider>
  );
}
