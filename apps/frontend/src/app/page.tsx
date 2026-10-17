"use client";

import { Suspense } from "react";
import { DashboardContainer } from "../containers/DashboardContainer";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#070B12]" />}>
      <DashboardContainer />
    </Suspense>
  );
}
