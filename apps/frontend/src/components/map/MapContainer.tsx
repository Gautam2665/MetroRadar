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
  journeyGeojson?: GeoJSON.FeatureCollection | null;
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
  journeyGeojson,
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

  // ── Journey Highlight Layer ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const JOURNEY_LINE_SOURCE = "journey-highlight-source";
    const JOURNEY_LINE_LAYER = "journey-highlight-layer";
    const JOURNEY_LINE_GLOW = "journey-highlight-glow";
    const JOURNEY_POINTS_SOURCE = "journey-points-source";
    const JOURNEY_ORIGIN_LAYER = "journey-origin-layer";
    const JOURNEY_DEST_LAYER = "journey-dest-layer";
    const JOURNEY_TRANSFER_LAYER = "journey-transfer-layer";

    const cleanupJourneyLayers = () => {
      [
        JOURNEY_LINE_GLOW,
        JOURNEY_LINE_LAYER,
        JOURNEY_ORIGIN_LAYER,
        JOURNEY_DEST_LAYER,
        JOURNEY_TRANSFER_LAYER,
      ].forEach((l) => { if (map.getLayer(l)) map.removeLayer(l); });
      [JOURNEY_LINE_SOURCE, JOURNEY_POINTS_SOURCE].forEach((s) => {
        if (map.getSource(s)) map.removeSource(s);
      });
    };

    if (!journeyGeojson) {
      cleanupJourneyLayers();
      return;
    }

    // Separate segment features from point features
    const segmentFeatures = journeyGeojson.features.filter(
      (f) => f.geometry.type === "LineString"
    );
    const pointFeatures = journeyGeojson.features.filter(
      (f) => f.geometry.type === "Point"
    );

    const lineCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: segmentFeatures,
    };
    const pointCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: pointFeatures,
    };

    // Render line source + glow + main layer
    if (map.getSource(JOURNEY_LINE_SOURCE)) {
      (map.getSource(JOURNEY_LINE_SOURCE) as maplibregl.GeoJSONSource).setData(lineCollection);
    } else {
      map.addSource(JOURNEY_LINE_SOURCE, { type: "geojson", data: lineCollection });

      // Glow (thick, low opacity)
      map.addLayer({
        id: JOURNEY_LINE_GLOW,
        type: "line",
        source: JOURNEY_LINE_SOURCE,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#06b6d4"],
          "line-width": 14,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });

      // Main route line
      map.addLayer({
        id: JOURNEY_LINE_LAYER,
        type: "line",
        source: JOURNEY_LINE_SOURCE,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#06b6d4"],
          "line-width": 5,
          "line-opacity": 0.95,
          "line-dasharray": [1, 0],
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });
    }

    // Render point markers
    if (map.getSource(JOURNEY_POINTS_SOURCE)) {
      (map.getSource(JOURNEY_POINTS_SOURCE) as maplibregl.GeoJSONSource).setData(pointCollection);
    } else {
      map.addSource(JOURNEY_POINTS_SOURCE, { type: "geojson", data: pointCollection });

      // Transfer markers
      map.addLayer({
        id: JOURNEY_TRANSFER_LAYER,
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: ["==", ["get", "featureType"], "journey-transfer"],
        paint: {
          "circle-color": "#f59e0b",
          "circle-radius": 7,
          "circle-stroke-color": "#09090b",
          "circle-stroke-width": 2,
        },
      });

      // Origin marker
      map.addLayer({
        id: JOURNEY_ORIGIN_LAYER,
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: ["==", ["get", "featureType"], "journey-origin"],
        paint: {
          "circle-color": "#22c55e",
          "circle-radius": 9,
          "circle-stroke-color": "#09090b",
          "circle-stroke-width": 2.5,
        },
      });

      // Destination marker
      map.addLayer({
        id: JOURNEY_DEST_LAYER,
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: ["==", ["get", "featureType"], "journey-destination"],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": 9,
          "circle-stroke-color": "#09090b",
          "circle-stroke-width": 2.5,
        },
      });
    }
  }, [journeyGeojson, mapLoaded, mapRef]);

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
