"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useStationContext } from "../contexts/StationContext";
import { useDigitalTwin } from "../hooks/useDigitalTwin";
import { DigitalTwinInspectorView } from "../components/inspector/DigitalTwinInspectorView";

export function DigitalTwinContainer() {
  const { selectedStationId, selectedStationName, clearSelectedStation } = useStationContext();
  const { data: digitalTwin, loading } = useDigitalTwin(selectedStationId, selectedStationName);
  const [activeLevel, setActiveLevel] = useState<string>("G");

  return (
    <AnimatePresence>
      {selectedStationId && digitalTwin && (
        <DigitalTwinInspectorView
          key={selectedStationId}
          digitalTwin={digitalTwin}
          loading={loading}
          activeLevel={activeLevel}
          onLevelSelect={(levelId) => setActiveLevel(levelId)}
          onClose={clearSelectedStation}
        />
      )}
    </AnimatePresence>
  );
}
