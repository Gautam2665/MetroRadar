"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass } from "lucide-react";
const CITY_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  delhi: { center: [77.2090, 28.6139], zoom: 11 },
  kochi: { center: [76.2999, 9.9816], zoom: 12 },
  hyderabad: { center: [78.4867, 17.3850], zoom: 12 },
  bengaluru: { center: [77.5946, 12.9716], zoom: 12 },
  chennai: { center: [80.2707, 13.0827], zoom: 12 },
  ahmedabad: { center: [72.5714, 23.0225], zoom: 12 },
  mumbai: { center: [72.8777, 19.0760], zoom: 12 },
};

const SYSTEM_CODES: Record<string, string> = {
  delhi: "DMRC",
  kochi: "KMRL",
  hyderabad: "HMRL",
  bengaluru: "BMRCL",
  chennai: "CMRL",
  ahmedabad: "GMRC",
  mumbai: "MMRDA",
};

type MapContainerProps = {
  center?: [number, number];
  zoom?: number;
  activeLayers?: string[];
  activeCity?: string;
  selectedStationId?: string | null;
  onStationSelect?: (stationId: string) => void;
  onSelectStation?: (station: { id: string; name: string; code?: string; city?: string }) => void;
  onViewportChange?: (center: [number, number], zoom: number) => void;
  apiLatencySetter?: (ms: number) => void;
  setLoadedLayersCount?: (count: number) => void;
  mapRef?: React.MutableRefObject<maplibregl.Map | null>;
  highlightGeojson?: GeoJSON.FeatureCollection | null;
  journeyGeojson?: GeoJSON.FeatureCollection | null;
};

export default function MapContainer({
  center = [77.2332, 28.6665],
  zoom = 11,
  activeLayers = ["lines", "stations", "vehicles"],
  activeCity = "delhi",
  selectedStationId = null,
  onStationSelect,
  onSelectStation,
  onViewportChange,
  apiLatencySetter,
  setLoadedLayersCount,
  mapRef,
  highlightGeojson,
  journeyGeojson,
}: MapContainerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalMapRef = useRef<maplibregl.Map | null>(null);
  const effectiveMapRef = mapRef || internalMapRef;
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<"3D" | "Satellite" | "Dark">("Dark");

  const handleZoomIn = () => effectiveMapRef.current?.zoomIn();
  const handleZoomOut = () => effectiveMapRef.current?.zoomOut();
  const handleResetNorth = () => effectiveMapRef.current?.resetNorthPitch();

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

    if (mapRef) {
      mapRef.current = map;
    } else {
      internalMapRef.current = map;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    const handleLoad = () => setMapLoaded(true);
    if (map.isStyleLoaded()) {
      setMapLoaded(true);
    } else {
      map.on("load", handleLoad);
    }

    map.on("moveend", () => {
      const c = map.getCenter();
      onViewportChangeRef.current?.([c.lng, c.lat], map.getZoom());
    });

    return () => {
      map.remove();
      effectiveMapRef.current = null;
    };
  }, [mapRef]);

  // Fly to target city center when activeCity changes
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const cityConfig = CITY_CENTERS[activeCity?.toLowerCase() || "delhi"] || CITY_CENTERS.delhi;
    map.flyTo({
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      speed: 1.2,
      curve: 1.4,
      duration: 2500,
      essential: true,
    });
  }, [activeCity, mapLoaded]);

  // Load and style GIS Layers
  useEffect(() => {
    const map = effectiveMapRef.current;
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
          apiLatencySetter?.(ms);

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
          apiLatencySetter?.(ms);

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
                "circle-color": ["coalesce", ["get", "color"], "#06b6d4"],
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

            // Handle Hover & Click Interaction
            const hoverPopup = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 12,
            });

            map.on("mousemove", "stations-layer", (e) => {
              if (e.features && e.features.length > 0) {
                map.getCanvas().style.cursor = "pointer";
                const f = e.features[0];
                const props = f.properties;
                const geom = f.geometry as GeoJSON.Point;
                const name = props?.name || "Station";

                let linesHtml = "";
                try {
                  const rawLines = typeof props?.lines === "string" ? JSON.parse(props.lines) : props?.lines;
                  if (Array.isArray(rawLines) && rawLines.length > 0) {
                    linesHtml = rawLines
                      .slice(0, 2)
                      .map((l: { name?: string; color?: string }) =>
                        `<span style="background: ${l.color || '#00e5ff'}25; color: ${l.color || '#00e5ff'}; border: 1px solid ${l.color || '#00e5ff'}60; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 12px; font-family: system-ui, sans-serif;">${l.name || 'Metro'}</span>`
                      )
                      .join("");
                  }
                } catch {}

                if (!linesHtml && props?.color) {
                  linesHtml = `<span style="background: ${props.color}25; color: ${props.color}; border: 1px solid ${props.color}60; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 12px; font-family: system-ui, sans-serif;">Metro</span>`;
                }

                hoverPopup
                  .setLngLat(geom.coordinates as [number, number])
                  .setHTML(
                    `<div style="background: #0d111a; color: #dfe2ee; font-family: system-ui, -apple-system, sans-serif; padding: 6px 12px; border-radius: 10px; border: 1.5px solid ${props?.color || '#00e5ff'}80; box-shadow: 0 4px 24px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 6px; pointer-events: none;">
                      <span style="color: #ffffff; font-size: 13px; font-weight: 700;">📍 ${name}</span>
                      ${linesHtml}
                    </div>`
                  )
                  .addTo(map);
              }
            });

            map.on("mouseleave", "stations-layer", () => {
              map.getCanvas().style.cursor = "";
              hoverPopup.remove();
            });

            map.on("click", "stations-layer", (e) => {
              const features = map.queryRenderedFeatures(e.point, { layers: ["stations-layer"] });
              if (features.length > 0) {
                const props = features[0].properties;
                if (props?.id) {
                  const stName = props.name || "Station";
                  onStationSelect?.(props.id);
                  onSelectStation?.({
                    id: props.id,
                    name: stName,
                    code: props.code || "STN",
                    city: props.city || activeCity,
                  });
                  // Navigate to Live Network page
                  router.push(`/network?stationId=${props.id}&stationName=${encodeURIComponent(stName)}`);
                }
              }
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
          apiLatencySetter?.(ms);

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

      // 4. LIVE TRAINS LAYER (GTFS-RT Telemetry)
      if (activeLayers.includes("realtime")) {
        try {
          const start = performance.now();
          const systemCode = SYSTEM_CODES[activeCity?.toLowerCase() || "delhi"] || "DMRC";
          const res = await fetch(`${backendUrl}/realtime/vehicles?system=${systemCode}&t=${Date.now()}`);
          const ms = Math.round(performance.now() - start);
          apiLatencySetter?.(ms);

          type VehicleData = {
            vehicleId: string;
            tripId?: string;
            routeId?: string;
            longitude: number;
            latitude: number;
            lineName?: string;
            lineColor?: string;
            currentStatus?: string;
            speed?: number;
          };

          const data = await res.json();
          const vehicles: VehicleData[] = (data.vehicles as VehicleData[]) || [];

          const geojson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: vehicles.map((v) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [v.longitude, v.latitude],
              },
              properties: {
                id: v.vehicleId,
                tripId: v.tripId || "",
                routeId: v.routeId || "",
                lineName: v.lineName || "Metro Train",
                lineColor: v.lineColor || "#38bdf8",
                status: v.currentStatus || "IN_TRANSIT",
                speed: v.speed || 0,
              },
            })),
          };

          if (map.getSource("realtime-vehicles-source")) {
            (map.getSource("realtime-vehicles-source") as maplibregl.GeoJSONSource).setData(geojson);
          } else {
            map.addSource("realtime-vehicles-source", { type: "geojson", data: geojson });

            // Outer Glowing Aura
            map.addLayer({
              id: "realtime-vehicles-aura",
              type: "circle",
              source: "realtime-vehicles-source",
              paint: {
                "circle-color": ["coalesce", ["get", "lineColor"], "#f43f5e"],
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10, 8,
                  14, 13,
                  18, 20,
                ],
                "circle-opacity": 0.35,
                "circle-blur": 0.5,
              },
            });

            // Core Train Dot
            map.addLayer({
              id: "realtime-vehicles-core",
              type: "circle",
              source: "realtime-vehicles-source",
              paint: {
                "circle-color": "#ffffff",
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10, 4,
                  14, 6,
                  18, 9,
                ],
                "circle-stroke-color": ["coalesce", ["get", "lineColor"], "#f43f5e"],
                "circle-stroke-width": 3,
              },
            });

            // Interactive Train Info Popup
            map.on("click", "realtime-vehicles-core", (e) => {
              const features = map.queryRenderedFeatures(e.point, { layers: ["realtime-vehicles-core"] });
              if (features.length > 0) {
                const props = features[0].properties;
                const pointGeom = features[0].geometry as GeoJSON.Point;
                const coords = pointGeom.coordinates as [number, number];
                new maplibregl.Popup({ closeButton: true })
                  .setLngLat(coords)
                  .setHTML(`
                    <div style="padding: 10px; color: #fff; font-family: system-ui, sans-serif; background: #09090b; border-radius: 8px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; margin-bottom: 4px;">🚆 LIVE METRO TRAIN</div>
                      <div style="font-size: 14px; font-weight: 800; color: #f4f4f5;">ID: ${props?.id || "Train"}</div>
                      <div style="font-size: 11px; color: #a1a1aa; margin-top: 4px;">Line: <span style="color: ${props?.lineColor || "#38bdf8"}; font-weight: 700;">${props?.lineName || props?.routeId || "Metro Line"}</span></div>
                      <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Status: <span style="color: #22c55e; font-weight: 700;">${props?.status}</span></div>
                    </div>
                  `)
                  .addTo(map);
              }
            });

            map.on("mouseenter", "realtime-vehicles-core", () => {
              map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", "realtime-vehicles-core", () => {
              map.getCanvas().style.cursor = "";
            });
          }
          layersLoaded++;
        } catch (err) {
          console.error("Failed to load GTFS-RT live vehicles layer:", err);
        }
      } else {
        if (map.getLayer("realtime-vehicles-core")) map.removeLayer("realtime-vehicles-core");
        if (map.getLayer("realtime-vehicles-aura")) map.removeLayer("realtime-vehicles-aura");
        if (map.getSource("realtime-vehicles-source")) map.removeSource("realtime-vehicles-source");
      }

      setLoadedLayersCount?.(layersLoaded);
    };

    syncLayers();

    // Auto-refresh live vehicle telemetry every 10 seconds when realtime layer is active
    let intervalId: NodeJS.Timeout | null = null;
    if (activeLayers.includes("realtime")) {
      intervalId = setInterval(() => {
        syncLayers();
      }, 10000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeLayers, activeCity, selectedStationId, mapLoaded, apiLatencySetter, onStationSelect, setLoadedLayersCount, mapRef]);

  // ── Journey Highlight Layer ──────────────────────────────────────────────
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const JOURNEY_LINE_SOURCE = "journey-highlight-source";
    const JOURNEY_LINE_LAYER = "journey-highlight-layer";
    const JOURNEY_LINE_CASING = "journey-highlight-casing";
    const JOURNEY_LINE_GLOW = "journey-highlight-glow";
    const JOURNEY_POINTS_SOURCE = "journey-points-source";
    const JOURNEY_ORIGIN_LAYER = "journey-origin-layer";
    const JOURNEY_DEST_LAYER = "journey-dest-layer";
    const JOURNEY_TRANSFER_LAYER = "journey-transfer-layer";

    const cleanupJourneyLayers = () => {
      [
        JOURNEY_LINE_CASING,
        JOURNEY_LINE_LAYER,
        JOURNEY_ORIGIN_LAYER,
        JOURNEY_DEST_LAYER,
        JOURNEY_TRANSFER_LAYER,
        "journey-route-stations-layer",
      ].forEach((l) => { if (map.getLayer(l)) map.removeLayer(l); });
      [JOURNEY_LINE_SOURCE, JOURNEY_POINTS_SOURCE].forEach((s) => {
        if (map.getSource(s)) map.removeSource(s);
      });
      if (map.getLayer("lines-layer")) map.setPaintProperty("lines-layer", "line-opacity", 0.85);
    };

    if (!journeyGeojson) {
      cleanupJourneyLayers();
      return;
    }

    if (map.getLayer("lines-layer")) map.setPaintProperty("lines-layer", "line-opacity", 0.25);

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

    // Render line source + casing + main layer
    if (map.getSource(JOURNEY_LINE_SOURCE)) {
      (map.getSource(JOURNEY_LINE_SOURCE) as maplibregl.GeoJSONSource).setData(lineCollection);
    } else {
      map.addSource(JOURNEY_LINE_SOURCE, { type: "geojson", data: lineCollection });

      // Casing / Halo (thick black line underneath to separate overlapping routes)
      map.addLayer({
        id: JOURNEY_LINE_CASING,
        type: "line",
        source: JOURNEY_LINE_SOURCE,
        paint: {
          "line-color": "#080C14",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 7, 14, 10, 18, 15],
          "line-opacity": 0.95,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });

      // Main route line
      map.addLayer({
        id: JOURNEY_LINE_LAYER,
        type: "line",
        source: JOURNEY_LINE_SOURCE,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#00e5ff"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 8, 18, 12],
          "line-opacity": 1.0,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });
    }

    // Render point markers
    if (map.getSource(JOURNEY_POINTS_SOURCE)) {
      (map.getSource(JOURNEY_POINTS_SOURCE) as maplibregl.GeoJSONSource).setData(pointCollection);
    } else {
      map.addSource(JOURNEY_POINTS_SOURCE, { type: "geojson", data: pointCollection });

      // Route Stations (intermediate points)
      map.addLayer({
        id: "journey-route-stations-layer",
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: [
          "any",
          ["==", ["get", "featureType"], "journey-station"],
          ["!", ["has", "featureType"]] // or default points
        ],
        paint: {
          "circle-color": "#ffffff",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 6, 18, 9],
          "circle-stroke-color": ["coalesce", ["get", "color"], "#00e5ff"],
          "circle-stroke-width": 3,
        },
      });

      // Transfer markers
      map.addLayer({
        id: JOURNEY_TRANSFER_LAYER,
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: ["==", ["get", "featureType"], "journey-transfer"],
        paint: {
          "circle-color": "#fec931",
          "circle-radius": 9,
          "circle-stroke-color": "#080C14",
          "circle-stroke-width": 3,
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
          "circle-radius": 10,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
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
          "circle-radius": 10,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
    }
  }, [journeyGeojson, mapLoaded, mapRef]);

  return (
    <div className="flex-1 h-full relative bg-zinc-950">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Top-Right Navigation Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-1.5 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={handleZoomIn}
          className="h-8 w-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition border border-zinc-800/60 font-bold text-sm"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="h-8 w-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition border border-zinc-800/60 font-bold text-sm"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={handleResetNorth}
          className="h-8 w-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition border border-zinc-800/60"
          title="Reset Bearing"
        >
          <Compass size={14} />
        </button>
      </div>

      {/* Bottom-Center Map Style Switcher */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center p-1 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl space-x-1 text-xs">
        <button
          onClick={() => setMapStyle("3D")}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            mapStyle === "3D" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          3D
        </button>
        <button
          onClick={() => setMapStyle("Satellite")}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            mapStyle === "Satellite" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setMapStyle("Dark")}
          className={`px-3 py-1.5 rounded-xl font-bold transition ${
            mapStyle === "Dark" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Dark
        </button>
      </div>
      
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
