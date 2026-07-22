"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type MapContainerProps = {
  center: [number, number];
  zoom: number;
  activeLayers: string[];
  selectedStationId: string | null;
  onStationSelect: (stationId: string) => void;
  onViewportChange: (center: [number, number], zoom: number) => void;
  apiLatencySetter: (ms: number) => void;
  setLoadedLayersCount: (count: number) => void;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
};

export default function MapContainer({
  center,
  zoom,
  activeLayers,
  selectedStationId,
  onStationSelect,
  onViewportChange,
  apiLatencySetter,
  setLoadedLayersCount,
  mapRef,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    const styleUrl =
      process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
      "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      pitch: 0,
      bearing: 0,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    map.on("load", () => {
      setMapLoaded(true);
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      onViewportChangeRef.current([c.lng, c.lat], map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapRef]);

  // Update center and zoom when props change externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const currentCenter = map.getCenter();
    const centerDiff =
      Math.abs(currentCenter.lng - center[0]) > 0.0001 ||
      Math.abs(currentCenter.lat - center[1]) > 0.0001;
    const zoomDiff = Math.abs(map.getZoom() - zoom) > 0.1;

    if (centerDiff || zoomDiff) {
      map.flyTo({
        center: center,
        zoom: zoom,
        speed: 1.2,
        curve: 1.42,
        essential: true,
      });
    }
  }, [center, zoom, mapLoaded, mapRef]);

  // Load and style GIS Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
    let layersLoaded = 0;

    const syncLayers = async () => {
      // 1. LINES LAYER
      if (activeLayers.includes("lines")) {
        try {
          const start = performance.now();
          const res = await fetch(`${backendUrl}/map/lines?t=${Date.now()}`);
          const ms = Math.round(performance.now() - start);
          apiLatencySetter(ms);

          const geojson = await res.json();

          if (map.getSource("lines-source")) {
            (map.getSource("lines-source") as maplibregl.GeoJSONSource).setData(geojson);
          } else {
            map.addSource("lines-source", { type: "geojson", data: geojson });
            map.addLayer({
              id: "lines-layer",
              type: "line",
              source: "lines-source",
              paint: {
                "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  2,
                  14,
                  4,
                  18,
                  8,
                ],
                "line-opacity": 0.85,
              },
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
            });
          }
          layersLoaded++;
        } catch (err) {
          console.error("Failed to load lines GIS layer:", err);
        }
      } else {
        if (map.getLayer("lines-layer")) map.removeLayer("lines-layer");
        if (map.getSource("lines-source")) map.removeSource("lines-source");
      }

      // 2. STATIONS LAYER
      if (activeLayers.includes("stations")) {
        try {
          const start = performance.now();
          const res = await fetch(`${backendUrl}/map/stations?t=${Date.now()}`);
          const ms = Math.round(performance.now() - start);
          apiLatencySetter(ms);

          const geojson = await res.json();

          if (map.getSource("stations-source")) {
            (map.getSource("stations-source") as maplibregl.GeoJSONSource).setData(geojson);
          } else {
            map.addSource("stations-source", { type: "geojson", data: geojson });
            map.addLayer({
              id: "stations-layer",
              type: "circle",
              source: "stations-source",
              paint: {
                "circle-color": "#06b6d4",
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  4,
                  14,
                  7,
                  18,
                  12,
                ],
                "circle-stroke-color": "#09090b",
                "circle-stroke-width": 2,
              },
            });

            // Handle Interaction
            map.on("click", "stations-layer", (e) => {
              const features = map.queryRenderedFeatures(e.point, { layers: ["stations-layer"] });
              if (features.length > 0) {
                const id = features[0].properties?.id;
                if (id) onStationSelect(id);
              }
            });

            map.on("mouseenter", "stations-layer", () => {
              map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", "stations-layer", () => {
              map.getCanvas().style.cursor = "";
            });
          }
          layersLoaded++;
        } catch (err) {
          console.error("Failed to load stations GIS layer:", err);
        }
      } else {
        if (map.getLayer("stations-layer")) map.removeLayer("stations-layer");
        if (map.getSource("stations-source")) map.removeSource("stations-source");
      }

      // 3. SELECTION STATE GLOW
      if (selectedStationId && activeLayers.includes("stations")) {
        try {
          const start = performance.now();
          const res = await fetch(`${backendUrl}/map/stations/${selectedStationId}?t=${Date.now()}`);
          const ms = Math.round(performance.now() - start);
          apiLatencySetter(ms);

          const feature = await res.json();

          if (map.getSource("selected-station-source")) {
            (map.getSource("selected-station-source") as maplibregl.GeoJSONSource).setData(feature);
          } else {
            map.addSource("selected-station-source", { type: "geojson", data: feature });
            map.addLayer({
              id: "selected-station-glow",
              type: "circle",
              source: "selected-station-source",
              paint: {
                "circle-color": "transparent",
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  8,
                  14,
                  15,
                  18,
                  25,
                ],
                "circle-stroke-color": "#06b6d4",
                "circle-stroke-width": 2.5,
                "circle-stroke-opacity": 0.8,
              },
            });
          }
        } catch (err) {
          console.error("Failed to load selection overlay:", err);
        }
      } else {
        if (map.getLayer("selected-station-glow")) map.removeLayer("selected-station-glow");
        if (map.getSource("selected-station-source")) map.removeSource("selected-station-source");
      }

      setLoadedLayersCount(layersLoaded);
    };

    syncLayers();
  }, [activeLayers, selectedStationId, mapLoaded, apiLatencySetter, onStationSelect, setLoadedLayersCount, mapRef]);

  return (
    <div className="flex-1 h-full relative bg-zinc-950">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090b] z-30">
          <div className="text-center space-y-3">
            <div className="h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 font-mono tracking-wider uppercase">Loading digital twin map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
