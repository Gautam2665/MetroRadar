"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass } from "lucide-react";
import { RouteOption } from "../../containers/JourneyPlannerContainer";
import { renderSmartStationCardHtml, StationCardData } from "./SmartStationCard";
import { JourneyTrainSimulator } from "./JourneyTrainSimulator";
import {
  normalizeStationLines,
  deriveJourneyStationContext,
  SmartStationCardMode,
} from "../../utils/transitPresenter";

const CITY_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  delhi: { center: [77.2090, 28.6139], zoom: 11 },
  kochi: { center: [76.2999, 9.9816], zoom: 12 },
  hyderabad: { center: [78.4867, 17.3850], zoom: 12 },
  bengaluru: { center: [77.5946, 12.9716], zoom: 12 },
  chennai: { center: [80.2707, 13.0827], zoom: 12 },
  ahmedabad: { center: [72.5714, 23.0225], zoom: 12 },
  mumbai: { center: [72.8500, 19.1450], zoom: 10.8 },
};

const SYSTEM_CODES: Record<string, string> = {
  delhi: "DMRC",
  kochi: "KMRL",
  hyderabad: "HMRL",
  bengaluru: "BMRCL",
  chennai: "CMRL",
  ahmedabad: "GMRC",
  mumbai: "MM",
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
};

export default function MapContainer({
  center = [77.2332, 28.6665],
  zoom = 11,
  activeLayers = ["lines", "stations", "vehicles"],
  activeCity = "delhi",
  selectedStationId = null,
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
}: MapContainerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const internalMapRef = useRef<maplibregl.Map | null>(null);
  const effectiveMapRef = mapRef || internalMapRef;
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<"3D" | "Satellite" | "Dark">("Dark");

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
  const handleResetNorth = () => effectiveMapRef.current?.resetNorthPitch();

  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
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
    const isInterchange = cleanLines.length > 1 || isTransferPoint;

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

    // Pre-cache digital twin metadata in background if not already cached
    if (!cachedTwin && stId && !stId.startsWith("stn-")) {
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
    });

    if (mapRef) {
      mapRef.current = map;
    } else {
      internalMapRef.current = map;
    }
    if (typeof window !== "undefined") {
      (window as unknown as { _map?: maplibregl.Map })._map = map;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

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

    const cityConfig = CITY_CENTERS[activeCity?.toLowerCase() || "delhi"] || CITY_CENTERS.delhi;
    map.flyTo({
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  }, [activeCity, mapLoaded, effectiveMapRef]);

  // Handle Map Styles
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const styles: Record<string, string> = {
      Dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      Satellite: "https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
      "3D": "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    };

    if (styles[mapStyle]) {
      map.setStyle(styles[mapStyle]);
      map.once("style.load", () => {
        if (mapStyle === "3D") {
          map.easeTo({ pitch: 45, bearing: -15, duration: 1000 });
        } else {
          map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
        }
      });
    }
  }, [mapStyle, mapLoaded, effectiveMapRef]);

  // ── Network Base Layers (Lines & Stations) ────────────────────────────────
  useEffect(() => {
    const map = effectiveMapRef.current;
    if (!map || !mapLoaded) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    let layersLoaded = 0;

    const syncLayers = async () => {
      // 1. Lines Layer
      if (activeLayers.includes("lines")) {
        try {
          const t0 = performance.now();
          const res = await fetch(`${backendUrl}/map/lines?t=${Date.now()}`);
          if (res.ok) {
            const geojson = await res.json();
            apiLatencySetter?.(Math.round(performance.now() - t0));

            if (map.getSource("lines-source")) {
              (map.getSource("lines-source") as maplibregl.GeoJSONSource).setData(geojson);
            } else {
              map.addSource("lines-source", { type: "geojson", data: geojson });
              map.addLayer({
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
          console.error("Failed to load lines GIS layer:", err);
        }
      } else {
        if (map.getLayer("lines-layer")) map.removeLayer("lines-layer");
        if (map.getSource("lines-source")) map.removeSource("lines-source");
      }

      // 2. Stations Layer
      if (activeLayers.includes("stations")) {
        try {
          const sysCode = SYSTEM_CODES[activeCity.toLowerCase()] || "DMRC";
          const res = await fetch(`${backendUrl}/map/stations?system=${sysCode}&t=${Date.now()}`);
          if (res.ok) {
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
                  "circle-color": "#ffffff",
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 3,
                    14, 5,
                    18, 8,
                  ],
                  "circle-stroke-color": [
                    "case",
                    ["has", "lineColor"],
                    ["get", "lineColor"],
                    ["has", "color"],
                    ["get", "color"],
                    "#059DB2",
                  ],
                  "circle-stroke-width": 2,
                  "circle-opacity": 0.95,
                  "circle-stroke-opacity": 1.0,
                },
              });
            }

            // Interactive hover & click bindings
            map.on("mousemove", "stations-layer", (e) => {
              map.getCanvas().style.cursor = "pointer";
              const features = map.queryRenderedFeatures(e.point, { layers: ["stations-layer"] });
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

            map.on("mouseleave", "stations-layer", () => {
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

            map.on("click", "stations-layer", (e) => {
              const features = map.queryRenderedFeatures(e.point, { layers: ["stations-layer"] });
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
            map.on("click", (e) => {
              const features = map.queryRenderedFeatures(e.point, {
                layers: ["stations-layer", "journey-route-stations-layer", "journey-transfer-layer", "journey-origin-layer", "journey-dest-layer"].filter((l) => map.getLayer(l)),
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
          console.error("Failed to load stations GIS layer:", err);
        }
      } else {
        if (map.getLayer("stations-layer")) map.removeLayer("stations-layer");
        if (map.getSource("stations-source")) map.removeSource("stations-source");
      }

      setLoadedLayersCount?.(layersLoaded);
    };

    syncLayers();
  }, [activeLayers, activeCity, mapLoaded, apiLatencySetter, setLoadedLayersCount, effectiveMapRef]);

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

      {/* Top-Left Network Indicator Badge (Stitch UI) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl bg-[#0f141f]/90 backdrop-blur-xl border border-white/[0.08] flex items-center gap-2 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] text-white font-bold tracking-wider uppercase">
            {activeCity.toUpperCase()} METRO NETWORK
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
            {selectedCandidate ? "ROUTE SIM ACTIVE" : "MULTI-CANDIDATE VIEW"}
          </span>
        </div>
      </div>

      {/* Right-Side Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <div className="flex flex-col rounded-xl bg-[#0f141f]/90 backdrop-blur-xl border border-white/[0.08] shadow-xl overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition text-sm font-bold active:scale-95 cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <div className="h-px bg-white/[0.08]" />
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition text-sm font-bold active:scale-95 cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>
          <div className="h-px bg-white/[0.08]" />
          <button
            onClick={handleResetNorth}
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
            title="Reset North"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* 3D / Satellite / Dark View Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0f141f]/90 backdrop-blur-xl border border-white/[0.08] shadow-xl">
          {(["3D", "Satellite", "Dark"] as const).map((style) => (
            <button
              key={style}
              onClick={() => setMapStyle(style)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-medium transition cursor-pointer ${
                mapStyle === style
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {style === "Dark" ? "Vector Dark" : style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
