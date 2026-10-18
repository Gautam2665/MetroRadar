"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass } from "lucide-react";
import { RouteOption } from "../../containers/JourneyPlannerContainer";
import { RealtimeVehicle } from "../../models/vehicle";
import { renderSmartStationCardHtml, StationCardData } from "./SmartStationCard";
import { JourneyTrainSimulator } from "./JourneyTrainSimulator";
import {
  normalizeStationLines,
  deriveJourneyStationContext,
  SmartStationCardMode,
} from "../../utils/transitPresenter";

const CITY_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  mumbai: { center: [72.8500, 19.1450], zoom: 11.2 },
  pune: { center: [73.8567, 18.5204], zoom: 12 },
  nagpur: { center: [79.0882, 21.1458], zoom: 12 },
  navi_mumbai: { center: [73.0650, 19.0400], zoom: 12 },
  delhi: { center: [77.2090, 28.6139], zoom: 11 },
  bengaluru: { center: [77.5946, 12.9716], zoom: 12 },
  hyderabad: { center: [78.4867, 17.3850], zoom: 12 },
  chennai: { center: [80.2707, 13.0827], zoom: 12 },
  ahmedabad: { center: [72.5714, 23.0225], zoom: 12 },
  kochi: { center: [76.2999, 9.9816], zoom: 12 },
};

const SYSTEM_CODES: Record<string, string> = {
  mumbai: "MM",
  pune: "PMRDA",
  nagpur: "NAGPUR",
  navi_mumbai: "CIDCO",
  delhi: "DMRC",
  bengaluru: "BMRCL",
  hyderabad: "HMRL",
  chennai: "CMRL",
  ahmedabad: "GMRC",
  kochi: "KMRL",
};

type MapContainerProps = {
  center?: [number, number];
  zoom?: number;
  activeLayers?: string[];
  activeCity?: string;
  selectedStationId?: string | null;
  onStationSelect?: (stationId: string) => void;
  onSelectStation?: (station: { id: string; name: string; code?: string; city?: string }) => void;
  onSetOrigin?: (station: { id: string; name: string }) => void;
  onSetDestination?: (station: { id: string; name: string }) => void;
  onViewportChange?: (center: [number, number], zoom: number) => void;
  apiLatencySetter?: (ms: number) => void;
  setLoadedLayersCount?: (count: number) => void;
  mapRef?: React.MutableRefObject<maplibregl.Map | null>;
  highlightGeojson?: GeoJSON.FeatureCollection | null;
  journeyGeojson?: GeoJSON.FeatureCollection | null;
  selectedCandidate?: RouteOption | null;
  selectedCandidateId?: string | null;
  candidates?: RouteOption[];
  activeLevel?: "G" | "L1" | "L2" | string;
  vehicles?: RealtimeVehicle[];
  rightPanelOpen?: boolean;
};

export default function MapContainer({
  center,
  zoom,
  activeLayers = ["lines", "stations", "vehicles"],
  activeCity = "mumbai",
  selectedStationId = null,
  activeLevel,
  onStationSelect,
  onSelectStation,
  onSetOrigin,
  onSetDestination,
  onViewportChange,
  apiLatencySetter,
  setLoadedLayersCount,
  mapRef,
  journeyGeojson,
  selectedCandidate = null,
  vehicles = [],
  rightPanelOpen = false,
}: MapContainerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalMapRef = useRef<maplibregl.Map | null>(null);
  const effectiveMapRef = mapRef || internalMapRef;
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);

  // Explicit interaction states
  const pinnedStationIdRef = useRef<string | null>(selectedStationId);
  const popupCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    pinnedStationIdRef.current = selectedStationId || null;
  }, [selectedStationId]);

  // Train Simulator ref (single isolated service)
  const trainSimRef = useRef<JourneyTrainSimulator | null>(null);
  const stationPopupRef = useRef<maplibregl.Popup | null>(null);
  const currentOpenStationIdRef = useRef<string | null>(null);
  const digitalTwinCache = useRef<Map<string, { exits: number }>>(new Map());

  const selectedCandidateRef = useRef<RouteOption | null>(selectedCandidate);
  const onSetOriginRef = useRef(onSetOrigin);
  const onSetDestRef = useRef(onSetDestination);
  const onStationSelectRef = useRef(onStationSelect);
  const onSelectStationRef = useRef(onSelectStation);

  useEffect(() => {
    selectedCandidateRef.current = selectedCandidate;
  }, [selectedCandidate]);

  useEffect(() => {
    onSetOriginRef.current = onSetOrigin;
  }, [onSetOrigin]);

  useEffect(() => {
    onSetDestRef.current = onSetDestination;
  }, [onSetDestination]);

  useEffect(() => {
    onStationSelectRef.current = onStationSelect;
  }, [onStationSelect]);

  useEffect(() => {
    onSelectStationRef.current = onSelectStation;
  }, [onSelectStation]);

  const handleZoomIn = () => effectiveMapRef.current?.zoomIn();
  const handleZoomOut = () => effectiveMapRef.current?.zoomOut();
  const handleResetNorth = () => {
    effectiveMapRef.current?.resetNorthPitch({ duration: 600 });
    setIs3D(false);
  };
  const handleToggle3D = () => {
    const map = effectiveMapRef.current;
    if (!map) return;
    const next = !is3D;
    setIs3D(next);
    map.easeTo({
      pitch: next ? 50 : 0,
      bearing: next ? -15 : 0,
      duration: 800,
    });
  };
  const handleRecenter = () => {
    const map = effectiveMapRef.current;
    if (!map) return;
    const def = CITY_CENTERS[activeCity?.toLowerCase() || "mumbai"] || CITY_CENTERS.mumbai;
    map.easeTo({
      center: def.center,
      zoom: def.zoom,
      pitch: is3D ? 50 : 0,
      bearing: 0,
      duration: 800,
    });
  };

  const defaultCityKey = activeCity?.toLowerCase() || "mumbai";
  const defaultCityConfig = CITY_CENTERS[defaultCityKey] || CITY_CENTERS.mumbai;
  const initialCenterRef = useRef(center || defaultCityConfig.center);
  const initialZoomRef = useRef(zoom !== undefined ? zoom : defaultCityConfig.zoom);
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  // Helper to open Smart Station Card with passenger-facing presentation
  const openSmartStationCard = (
    props: {
      id?: string;
      name?: string;
      stationName?: string;
      code?: string;
      lines?: unknown;
      wheelchairAccessible?: boolean;
      featureType?: string;
      levelsCount?: number;
      exitsCount?: number;
      platformsCount?: number;
      lineInfrastructure?: StationCardData["lineInfrastructure"];
    },
    coords: [number, number],
    noEase = false
  ) => {
    const map = effectiveMapRef.current;
    if (!map) return;

    const stId = props.id || `stn-${props.name || props.stationName || "unknown"}`;
    const stName = props.name || props.stationName || "Station";

    // 1. Clean & normalize lines (deduplicates multiple directions into clean line objects)
    const cleanLines = normalizeStationLines(props.lines);

    // 2. Derive journey context from the currently selected candidate
    const cand = selectedCandidateRef.current;
    const journeyContext = deriveJourneyStationContext(stName, cand);

    // If lines weren't in station properties, synthesize from journey context
    if (cleanLines.length === 0 && journeyContext) {
      if (journeyContext.incomingLine && journeyContext.incomingColor) {
        cleanLines.push({
          code: journeyContext.incomingLine.slice(0, 3).toUpperCase(),
          name: journeyContext.incomingLine,
          shortName: journeyContext.incomingLine,
          color: journeyContext.incomingColor,
        });
      }
      if (journeyContext.outgoingLine && journeyContext.outgoingColor) {
        cleanLines.push({
          code: journeyContext.outgoingLine.slice(0, 3).toUpperCase(),
          name: journeyContext.outgoingLine,
          shortName: journeyContext.outgoingLine,
          color: journeyContext.outgoingColor,
        });
      }
    }

    // 3. Determine if station is an interchange
    const isTransferPoint = props.featureType === "journey-transfer" || journeyContext?.role === "transfer";
    const isInterchange = cleanLines.length > 1 || isTransferPoint || props.featureType === "interchange";

    // 4. Determine Smart Station Card mode
    let mode: SmartStationCardMode = "NORMAL";
    if (journeyContext?.role === "transfer") {
      mode = "JOURNEY_TRANSFER";
    } else if (journeyContext?.role === "direct_pass_through") {
      mode = "JOURNEY_DIRECT_PASS_THROUGH";
    } else if (isInterchange) {
      mode = "INTERCHANGE";
    }

    const cachedTwin = digitalTwinCache.current.get(stId);

    const cardData: StationCardData = {
      id: stId,
      name: stName,
      code: props.code,
      city: activeCity,
      lines: cleanLines,
      wheelchairAccessible: props.wheelchairAccessible,
      isInterchange,
      mode,
      // P0/P1 counts come from the line-owned station feature. Never replace them
      // with cached interchange-wide physical totals from a digital twin.
      levelsCount: typeof props.levelsCount === "number" && props.levelsCount > 0 ? props.levelsCount : undefined,
      exitsCount: typeof props.exitsCount === "number" && props.exitsCount > 0 ? props.exitsCount : cachedTwin?.exits,
      platformsCount: typeof props.platformsCount === "number" && props.platformsCount > 0 ? props.platformsCount : undefined,
      lineInfrastructure: Array.isArray(props.lineInfrastructure) ? props.lineInfrastructure : undefined,
      journeyContext,
    };

    if (popupCloseTimeoutRef.current) {
      clearTimeout(popupCloseTimeoutRef.current);
      popupCloseTimeoutRef.current = null;
    }

    if (!stationPopupRef.current) {
      stationPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "stitch-station-popup",
        offset: {
          top: [0, 20],
          "top-left": [0, 20],
          "top-right": [0, 20],
          bottom: [0, -20],
          "bottom-left": [0, -20],
          "bottom-right": [0, -20],
          left: [20, 0],
          right: [-20, 0],
        } as maplibregl.Offset,
        maxWidth: "340px",
      });
    }

    const popup = stationPopupRef.current;

    // Guard against repeated DOM re-renders on mousemove over the same station
    if (currentOpenStationIdRef.current === stId && popup.isOpen()) {
      return;
    }
    currentOpenStationIdRef.current = stId;

    popup
      .setLngLat(coords)
      .setHTML(renderSmartStationCardHtml(cardData))
      .addTo(map);

    // Attach event listeners to popup DOM to prevent closing when hovering over the card
    const popupEl = popup.getElement();
    if (popupEl) {
      popupEl.onmouseenter = () => {
        if (popupCloseTimeoutRef.current) {
          clearTimeout(popupCloseTimeoutRef.current);
          popupCloseTimeoutRef.current = null;
        }
      };
      popupEl.onmouseleave = () => {
        if (!pinnedStationIdRef.current) {
          popupCloseTimeoutRef.current = setTimeout(() => {
            popup.remove();
            currentOpenStationIdRef.current = null;
          }, 300);
        }
      };
    }

    // Pan map only on explicit click (avoid jarring pan on hover)
    if (!noEase) {
      map.easeTo({
        center: coords,
        offset: [-160, 0],
        duration: 400,
      });
    }

    // Event delegation for action buttons inside popup
    setTimeout(() => {
      const container = popup.getElement();
      if (!container) return;

      const originBtn = container.querySelector('[data-action="set-origin"]');
      const destBtn = container.querySelector('[data-action="set-dest"]');
      const twinBtn = container.querySelector('[data-action="view-network"]');

      if (originBtn) {
        originBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSetOriginRef.current?.({ id: stId, name: stName });
          popup.remove();
        });
      }
      if (destBtn) {
        destBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSetDestRef.current?.({ id: stId, name: stName });
          popup.remove();
        });
      }
      if (twinBtn) {
        twinBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          router.push(`/network?station=${encodeURIComponent(stId)}`);
        });
      }
    }, 50);

    // Pre-cache digital twin metadata in background on explicit click if not already cached
    if (!noEase && !cachedTwin && stId && !stId.startsWith("stn-")) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      fetch(`${backendUrl}/stations/${encodeURIComponent(stId)}/digital-twin`)
        .then((r) => (r.ok ? r.json() : null))
        .then((twin) => {
          if (twin) {
            const eCount = (twin.physical?.entrances?.length ?? twin.exits?.length) || undefined;

            digitalTwinCache.current.set(stId, {
              exits: eCount,
            });

            if (stationPopupRef.current?.isOpen() && currentOpenStationIdRef.current === stId) {
              const updatedData: StationCardData = {
                ...cardData,
                exitsCount: cardData.exitsCount ?? eCount,
              };
              stationPopupRef.current.setHTML(renderSmartStationCardHtml(updatedData));
            }
          }
        })
        .catch(() => {});
    }
  };

  const openSmartStationCardRef = useRef(openSmartStationCard);
  useEffect(() => {
    openSmartStationCardRef.current = openSmartStationCard;
  });

  // Initialize MapLibre
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
      attributionControl: false,
    });

    if (mapRef) {
      mapRef.current = map;
    } else {
      internalMapRef.current = map;
    }
    if (typeof window !== "undefined") {
      (window as unknown as { _map?: maplibregl.Map })._map = map;
    }

    const initSimulator = () => {
      setMapLoaded(true);
      trainSimRef.current = new JourneyTrainSimulator(
        map,
        (props, coords) => {
          pinnedStationIdRef.current = (props.id as string) || "transfer";
          
          openSmartStationCardRef.current(props, coords, false);
        },
        (props, coords) => {
          if (popupCloseTimeoutRef.current) {
            clearTimeout(popupCloseTimeoutRef.current);
            popupCloseTimeoutRef.current = null;
          }
          openSmartStationCardRef.current(props, coords, true);
        },
        () => {
          popupCloseTimeoutRef.current = setTimeout(() => {
            if (!pinnedStationIdRef.current) {
              const popup = stationPopupRef.current;
              if (popup && !popup.getElement()?.matches(":hover")) {
                popup.remove();
                currentOpenStationIdRef.current = null;
              }
            }
          }, 300);
        }
      );
    };

    if (map.isStyleLoaded()) {
      initSimulator();
    } else {
      map.on("load", initSimulator);
    }

    map.on("moveend", () => {
      const c = map.getCenter();
      onViewportChangeRef.current?.([c.lng, c.lat], map.getZoom());
    });

    return () => {
      trainSimRef.current?.destroy();
      trainSimRef.current = null;
      stationPopupRef.current?.remove();
      stationPopupRef.current = null;
      currentOpenStationIdRef.current = null;
      map.remove();
      effectiveMapRef.current = null;
    };
  }, [mapRef, effectiveMapRef]);

  // Synchronize Journey Simulation Train with selectedCandidateId
  // Only updates when selection state changes — NEVER stops/restarts on unrelated re-renders
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    // Cleanly close any open station card when candidate selection changes
    stationPopupRef.current?.remove();
    currentOpenStationIdRef.current = null;
    pinnedStationIdRef.current = null;
    

    if (!trainSimRef.current) {
      trainSimRef.current = new JourneyTrainSimulator(
        map,
        (props, coords) => {
          pinnedStationIdRef.current = (props.id as string) || "transfer";
          
          openSmartStationCardRef.current(props, coords, false);
        },
        (props, coords) => {
          if (popupCloseTimeoutRef.current) {
            clearTimeout(popupCloseTimeoutRef.current);
            popupCloseTimeoutRef.current = null;
          }
          openSmartStationCardRef.current(props, coords, true);
        },
        () => {
          popupCloseTimeoutRef.current = setTimeout(() => {
            if (!pinnedStationIdRef.current) {
              const popup = stationPopupRef.current;
              if (popup && !popup.getElement()?.matches(":hover")) {
                popup.remove();
                currentOpenStationIdRef.current = null;
              }
            }
          }, 300);
        }
      );
    }

    // Authoritative single-train state:
    // If candidate selected -> start simulation train
    // If no candidate selected -> stop simulation train (NO random moving dots)
    if (selectedCandidate) {
      trainSimRef.current.start(selectedCandidate);
    } else {
      trainSimRef.current.stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidate?.id, mapLoaded]);

  // Fly to target city center when activeCity changes
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const cityKey = activeCity?.toLowerCase() || "mumbai";
    const cityConfig = CITY_CENTERS[cityKey] || CITY_CENTERS.mumbai;
    map.flyTo({
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  }, [activeCity, mapLoaded, effectiveMapRef]);


  // ── Network Base Layers (Lines & Stations) ────────────────────────────────
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    let layersLoaded = 0;

    const syncLayers = async () => {
      const getActiveMap = () => {
        const m = effectiveMapRef.current;
        if (!m || !m.getStyle()) return null;
        return m;
      };

      // 1. Lines Layer
      if (activeLayers.includes("lines")) {
        try {
          const t0 = performance.now();
          const res = await fetch(`${backendUrl}/map/lines?t=${Date.now()}`);
          const currentMap = getActiveMap();
          if (res.ok && currentMap) {
            const geojson = await res.json();
            const mapNow = getActiveMap();
            if (!mapNow) return;
            apiLatencySetter?.(Math.round(performance.now() - t0));

            if (mapNow.getSource("lines-source")) {
              (mapNow.getSource("lines-source") as maplibregl.GeoJSONSource).setData(geojson);
            } else {
              mapNow.addSource("lines-source", { type: "geojson", data: geojson });
              mapNow.addLayer({
                id: "lines-layer",
                type: "line",
                source: "lines-source",
                paint: {
                  "line-color": ["coalesce", ["get", "color"], "#059DB2"],
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 2.5,
                    14, 5,
                    18, 9,
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
          }
        } catch (err) {
          console.warn("Failed to load lines GIS layer:", err);
        }
      } else {
        const mapNow = getActiveMap();
        if (mapNow) {
          if (mapNow.getLayer("lines-layer")) mapNow.removeLayer("lines-layer");
          if (mapNow.getSource("lines-source")) mapNow.removeSource("lines-source");
        }
      }

      // 2. Stations / Interchanges / Accessible Lifts Layer
      if (
        activeLayers.includes("stations") ||
        activeLayers.includes("interchanges") ||
        activeLayers.includes("accessible")
      ) {
        try {
          const sysCode = SYSTEM_CODES[activeCity.toLowerCase()] || "DMRC";
          const res = await fetch(`${backendUrl}/map/stations?system=${sysCode}&t=${Date.now()}`);
          const currentMap = getActiveMap();
          if (res.ok && currentMap) {
            const rawGeojson = await res.json();
            const mapNow = getActiveMap();
            if (!mapNow) return;

            const isInterchangeOnly = activeLayers.includes("interchanges") && !activeLayers.includes("stations");
            const isAccessibleOnly = activeLayers.includes("accessible") && !activeLayers.includes("stations");
            const isSpecialFilter = isInterchangeOnly || isAccessibleOnly;

            const geojson =
              isInterchangeOnly && Array.isArray(rawGeojson?.features)
                ? {
                    ...rawGeojson,
                    features: rawGeojson.features.filter((f: any) => {
                      const p = f.properties || {};
                      const linesArr = typeof p.lines === "string" ? JSON.parse(p.lines || "[]") : p.lines;
                      const infraArr =
                        typeof p.lineInfrastructure === "string"
                          ? JSON.parse(p.lineInfrastructure || "[]")
                          : p.lineInfrastructure;
                      return (
                        (Array.isArray(linesArr) && linesArr.length > 1) ||
                        (Array.isArray(infraArr) && infraArr.length > 1)
                      );
                    }),
                  }
                : isAccessibleOnly && Array.isArray(rawGeojson?.features)
                ? {
                    ...rawGeojson,
                    features: rawGeojson.features.filter((f: any) => {
                      const p = f.properties || {};
                      return p.wheelchairAccessible !== false;
                    }),
                  }
                : rawGeojson;

            const circleColor = isInterchangeOnly ? "#00E5FF" : isAccessibleOnly ? "#34d399" : "#ffffff";

            if (mapNow.getSource("stations-source")) {
              (mapNow.getSource("stations-source") as maplibregl.GeoJSONSource).setData(geojson);
            } else {
              mapNow.addSource("stations-source", { type: "geojson", data: geojson });

              mapNow.addLayer({
                id: "stations-layer",
                type: "circle",
                source: "stations-source",
                paint: {
                  "circle-color": circleColor,
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    isSpecialFilter ? 6 : 3.5,
                    14,
                    isSpecialFilter ? 9 : 5.5,
                    18,
                    isSpecialFilter ? 13 : 8.5,
                  ],
                  "circle-stroke-color": [
                    "case",
                    ["has", "lineColor"],
                    ["get", "lineColor"],
                    ["has", "color"],
                    ["get", "color"],
                    "#059DB2",
                  ],
                  "circle-stroke-width": isSpecialFilter ? 3 : 2,
                  "circle-opacity": 0.95,
                  "circle-stroke-opacity": 1.0,
                },
              });
            }
            if (mapNow.getLayer("stations-layer")) {
              mapNow.setPaintProperty("stations-layer", "circle-color", circleColor);
              mapNow.setPaintProperty("stations-layer", "circle-stroke-width", isSpecialFilter ? 3 : 2);
            }

            // Interactive hover & click bindings
            mapNow.on("mousemove", "stations-layer", (e) => {
              const activeM = getActiveMap();
              if (!activeM) return;
              activeM.getCanvas().style.cursor = "pointer";
              const features = activeM.queryRenderedFeatures(e.point, { layers: ["stations-layer"] });
              if (features.length > 0) {
                if (popupCloseTimeoutRef.current) {
                  clearTimeout(popupCloseTimeoutRef.current);
                  popupCloseTimeoutRef.current = null;
                }
                const props = features[0].properties;
                const geom = features[0].geometry as GeoJSON.Point;
                const coords = geom.coordinates as [number, number];
                
                openSmartStationCardRef.current(props, coords, true);
              }
            });

            mapNow.on("mouseleave", "stations-layer", () => {
              const activeM = getActiveMap();
              if (activeM) activeM.getCanvas().style.cursor = "";
              
              popupCloseTimeoutRef.current = setTimeout(() => {
                if (!pinnedStationIdRef.current) {
                  const popup = stationPopupRef.current;
                  if (popup && !popup.getElement()?.matches(":hover")) {
                    popup.remove();
                    currentOpenStationIdRef.current = null;
                  }
                }
              }, 250);
            });

            mapNow.on("click", "stations-layer", (e) => {
              const activeM = getActiveMap();
              if (!activeM) return;
              const features = activeM.queryRenderedFeatures(e.point, { layers: ["stations-layer"] });
              if (features.length > 0) {
                const props = features[0].properties;
                const geom = features[0].geometry as GeoJSON.Point;
                const coords = geom.coordinates as [number, number];

                pinnedStationIdRef.current = props.id || null;
                

                if (props.id) {
                  onStationSelectRef.current?.(props.id);
                  onSelectStationRef.current?.({
                    id: props.id,
                    name: props.name || "Station",
                    code: props.code || "STN",
                    city: props.city || activeCity,
                  });
                }

                openSmartStationCardRef.current(props, coords, false);
              }
            });

            // Map canvas click clears pinned station and closes popup
            mapNow.on("click", (e) => {
              const activeM = getActiveMap();
              if (!activeM) return;
              const features = activeM.queryRenderedFeatures(e.point, {
                layers: [
                  "stations-layer",
                  "vehicles-layer",
                  "journey-route-stations-layer",
                  "journey-transfer-layer",
                  "journey-origin-layer",
                  "journey-dest-layer",
                ].filter((l) => activeM.getLayer(l)),
              });
              if (features.length === 0) {
                pinnedStationIdRef.current = null;
                stationPopupRef.current?.remove();
                currentOpenStationIdRef.current = null;
              }
            });

            layersLoaded++;
          }
        } catch (err) {
          console.warn("Failed to load stations GIS layer:", err);
        }
      } else {
        const mapNow = getActiveMap();
        if (mapNow) {
          if (mapNow.getLayer("stations-layer")) mapNow.removeLayer("stations-layer");
          if (mapNow.getSource("stations-source")) mapNow.removeSource("stations-source");
        }
      }

      setLoadedLayersCount?.(layersLoaded);
    };

    syncLayers();
  }, [activeLayers, activeCity, mapLoaded, apiLatencySetter, setLoadedLayersCount, effectiveMapRef]);

  // ── 3. Live GTFS-RT Vehicle Positions Layer (GeoJSON Source + Glow & Marker Layers) ──
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded || !map.getStyle()) return;

    const showVehicles = activeLayers.includes("vehicles") || activeLayers.includes("realtime");
    const validVehicles = showVehicles
      ? (vehicles || []).filter(
          (v) => typeof v.lat === "number" && typeof v.lng === "number" && v.lat !== 0 && v.lng !== 0
        )
      : [];

    if (!showVehicles || validVehicles.length === 0) {
      if (map.getSource("vehicles-source")) {
        (map.getSource("vehicles-source") as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
      }
      return;
    }

    const vehicleGeojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: validVehicles.map((v) => ({
        type: "Feature",
        properties: {
          id: v.id,
          lineId: v.lineId,
          lineName: v.lineName || "Metro Line",
          lineColor: v.lineColor || "#00E5FF",
          previousStationName: v.previousStationName || "",
          nextStationName: v.nextStationName || "",
          destination: v.destination || "",
          speedKmH: v.speedKmH ?? "",
          bearing: v.bearing ?? "",
          timestamp: v.timestamp ?? "",
          delayMins: v.delayMins ?? 0,
          isEstimated: v.isEstimated ? "true" : "false",
          positionSource: v.positionSource || "ESTIMATED",
          status: v.currentStatus || v.status || "IN_TRANSIT_TO",
        },
        geometry: {
          type: "Point",
          coordinates: [v.lng, v.lat],
        },
      })),
    };

    // Update existing GeoJSON source in-place without recreating layers
    if (map.getSource("vehicles-source")) {
      (map.getSource("vehicles-source") as maplibregl.GeoJSONSource).setData(vehicleGeojson);
      return;
    }

    map.addSource("vehicles-source", {
      type: "geojson",
      data: vehicleGeojson,
    });

    // Layer 1: Subtle outer glow halo for live trains
    map.addLayer({
      id: "vehicles-glow-layer",
      type: "circle",
      source: "vehicles-source",
      paint: {
        "circle-color": ["coalesce", ["get", "lineColor"], "#00E5FF"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 11, 14, 15, 18, 20],
        "circle-blur": 0.65,
        "circle-opacity": 0.45,
      },
    });

    // Layer 2: Crisp inner vehicle marker
    map.addLayer({
      id: "vehicles-layer",
      type: "circle",
      source: "vehicles-source",
      paint: {
        "circle-color": ["coalesce", ["get", "lineColor"], "#00E5FF"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5.5, 14, 7.5, 18, 10],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.5,
        "circle-opacity": 1,
      },
    });

    const openVehicleInspector = (props: Record<string, any>, coords: [number, number]) => {
      if (!stationPopupRef.current) {
        stationPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "stitch-station-popup",
          maxWidth: "310px",
        });
      }
      const lineColor = props.lineColor || "#00E5FF";
      const lineName = props.lineName || "Metro Corridor";
      const isEst = String(props.isEstimated) === "true" || props.positionSource === "ESTIMATED";
      const sourceBadgeText = isEst ? "ESTIMATED POSITION" : "LIVE GPS";
      const sourceBadgeColor = isEst ? "#fbbf24" : "#34d399";
      const destText = props.destination ? `Towards ${props.destination}` : "Active Revenue Service";
      const segText =
        props.previousStationName && props.nextStationName
          ? `${props.previousStationName} ➔ ${props.nextStationName}`
          : props.nextStationName
          ? `Next Stop: ${props.nextStationName}`
          : "";
      const speedVal = props.speedKmH !== "" && props.speedKmH !== undefined ? `${props.speedKmH} km/h` : null;
      const bearingVal =
        props.bearing !== "" && props.bearing !== undefined ? `Bearing ${props.bearing}° (Track)` : null;
      const telemetryLine = [speedVal, bearingVal].filter(Boolean).join(" • ") || "On-Track Alignment";
      const updatedStr =
        props.timestamp && !isNaN(Number(props.timestamp))
          ? new Date(Number(props.timestamp) * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "Just now";

      const html = `
        <div style="background:#0B1320;border:1px solid ${lineColor}66;border-radius:14px;padding:12px 14px;color:#f1f5f9;font-family:Inter,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.75);min-width:245px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <span style="background:${lineColor}22;color:${lineColor};border:1px solid ${lineColor}55;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.04em;">
              ${lineName}
            </span>
            <span style="font-size:9.5px;color:${sourceBadgeColor};background:${sourceBadgeColor}18;border:1px solid ${sourceBadgeColor}44;padding:1.5px 6px;border-radius:999px;font-weight:700;">
              ● ${sourceBadgeText}
            </span>
          </div>
          <div style="font-size:13px;font-weight:800;color:#ffffff;margin-bottom:2px;">
            ${destText}
          </div>
          ${
            segText
              ? `<div style="font-size:11px;color:#38bdf8;font-weight:600;margin-bottom:4px;">${segText}</div>`
              : ""
          }
          <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">
            ${isEst ? "Derived from GTFS-RT TripUpdates + Timetable" : `Train ${props.id || ""}`}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;font-size:10px;color:#cbd5e1;">
            <span>${telemetryLine}</span>
            <span style="color:#64748b;">${updatedStr}</span>
          </div>
        </div>
      `;

      currentOpenStationIdRef.current = `veh-${props.id}`;
      stationPopupRef.current.setLngLat(coords).setHTML(html).addTo(map);
    };

    map.on("mouseenter", "vehicles-layer", (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (e.features && e.features.length > 0) {
        const feat = e.features[0];
        const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
        openVehicleInspector(feat.properties || {}, coords);
      }
    });

    map.on("mouseleave", "vehicles-layer", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "vehicles-layer", (e) => {
      if (e.features && e.features.length > 0) {
        const feat = e.features[0];
        const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
        pinnedStationIdRef.current = `veh-${feat.properties?.id || "train"}`;
        openVehicleInspector(feat.properties || {}, coords);
      }
    });
  }, [vehicles, activeLayers, mapLoaded, effectiveMapRef]);

  // ── Indoor Floor-Level Vector Layer (G, L1, L2 Switcher & Zoom > 15.5) ────────
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded || !selectedStationId) {
      if (map) {
        if (map.getLayer("station-indoor-platforms")) map.removeLayer("station-indoor-platforms");
        if (map.getLayer("station-indoor-entrances")) map.removeLayer("station-indoor-entrances");
        if (map.getSource("station-indoor-source")) map.removeSource("station-indoor-source");
      }
      return;
    }

    const loadIndoorLayer = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const lvlParam = activeLevel ? `?level=${encodeURIComponent(activeLevel)}` : "";
        const res = await fetch(`${backendUrl}/map/stations/${selectedStationId}/indoor${lvlParam}`);
        if (!res.ok) return;
        const indoorGeojson = await res.json();
        if (!indoorGeojson.features || indoorGeojson.features.length === 0) return;

        if (map.getSource("station-indoor-source")) {
          (map.getSource("station-indoor-source") as maplibregl.GeoJSONSource).setData(indoorGeojson);
        } else {
          map.addSource("station-indoor-source", { type: "geojson", data: indoorGeojson });

          // Indoor Platforms Layer
          map.addLayer({
            id: "station-indoor-platforms",
            type: "circle",
            source: "station-indoor-source",
            filter: ["==", ["get", "type"], "platform"],
            paint: {
              "circle-color": ["case", ["has", "lineColor"], ["get", "lineColor"], "#00e5ff"],
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14, 6,
                16.5, 12,
                19, 18,
              ],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });

          // Indoor Entrances Layer
          map.addLayer({
            id: "station-indoor-entrances",
            type: "circle",
            source: "station-indoor-source",
            filter: ["==", ["get", "type"], "entrance"],
            paint: {
              "circle-color": "#4ade80",
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14, 5,
                16.5, 9,
                19, 14,
              ],
              "circle-stroke-color": "#09090b",
              "circle-stroke-width": 2,
            },
          });
        }
      } catch (err) {
        console.warn("Indoor map layer fetch error:", err);
      }
    };

    loadIndoorLayer();
  }, [selectedStationId, activeLevel, mapLoaded, effectiveMapRef]);

  // ── Journey Highlight Layers ─────────────────────────────────────────────
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const JOURNEY_LINE_SOURCE = "journey-highlight-source";
    const JOURNEY_LINE_LAYER = "journey-highlight-layer";
    const JOURNEY_LINE_CASING = "journey-highlight-casing";
    const JOURNEY_POINTS_SOURCE = "journey-points-source";
    const JOURNEY_ORIGIN_LAYER = "journey-origin-layer";
    const JOURNEY_DEST_LAYER = "journey-dest-layer";
    const JOURNEY_TRANSFER_LAYER = "journey-transfer-layer";
    const JOURNEY_STATIONS_LAYER = "journey-route-stations-layer";

    const cleanupJourneyLayers = () => {
      [
        JOURNEY_LINE_CASING,
        JOURNEY_LINE_LAYER,
        JOURNEY_ORIGIN_LAYER,
        JOURNEY_DEST_LAYER,
        JOURNEY_TRANSFER_LAYER,
        JOURNEY_STATIONS_LAYER,
      ].forEach((l) => { if (map.getLayer(l)) map.removeLayer(l); });
      [JOURNEY_LINE_SOURCE, JOURNEY_POINTS_SOURCE].forEach((s) => {
        if (map.getSource(s)) map.removeSource(s);
      });
      if (map.getLayer("lines-layer")) map.setPaintProperty("lines-layer", "line-opacity", 0.85);
      currentOpenStationIdRef.current = null;
    };

    if (!journeyGeojson || !journeyGeojson.features || journeyGeojson.features.length === 0) {
      cleanupJourneyLayers();
      return;
    }

    if (map.getLayer("lines-layer")) map.setPaintProperty("lines-layer", "line-opacity", 0.2);

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

    const hasSelection = !!selectedCandidate;

    // Render line source + casing + main layer
    if (map.getSource(JOURNEY_LINE_SOURCE)) {
      (map.getSource(JOURNEY_LINE_SOURCE) as maplibregl.GeoJSONSource).setData(lineCollection);
    } else {
      map.addSource(JOURNEY_LINE_SOURCE, { type: "geojson", data: lineCollection });

      // Casing / Halo
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

    // Dynamic opacity & styling:
    // If a candidate is selected: strong highlight
    // If all K candidates shown (deselected): clean, visible, distinct multi-route styling
    if (map.getLayer(JOURNEY_LINE_LAYER)) {
      map.setPaintProperty(JOURNEY_LINE_LAYER, "line-opacity", hasSelection ? 1.0 : 0.85);
      map.setPaintProperty(
        JOURNEY_LINE_LAYER,
        "line-width",
        hasSelection
          ? ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 8, 18, 12]
          : ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 6.5, 18, 10]
      );
    }

    if (map.getLayer(JOURNEY_TRANSFER_LAYER)) {
      // When a candidate is selected, TransferBeacon HTML marker renders the prominent beacon.
      // Hide the redundant canvas circle to avoid showing 2 overlapping dots!
      map.setPaintProperty(JOURNEY_TRANSFER_LAYER, "circle-opacity", hasSelection ? 0 : 1.0);
      map.setPaintProperty(JOURNEY_TRANSFER_LAYER, "circle-stroke-opacity", hasSelection ? 0 : 1.0);
    }

    // Render point markers
    if (map.getSource(JOURNEY_POINTS_SOURCE)) {
      (map.getSource(JOURNEY_POINTS_SOURCE) as maplibregl.GeoJSONSource).setData(pointCollection);
    } else {
      map.addSource(JOURNEY_POINTS_SOURCE, { type: "geojson", data: pointCollection });

      // Route Stations
      map.addLayer({
        id: JOURNEY_STATIONS_LAYER,
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: [
          "any",
          ["==", ["get", "featureType"], "journey-station"],
          ["!", ["has", "featureType"]],
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
          "circle-color": "#facc15",
          "circle-radius": 8,
          "circle-stroke-color": "#080C14",
          "circle-stroke-width": 2.5,
          "circle-opacity": hasSelection ? 0 : 1.0,
          "circle-stroke-opacity": hasSelection ? 0 : 1.0,
        },
      });

      // Origin marker
      map.addLayer({
        id: JOURNEY_ORIGIN_LAYER,
        type: "circle",
        source: JOURNEY_POINTS_SOURCE,
        filter: ["==", ["get", "featureType"], "journey-origin"],
        paint: {
          "circle-color": "#10b981",
          "circle-radius": 9,
          "circle-stroke-color": "#ffffff",
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
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });

      const journeyPointLayers = [
        JOURNEY_STATIONS_LAYER,
        JOURNEY_TRANSFER_LAYER,
        JOURNEY_ORIGIN_LAYER,
        JOURNEY_DEST_LAYER,
      ];

      journeyPointLayers.forEach((layerId) => {
        map.on("mousemove", layerId, (e) => {
          map.getCanvas().style.cursor = "pointer";
          const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
          if (features.length > 0) {
            if (popupCloseTimeoutRef.current) {
              clearTimeout(popupCloseTimeoutRef.current);
              popupCloseTimeoutRef.current = null;
            }
            const props = features[0].properties;
            const geom = features[0].geometry as GeoJSON.Point;
            openSmartStationCardRef.current(props, geom.coordinates as [number, number], true);
          }
        });

        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
          popupCloseTimeoutRef.current = setTimeout(() => {
            if (!pinnedStationIdRef.current) {
              const popup = stationPopupRef.current;
              if (popup && !popup.getElement()?.matches(":hover")) {
                popup.remove();
                currentOpenStationIdRef.current = null;
              }
            }
          }, 250);
        });

        map.on("click", layerId, (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
          if (features.length > 0) {
            const props = features[0].properties;
            const geom = features[0].geometry as GeoJSON.Point;
            pinnedStationIdRef.current = props.id || null;
            
            openSmartStationCardRef.current(props, geom.coordinates as [number, number], false);
          }
        });
      });
    }

    // Fit map bounds to route geometry smoothly
    try {
      const coords: [number, number][] = [];
      for (const f of journeyGeojson.features) {
        if (f.geometry.type === "Point") {
          coords.push(f.geometry.coordinates as [number, number]);
        } else if (f.geometry.type === "LineString") {
          for (const pt of f.geometry.coordinates as [number, number][]) {
            coords.push(pt);
          }
        }
      }
      if (coords.length > 0) {
        let minLng = coords[0][0];
        let maxLng = coords[0][0];
        let minLat = coords[0][1];
        let maxLat = coords[0][1];
        for (const [lng, lat] of coords) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: { top: 70, bottom: 70, left: 160, right: 70 },
            maxZoom: 14.5,
            duration: 800,
          }
        );
      }
    } catch {
      // Safe fallback
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyGeojson, selectedCandidate?.id, mapLoaded, effectiveMapRef]);

  return (
    <div className="flex-1 h-full relative bg-[#080c14] select-none">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Consolidated Vertical Map Controls Dock (Bottom Right) */}
      <div
        className={`absolute bottom-[180px] md:bottom-6 transition-all duration-300 z-20 flex flex-col items-center gap-2 ${
          rightPanelOpen ? "right-4 md:right-[420px]" : "right-4"
        }`}
      >
        <div className="flex flex-col rounded-2xl bg-[#0B121E]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-[#00D5E8] hover:bg-white/10 transition text-base font-bold active:scale-95 cursor-pointer"
            title="Zoom In"
            suppressHydrationWarning
          >
            +
          </button>
          <div className="h-px bg-white/10" />
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-[#00D5E8] hover:bg-white/10 transition text-base font-bold active:scale-95 cursor-pointer"
            title="Zoom Out"
            suppressHydrationWarning
          >
            -
          </button>
          <div className="h-px bg-white/10" />
          {/* Recenter GPS */}
          <button
            onClick={handleRecenter}
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-[#00D5E8] hover:bg-white/10 transition active:scale-95 cursor-pointer"
            title="Recenter City View"
            suppressHydrationWarning
          >
            <span className="material-symbols-outlined text-[19px]">my_location</span>
          </button>
          <div className="h-px bg-white/10" />
          {/* Reset North / Compass */}
          <button
            onClick={handleResetNorth}
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-[#00D5E8] hover:bg-white/10 transition active:scale-95 cursor-pointer"
            title="Reset North & Pitch"
            suppressHydrationWarning
          >
            <Compass className="w-4 h-4 text-cyan-400" />
          </button>
          <div className="h-px bg-white/10" />
          {/* 2D / 3D Tilt Toggle */}
          <button
            onClick={handleToggle3D}
            className={`w-10 h-10 flex items-center justify-center transition active:scale-95 cursor-pointer font-bold text-xs ${
              is3D ? "text-[#00D5E8] bg-cyan-500/20" : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="Toggle 2D / 3D Perspective"
            suppressHydrationWarning
          >
            {is3D ? "3D" : "2D"}
          </button>
        </div>
      </div>
    </div>
  );
}
