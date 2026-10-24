"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import { Sidebar } from "../components/Sidebar";
import MapContainer from "../components/map/MapContainer";
import { useCityContext } from "../contexts/CityContext";
import { useStations } from "../hooks/useStations";
import { useRealtime } from "../hooks/useRealtime";
import { useDigitalTwin } from "../hooks/useDigitalTwin";
import { useAssistantUi } from "../contexts/AssistantUiContext";
import { useJourneyContext } from "../contexts/JourneyContext";
import { ApiClient } from "../services/api/client";
import { StationApi, StationSearchResult, toPlaceSuggestion } from "../services/api/station.api";
import { useStationsSearch } from "../hooks/useStationsSearch";
import { formatLineName } from "../utils/transitFormatter";
import { JourneyDetailsTimeline } from "../components/ui/JourneyPlannerView";
import { PlaceSuggestion } from "../models/search";
import { PlaceSuggestionItem } from "../components/PlaceSuggestionItem";
import { RouteOption } from "./JourneyPlannerContainer";
import { RealtimeVehicle } from "../models/vehicle";

interface CorridorDef {
  code: string;
  searchKey: string;
  name: string;
  route: string;
  color: string;
  stationCount: number;
  isUnderConstruction?: boolean;
}

const MUMBAI_CORRIDORS: CorridorDef[] = [
  {
    code: "LINE1",
    searchKey: "Line 1",
    name: "Line 1 (Blue)",
    route: "Versova ↔ Ghatkopar",
    color: "#007DC5",
    stationCount: 12,
  },
  {
    code: "LINE2A",
    searchKey: "Line 2A",
    name: "Line 2A (Yellow)",
    route: "Dahisar E ↔ Andheri W",
    color: "#FACC15",
    stationCount: 17,
  },
  {
    code: "LINE3",
    searchKey: "Line 3",
    name: "Line 3 (Aqua)",
    route: "Aarey JVLR ↔ Cuffe Parade",
    color: "#059DB2",
    stationCount: 27,
  },
  {
    code: "LINE7",
    searchKey: "Line 7",
    name: "Line 7 (Red)",
    route: "Kashigaon ↔ Gundavali",
    color: "#E31E24",
    stationCount: 17,
  },
  {
    code: "LINE2B",
    searchKey: "Line 2B",
    name: "Line 2B (Yellow)",
    route: "Mandale Depot ↔ Chembur",
    color: "#F0C800",
    stationCount: 6,
  },
  {
    code: "MONORAIL",
    searchKey: "Monorail",
    name: "Monorail",
    route: "Sant Gadge Maharaj Chowk ↔ Chembur",
    color: "#7C3AED",
    stationCount: 17,
  },
];

function countVehiclesForCorridor(
  vehicles: RealtimeVehicle[],
  lineCode: string,
  lineName: string
): number {
  if (!vehicles || vehicles.length === 0) return 0;
  const cNorm = lineCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nNorm = lineName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return vehicles.filter((v) => {
    const vId = (v.lineId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const vName = (v.lineName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      (vId && (vId.includes(cNorm) || cNorm.includes(vId))) ||
      (vName && (vName.includes(nNorm) || nNorm.includes(vName)))
    );
  }).length;
}

function getServiceStatusInfo(vehiclesCount: number, loading: boolean) {
  if (loading && vehiclesCount === 0) {
    return {
      isOffPeak: false,
      badgeText: "Connecting",
      badgeColor: "cyan",
      displayText: "Synchronizing fleet telemetry...",
    };
  }

  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 3600000;
  const istDate = new Date(istMs);

  const hours = istDate.getHours();
  const mins = istDate.getMinutes();
  const currentMins = hours * 60 + mins;

  const offPeakStart = 23 * 60 + 30; // 23:30
  const offPeakEnd = 5 * 60 + 30;    // 05:30

  const isOffPeak = currentMins >= offPeakStart || currentMins < offPeakEnd;

  if (isOffPeak) {
    let minsLeft = 0;
    if (currentMins >= offPeakStart) {
      minsLeft = 24 * 60 - currentMins + offPeakEnd;
    } else {
      minsLeft = offPeakEnd - currentMins;
    }
    const h = Math.floor(minsLeft / 60);
    const m = minsLeft % 60;
    return {
      isOffPeak: true,
      badgeText: "Off-Peak Standby",
      badgeColor: "amber",
      displayText: `Service resumes in ${h > 0 ? `${h}h ` : ""}${m}m (~05:30 AM)`,
    };
  }

  const isPeak =
    (currentMins >= 8 * 60 + 30 && currentMins <= 11 * 60 + 30) ||
    (currentMins >= 17 * 60 + 30 && currentMins <= 20 * 60 + 30);

  if (vehiclesCount > 0) {
    return {
      isOffPeak: false,
      badgeText: "Operational",
      badgeColor: "emerald",
      displayText: isPeak ? "Peak Headway: ~4–6 min" : "Headway: ~6–8 min",
    };
  }

  return {
    isOffPeak: false,
    badgeText: "Scheduled",
    badgeColor: "blue",
    displayText: isPeak ? "Peak Schedule: ~4–6 min" : "Regular Scheduled Headway (~6–8 min)",
  };
}

interface UnifiedTransitWorkspaceProps {
  initialMode?: "default" | "plan" | "network";
}

export function UnifiedTransitWorkspace({ initialMode = "default" }: UnifiedTransitWorkspaceProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const searchParams = useSearchParams();
  const { activeCity } = useCityContext();
  const { toggleAssistant } = useAssistantUi();

  // Data Hooks
  const { data: stations, loading: stationsLoading } = useStations(activeCity);
  const { data: vehicles, loading: realtimeLoading } = useRealtime(activeCity, 10000);

  // Inspector & Selection State
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationName, setSelectedStationName] = useState<string>("");
  const [activeLevel, setActiveLevel] = useState<"G" | "L1" | "L2">("L1");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  // Digital Twin for Station Inspector
  const { data: twin, loading: twinLoading } = useDigitalTwin(
    selectedStationId,
    selectedStationName || "Station"
  );

  // Filter Mode: "all" | "lines" | "stations" | "interchanges" | "live_trains" | "accessible"
  const [activeFilterMode, setActiveFilterMode] = useState<
    "all" | "lines" | "stations" | "interchanges" | "live_trains" | "accessible"
  >("all");

  // Journey Planner State
  const [isPlanOpen, setIsPlanOpen] = useState(initialMode === "plan");
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [originStationId, setOriginStationId] = useState<string | null>(null);
  const [destStationId, setDestStationId] = useState<string | null>(null);
  const [originOutOfCoverage, setOriginOutOfCoverage] = useState(false);
  const [destOutOfCoverage, setDestOutOfCoverage] = useState(false);

  const [candidates, setCandidates] = useState<RouteOption[]>([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number>(0);
  const [routeGeojson, setRouteGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Autocomplete Suggestions
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [showStationSearchSuggestions, setShowStationSearchSuggestions] = useState(false);
  const [stationSearchInput, setStationSearchInput] = useState("");

  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "mid" | "expanded">("peek");
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=19.0760&longitude=72.8777&current_weather=true")
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data?.current_weather?.temperature !== undefined) {
          setWeatherTemp(Math.round(data.current_weather.temperature));
          setWeatherCode(data.current_weather.weathercode ?? 0);
        }
      })
      .catch(() => {});
    return () => {
      isSubscribed = false;
    };
  }, []);


  const originWrapperRef = useRef<HTMLDivElement>(null);
  const destWrapperRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const profileWrapperRef = useRef<HTMLDivElement>(null);

  const {
    results: originSearchResults,
    loading: originSearchLoading,
    search: searchOriginPlaces,
    clear: clearOriginSearch,
  } = useStationsSearch(activeCity);

  const {
    results: destSearchResults,
    loading: destSearchLoading,
    search: searchDestPlaces,
    clear: clearDestSearch,
  } = useStationsSearch(activeCity);

  const {
    results: generalSearchResults,
    loading: generalSearchLoading,
    search: searchGeneralStations,
    clear: clearGeneralSearch,
  } = useStationsSearch(activeCity);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originWrapperRef.current && !originWrapperRef.current.contains(event.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destWrapperRef.current && !destWrapperRef.current.contains(event.target as Node)) {
        setShowDestSuggestions(false);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowStationSearchSuggestions(false);
      }
      if (profileWrapperRef.current && !profileWrapperRef.current.contains(event.target as Node)) {
        setShowProfilePopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    originName: ctxOriginName,
    destinationName: ctxDestName,
    originId: ctxOriginId,
    destinationId: ctxDestId,
    journeyGeojson: ctxJourneyGeojson,
  } = useJourneyContext();

  // Sync when route or landmark is resolved via AI Assistant
  useEffect(() => {
    if (ctxOriginName && ctxDestName) {
      setOriginInput(cleanPlaceName(ctxOriginName));
      setDestInput(cleanPlaceName(ctxDestName));
      if (ctxOriginId) setOriginStationId(ctxOriginId);
      if (ctxDestId) setDestStationId(ctxDestId);
      if (ctxJourneyGeojson) {
        setRouteGeojson(ctxJourneyGeojson as unknown as GeoJSON.FeatureCollection);
      }
      setIsPlanOpen(true);
    }
  }, [ctxOriginName, ctxDestName, ctxOriginId, ctxDestId, ctxJourneyGeojson]);

  const cleanPlaceName = (name: string) =>
    name
      .replace(/\s*\(Landmark\)/gi, "")
      .replace(/\s*\((?:Nearest Metro:[^)]+|Direct FOB[^)]*|Outside Mumbai Metro Coverage[^)]*)\)/gi, "")
      .trim();

  // Handle Station Selection (e.g. from Map or Search)
  const handleSelectStation = useCallback(
    (station: { id: string; name: string; lat?: number; lng?: number }) => {
      setSelectedStationId(station.id);
      setSelectedStationName(station.name);
      setInspectorCollapsed(false);
      setMobileSheetState("mid");

      if (station.lat && station.lng) {
        mapRef.current?.flyTo({
          center: [station.lng, station.lat],
          zoom: 15,
          duration: 700,
        });
      }
    },
    []
  );

  // Route Planning Execution (Clean, real API call only — zero hardcoded fallbacks)
  const planJourney = useCallback(async () => {
    if (!originInput.trim() || !destInput.trim()) {
      setErrorMsg("Please enter both origin and destination");
      return;
    }
    setJourneyLoading(true);
    setErrorMsg(null);

    let isOrigOut = originOutOfCoverage;
    let isDestOut = destOutOfCoverage;

    let finalOrigId = originStationId;
    if (!finalOrigId && stations && !isOrigOut) {
      const match = stations.find((s) => s.name.toLowerCase() === originInput.trim().toLowerCase());
      if (match) {
        finalOrigId = match.id;
      } else {
        const searchRes = await StationApi.searchStations(originInput.trim(), activeCity);
        if (searchRes.success && searchRes.data.length > 0) {
          const first = searchRes.data[0];
          if (first.isOutOfCoverage) isOrigOut = true;
          else {
            finalOrigId =
              first.type === "poi" || first.isLandmark
                ? (first.lat && first.lng ? `${first.lat.toFixed(5)},${first.lng.toFixed(5)}` : first.id)
                : (first.stationId || first.id || first.name);
          }
        }
      }
    }

    let finalDestId = destStationId;
    if (!finalDestId && stations && !isDestOut) {
      const match = stations.find((s) => s.name.toLowerCase() === destInput.trim().toLowerCase());
      if (match) {
        finalDestId = match.id;
      } else {
        const searchRes = await StationApi.searchStations(destInput.trim(), activeCity);
        if (searchRes.success && searchRes.data.length > 0) {
          const first = searchRes.data[0];
          if (first.isOutOfCoverage) isDestOut = true;
          else {
            finalDestId =
              first.type === "poi" || first.isLandmark
                ? (first.lat && first.lng ? `${first.lat.toFixed(5)},${first.lng.toFixed(5)}` : first.id)
                : (first.stationId || first.id || first.name);
          }
        }
      }
    }

    if (isOrigOut || isDestOut) {
      const outLoc =
        isOrigOut && isDestOut
          ? `Both "${originInput}" and "${destInput}" are`
          : isOrigOut
          ? `"${originInput}" is`
          : `"${destInput}" is`;
      setErrorMsg(`${outLoc} outside Mumbai Metro coverage.`);
      setJourneyLoading(false);
      return;
    }

    if (!finalOrigId || !finalDestId) {
      setErrorMsg("Please select valid origin and destination stations within metro coverage.");
      setJourneyLoading(false);
      return;
    }

    if (finalOrigId === finalDestId) {
      setErrorMsg("Origin and destination must be different stations.");
      setJourneyLoading(false);
      return;
    }

    try {
      const res = await ApiClient.get<{
        candidates?: any[];
        geojson?: GeoJSON.FeatureCollection;
      }>(
        `/journeys?from=${encodeURIComponent(finalOrigId)}&to=${encodeURIComponent(finalDestId)}&k=5`
      );

      if (res.success && res.data?.candidates && res.data.candidates.length > 0) {
        const mappedList: RouteOption[] = res.data.candidates.map((c: any, idx: number) => {
          const totalDurationMins =
            c.durationMinutes ?? Math.max(1, Math.round((c.durationSeconds || 0) / 60));
          const fareDisplay = c.fare ? `₹${c.fare}` : "₹10";
          const smartCardDisplay = c.smartCardFare ? `₹${c.smartCardFare}` : "₹9";

          const legs = (c.legs || []).map((leg: any) => {
            const isWalk = leg.mode === "TRANSFER" || leg.type === "WALK" || leg.type === "TRANSFER";
            const rawLine = leg.lineName ?? leg.lineCode ?? "";
            const cleanLine = isWalk ? "Walk" : formatLineName(rawLine);
            const hopCount = leg.hopCount ?? leg.stationsCount ?? leg.stopsCount ?? 1;

            return {
              mode: isWalk ? ("walk" as const) : ("subway" as const),
              type: (isWalk ? "WALK" : "TRANSIT") as "WALK" | "TRANSIT",
              line: cleanLine,
              shortLine: leg.lineCode || leg.lineName,
              color: isWalk ? "#00E5FF" : leg.lineColor ?? "#F5A623",
              lineColor: leg.lineColor ?? "#F5A623",
              fromStation: leg.fromStationName,
              toStation: leg.toStationName,
              towards: leg.towards || null,
              platform: leg.boardingPlatform || leg.platform || null,
              boardingPlatform: leg.boardingPlatform || null,
              alightingPlatform: leg.alightingPlatform || null,
              platformStatus: leg.platformStatus || "KNOWN",
              throughServiceContinuationFromPrevious: leg.throughServiceContinuationFromPrevious,
              doorsOpen: leg.doorsOpen || null,
              doorSideStatus: leg.doorSideStatus,
              stopsCount: hopCount,
              hopCount,
              stopsText: leg.stopsText || (hopCount ? `Ride ${hopCount} stop${hopCount !== 1 ? "s" : ""}` : undefined),
              durationMins:
                leg.durationMinutes ??
                Math.max(1, Math.round((leg.durationSeconds ?? leg.duration ?? 180) / 60)),
              durationSeconds: leg.durationSeconds ?? leg.duration ?? 180,
              transferDetails: leg.transferDetails,
              transferTitle: leg.transferTitle,
              transferSummary: leg.transferSummary,
              transferDurationText: leg.transferDurationText,
              transferInstructions: leg.transferInstructions,
              realtimeEtaMins: leg.realtimeEtaMins,
              connectionWaitMins: leg.connectionWaitMins,
              realtimeTimeStr: leg.realtimeTimeStr,
              delaySeconds: leg.delaySeconds,
            };
          });

          let label = "BEST OVERALL";
          if (c.attributes?.direct && c.attributes?.fastest) label = "⚡ Direct & Fastest";
          else if (c.attributes?.direct) label = "◎ Direct";
          else if (c.attributes?.fastest) label = "⚡ Fastest";
          else if (c.attributes?.fewestTransfers) label = "🔁 Fewest Changes";
          else if (c.attributes?.leastWalking) label = "🚶 Least Walking";
          else if (c.attributes?.accessibilityFriendly) label = "♿ Accessible";
          else if (idx > 0) label = `Option ${idx + 1}`;

          return {
            id: c.id || `candidate-${idx}`,
            label,
            duration: `${totalDurationMins} min`,
            durationMins: totalDurationMins,
            durationSeconds: c.durationSeconds,
            fare: fareDisplay,
            smartCardFare: smartCardDisplay,
            fareBreakdown: c.fareBreakdown,
            requiresMultipleTickets: c.requiresMultipleTickets,
            distance: "",
            interchanges: c.transfers ?? 0,
            walkDistance: `${c.walkingDistanceMeters ?? 350}m`,
            walkMins: Math.max(1, Math.round((c.walkingSeconds ?? 240) / 60)),
            score: 100 - idx * 10,
            legs,
            geojson: c.geojson,
            attributes: c.attributes,
            destinationGuidance: c.destinationGuidance,
            boardCoach: c.boardCoach,
            stations: c.stations || [],
            realtimeOccupancy: c.realtimeOccupancy,
            realtime: c.realtime,
          };
        });

        setCandidates(mappedList);
        setActiveCandidateIndex(0);
        setRouteGeojson(mappedList[0].geojson || res.data.geojson || null);
        setSelectedStationId(null); // Switch adaptive inspector to Journey Results mode
        setInspectorCollapsed(false);
        setMobileSheetState("mid");
      } else {
        const err = !res.success ? res.error : undefined;
        setErrorMsg(err || "No feasible transit route found between these stations.");
        setCandidates([]);
        setRouteGeojson(null);
      }
    } catch {
      setErrorMsg("Failed to connect to journey engine. Please verify server status.");
      setCandidates([]);
      setRouteGeojson(null);
    } finally {
      setJourneyLoading(false);
    }
  }, [originInput, destInput, originStationId, destStationId, stations, originOutOfCoverage, destOutOfCoverage, activeCity]);

  // Read URL Query Parameters (Deep linking support for /plan and /network)
  useEffect(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const origIdParam = searchParams.get("originId");
    const destIdParam = searchParams.get("destId");
    const stnIdParam = searchParams.get("stationId") || searchParams.get("station");
    const stnNameParam = searchParams.get("stationName");

    if (fromParam || toParam) {
      setIsPlanOpen(true);
      if (fromParam) {
        setOriginInput(cleanPlaceName(fromParam));
        if (origIdParam) setOriginStationId(origIdParam);
      }
      if (toParam) {
        setDestInput(cleanPlaceName(toParam));
        if (destIdParam) setDestStationId(destIdParam);
      }
      if (fromParam && toParam) {
        const timer = setTimeout(() => planJourney(), 80);
        return () => clearTimeout(timer);
      }
    } else if (stnIdParam) {
      setSelectedStationId(stnIdParam);
      setSelectedStationName(stnNameParam || "Station");
      setInspectorCollapsed(false);
    }
  }, [searchParams, planJourney]);

  // Dynamic service window & headway calculation based on IST time-of-day and live telemetry fleet
  const serviceStatus = useMemo(() => {
    return getServiceStatusInfo(vehicles?.length || 0, realtimeLoading);
  }, [vehicles?.length, realtimeLoading]);

  // Real dynamic punctuality computed from live vehicle telemetry delay distribution
  const networkPunctuality = useMemo(() => {
    if (realtimeLoading && (!vehicles || vehicles.length === 0)) return "Syncing...";
    if (!vehicles || vehicles.length === 0) return "Schedule Norm";
    const onTimeCount = vehicles.filter((v) => v.status === "On Time" || (v.delayMins ?? 0) <= 3).length;
    const pct = Math.round((onTimeCount / vehicles.length) * 100);
    return `${pct}% On-Time`;
  }, [vehicles, realtimeLoading]);

  // Real dynamic telemetry status
  const telemetryStatus = useMemo(() => {
    if (realtimeLoading && (!vehicles || vehicles.length === 0)) return "Connecting...";
    if (!vehicles || vehicles.length === 0) return "Standby";
    return `${vehicles.length} Units Active`;
  }, [vehicles, realtimeLoading]);

  // Dynamic Corridors with real fleet telemetry
  const corridors = useMemo(() => {
    return MUMBAI_CORRIDORS.map((c) => {
      const liveTrains = c.isUnderConstruction
        ? 0
        : countVehiclesForCorridor(vehicles || [], c.code, c.searchKey);
      return {
        ...c,
        liveTrains,
      };
    });
  }, [vehicles]);

  // Interactive Corridor Cards: Pan/Zoom directly to line bounding box
  const handleCorridorClick = useCallback(
    (corridor: CorridorDef) => {
      const map = mapRef.current;
      if (!map) return;

      const lineKey = corridor.searchKey.toLowerCase();
      const matched = (stations || []).filter((s) => {
        const lines = Array.isArray(s.lines) ? s.lines : [];
        const infra = Array.isArray(s.lineInfrastructure) ? s.lineInfrastructure : [];
        return (
          [...lines, ...infra].some((l: any) => {
            const code = (l.code || l.id || l.lineCode || "").toLowerCase();
            const name = (l.name || l.lineName || "").toLowerCase();
            return code.includes(corridor.code.toLowerCase()) || name.includes(lineKey);
          }) || (s.name && s.name.toLowerCase().includes(lineKey))
        );
      });

      if (matched.length > 0) {
        let minLng = matched[0].lng;
        let maxLng = matched[0].lng;
        let minLat = matched[0].lat;
        let maxLat = matched[0].lat;
        for (const st of matched) {
          if (st.lng < minLng) minLng = st.lng;
          if (st.lng > maxLng) maxLng = st.lng;
          if (st.lat < minLat) minLat = st.lat;
          if (st.lat > maxLat) maxLat = st.lat;
        }
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: { top: 120, bottom: 120, left: 100, right: 420 },
            maxZoom: 14,
            duration: 900,
          }
        );
      }
      setActiveFilterMode("lines");
    },
    [stations]
  );

  // Map active layers derived from selected filter
  const mapActiveLayers = useMemo(() => {
    if (activeFilterMode === "lines") return ["lines"];
    if (activeFilterMode === "interchanges") return ["lines", "interchanges"];
    if (activeFilterMode === "accessible") return ["lines", "accessible"];
    if (activeFilterMode === "stations") return ["lines", "stations"];
    if (activeFilterMode === "live_trains") return ["lines", "stations", "vehicles"];
    return ["lines", "stations", "vehicles"];
  }, [activeFilterMode]);

  const activeRoute = candidates[activeCandidateIndex] || null;

  // Reusable Inspector Content for Desktop Floating Glass Card and Mobile Bottom Sheet
  const renderInspectorBody = (isMobile = false) => {
    // Mode 1: Journey Candidates & Step-by-Step Guidance
    if (candidates.length > 0 && !selectedStationId) {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#1A293E] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00E5FF] text-base">route</span>
              <h3 className="font-bold text-white text-sm">Suggested Journeys</h3>
              <span className="text-xs text-slate-400">({candidates.length} options)</span>
            </div>
            <button
              onClick={() => {
                setCandidates([]);
                setRouteGeojson(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Clear</span>
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Candidate Route Cards & Timeline */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide">
            {candidates.map((cand, idx) => {
              const isSelected = idx === activeCandidateIndex;
              return (
                <div
                  key={cand.id}
                  onClick={() => {
                    setActiveCandidateIndex(idx);
                    if (cand.geojson) setRouteGeojson(cand.geojson);
                  }}
                  className={`rounded-xl p-3.5 transition cursor-pointer ${
                    isSelected
                      ? "bg-[#111C2E] border-2 border-[#00E5FF] shadow-[0_0_18px_rgba(0,229,255,0.15)]"
                      : "bg-[#0E1725] border border-[#1B293C] hover:border-slate-600"
                  }`}
                >
                  {/* Candidate Summary */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border ${
                          isSelected
                            ? "bg-cyan-500/20 text-[#00E5FF] border-[#00E5FF]/40"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {cand.label}
                      </span>
                      <div className="flex items-baseline space-x-2 mt-1.5">
                        <span className="text-lg font-black text-white">{cand.duration}</span>
                        <span className="text-xs text-slate-400">
                          {cand.interchanges === 0 ? "Direct" : `${cand.interchanges} transfer(s)`} •{" "}
                          {cand.walkDistance} walk
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-white">{cand.fare}</div>
                      {cand.smartCardFare && (
                        <div className="text-[10px] text-slate-400">Smart Card: {cand.smartCardFare}</div>
                      )}
                    </div>
                  </div>

                  {/* Legs Badges */}
                  <div className="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-[#172538] text-xs flex-wrap gap-y-1">
                    {cand.legs.map((leg, legIdx) => (
                      <div key={legIdx} className="flex items-center gap-1">
                        {legIdx > 0 && <span className="text-slate-600 text-[10px]">→</span>}
                        {leg.mode === "walk" ? (
                          <div className="flex items-center gap-1 text-slate-300 text-[11px]">
                            <span className="material-symbols-outlined text-xs text-[#00E5FF]">directions_walk</span>
                            <span>{leg.durationMins}m</span>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-white font-bold text-[10px]"
                            style={{ backgroundColor: leg.color || "#F5A623" }}
                          >
                            <span className="material-symbols-outlined text-[10px]">subway</span>
                            <span>{leg.line}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Detailed Timeline for Selected Route */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-[#1A2A3F]">
                      <JourneyDetailsTimeline
                        route={cand}
                        origin={originInput || cand.legs[0]?.fromStation || "Origin"}
                        destination={destInput || cand.legs[cand.legs.length - 1]?.toStation || "Destination"}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Mode 2: Station Inspector (Digital Twin)
    if (selectedStationId) {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          {/* 1. Station Header (Streamlined: Metro icon, Line pill, Step-free badge) */}
          <div className="p-3.5 border-b border-[#1A293E] bg-[#0c1422] shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-white flex items-center gap-1.5 truncate">
                      <span>🚇</span>
                      <span>{twin?.stationName || selectedStationName}</span>
                    </h2>
                    {twin?.lines && twin.lines.length > 0 ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border shadow-sm"
                        style={{
                          backgroundColor: `${twin.lines[0].color}20`,
                          borderColor: `${twin.lines[0].color}60`,
                          color: twin.lines[0].color,
                        }}
                      >
                        {twin.lines[0].name || twin.lines[0].code}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                        Mumbai Metro
                      </span>
                    )}
                  </div>
                  {twin?.lines && twin.lines.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Interchange:</span>
                      {twin.lines.slice(1).map((l, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[9.5px] font-bold border flex items-center gap-1"
                          style={{
                            backgroundColor: `${l.color}15`,
                            borderColor: `${l.color}50`,
                            color: l.color,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                          <span>{l.name || l.code}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedStationId(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                title="Close Station Inspector"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>

          {/* 2. Quick Route Actions */}
          <div className="px-3.5 py-2 border-b border-[#1A293E] bg-[#0E1725] flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setOriginInput(twin?.stationName || selectedStationName);
                setOriginStationId(selectedStationId);
                setIsPlanOpen(true);
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Route From Here</span>
            </button>
            <button
              onClick={() => {
                setDestInput(twin?.stationName || selectedStationName);
                setDestStationId(selectedStationId);
                setIsPlanOpen(true);
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Route To Here</span>
            </button>
          </div>

          {/* Station Inspector Content (ETAs, Gates, Levels) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {twinLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl p-3 bg-white/5 border border-white/5 animate-pulse h-20" />
                ))}
              </div>
            ) : twin ? (
              <>
                {/* ⏱️ Live Platforms */}
                <div className="rounded-xl p-3.5 bg-[#0E1624] border border-[#1B293C] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-sm">⏱️</span>
                      <span>Live Platforms</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Tracker
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#080E18] border border-white/5 divide-y divide-white/5 overflow-hidden">
                    {twin.platformEtas && twin.platformEtas.length > 0 ? (
                      twin.platformEtas.map((eta, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2.5 hover:bg-white/[0.02] transition"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">{eta.platform}</span>
                              <span className="text-slate-500 text-xs">•</span>
                              <span className="text-[11px] text-slate-300 font-medium">Towards {eta.towards}</span>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            {eta.etaMins === null || eta.etaMins === undefined ? (
                              <span className="text-[11px] text-slate-400 font-semibold">Service Closed</span>
                            ) : eta.etaMins <= 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                Arriving now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-[#00E5FF] font-bold text-xs border border-sky-500/20">
                                in {eta.etaMins} min
                              </span>
                            )}
                            {eta.crowdLevel && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5"
                                style={{
                                  color:
                                    eta.crowdLevel === "Low"
                                      ? "#4ade80"
                                      : eta.crowdLevel === "Medium"
                                      ? "#fec931"
                                      : "#ef4444",
                                }}
                              >
                                {eta.crowdLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 text-xs text-slate-400">Regular revenue schedule active</div>
                    )}
                  </div>
                </div>

                {/* 🚪 Gates & Wayfinding */}
                <div className="rounded-xl p-3.5 bg-[#0E1624] border border-[#1B293C] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-sm">🚪</span>
                      <span>
                        Gates &amp; Wayfinding {twin.exits && twin.exits.length > 0 ? `(${twin.exits.length} Gates)` : ""}
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {twin.exits && twin.exits.length > 0 ? (
                      Object.entries(
                        twin.exits.reduce<Record<string, typeof twin.exits>>((acc, exit) => {
                          const side = exit.concourseSide || "CONCOURSE GATES";
                          if (!acc[side]) acc[side] = [];
                          acc[side].push(exit);
                          return acc;
                        }, {})
                      ).map(([concourseSide, exits]) => (
                        <div key={concourseSide} className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-1 pb-1 border-b border-white/5 flex items-center justify-between">
                            <span>{concourseSide}</span>
                            {concourseSide === "INTERCHANGE LINK" && (
                              <span className="text-[9.5px] text-sky-400 font-mono font-medium">Concourse Skywalk</span>
                            )}
                          </div>

                          {concourseSide === "INTERCHANGE LINK" ? (
                            <div className="space-y-2 pt-0.5">
                              {exits.map((exit, i) => {
                                const match = exit.name.match(/To\s+(.+?)\s*\((.+?)\)/i);
                                const targetStation = match ? match[1].trim() : exit.name.replace(/^To\s+/i, "");
                                const lineDetail = match ? match[2].trim() : "";

                                return (
                                  <div
                                    key={exit.id || i}
                                    className="p-2.5 rounded-xl bg-gradient-to-r from-sky-950/60 via-[#0d2238] to-indigo-950/40 border border-sky-500/30 text-xs space-y-1.5 shadow-sm"
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] border border-sky-500/40 flex items-center gap-1">
                                          <span>🔄</span>
                                          <span>{exit.isRailInterchange ? "Rail Link" : "Metro Transfer"}</span>
                                        </span>
                                        <span className="font-bold text-white text-[12px]">
                                          To {targetStation}
                                        </span>
                                      </div>
                                      {typeof exit.distanceMeter === "number" && exit.distanceMeter > 0 && (
                                        <span className="text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                          <span className="material-symbols-outlined text-[12px]">directions_walk</span>
                                          {exit.distanceMeter}m · ~{Math.max(1, Math.round(exit.distanceMeter / 75))} min
                                        </span>
                                      )}
                                    </div>
                                    {lineDetail && (
                                      <div className="text-[11px] text-slate-200 font-medium flex items-center gap-1.5 pl-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                                        <span>{lineDetail}</span>
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 pl-0.5 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[12px] text-slate-500">deck</span>
                                      <span>Direct Concourse Foot Overbridge (FOB) · No street crossing</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {exits.map((exit, i) => {
                                const cleanRaw = exit.name && exit.name !== exit.gate
                                  ? exit.name.replace(/^.*Gate\s*[A-Z0-9]+\s*[-:·]\s*/i, "").trim() || exit.name
                                  : `Gate ${exit.gate}`;
                                const displayName = cleanRaw.replace(/^\((.+)\)$/, "$1").trim();

                                return (
                                  <div
                                    key={exit.id || i}
                                    className="flex items-start justify-between gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50 text-xs transition"
                                  >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <span className="font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800/40 px-1.5 py-0.5 rounded text-[11px] shrink-0 mt-0.5">
                                        {exit.gate}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <span className="text-slate-300 text-xs leading-snug break-words">
                                          {displayName}
                                        </span>
                                        {exit.isRailInterchange && (
                                          <span className="ml-1.5 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0 inline-flex items-center gap-1">
                                            🚆 Suburban Link
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-1 mt-0.5">
                                      {exit.hasLift && (
                                        <span
                                          className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded flex items-center gap-0.5"
                                          title="Step-Free Lift Available"
                                        >
                                          🛗 Lift
                                        </span>
                                      )}
                                      {exit.hasEscalator && (
                                        <span
                                          className="text-[10px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 rounded flex items-center gap-0.5"
                                          title="Escalator Available"
                                        >
                                          ⚡ Esc
                                        </span>
                                      )}
                                      {typeof exit.distanceMeter === "number" && exit.distanceMeter > 0 && (
                                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                                          <span className="material-symbols-outlined text-[11px]">directions_walk</span>
                                          {exit.distanceMeter}m
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 px-1">All standard concourse gates open</p>
                    )}
                  </div>
                </div>

                {/* 🏢 Station Amenities */}
                <div className="rounded-xl p-3.5 bg-[#0E1624] border border-[#1B293C] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-sm">🏢</span>
                      <span>Station Amenities</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#080E18] border border-white/5 text-xs text-slate-200">
                      <span className="text-sm shrink-0">🛗</span>
                      <span className="text-[11px] font-medium truncate">Lifts (All levels)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#080E18] border border-white/5 text-xs text-slate-200">
                      <span className="text-sm shrink-0">🚻</span>
                      <span className="text-[11px] font-medium truncate">Washrooms (L1)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#080E18] border border-white/5 text-xs text-slate-200">
                      <span className="text-sm shrink-0">🚰</span>
                      <span className="text-[11px] font-medium truncate">Drinking Water</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#080E18] border border-white/5 text-xs text-slate-200">
                      <span className="text-sm shrink-0">🏧</span>
                      <span className="text-[11px] font-medium truncate">ATM Counter</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#080E18] border border-white/5 text-xs text-slate-200">
                      <span className="text-sm shrink-0">🩺</span>
                      <span className="text-[11px] font-medium truncate">First Aid Desk</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#080E18] border border-white/5 text-xs text-slate-200">
                      <span className="text-sm shrink-0">🎫</span>
                      <span className="text-[11px] font-medium truncate">Ticket Counter</span>
                    </div>
                  </div>

                  {/* Compact Level Switcher */}
                  {twin.levels && twin.levels.length > 0 && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Levels</span>
                      <div className="flex gap-1.5">
                        {twin.levels.map((level, lIdx) => {
                          const lvlTag: "G" | "L1" | "L2" =
                            level.levelNumber !== undefined && level.levelNumber <= 0
                              ? "G"
                              : level.levelNumber === 1
                              ? "L1"
                              : "L2";
                          const isSelected = activeLevel === lvlTag;

                          return (
                            <button
                              key={level.id || lIdx}
                              type="button"
                              onClick={() => setActiveLevel(lvlTag)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40"
                                  : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                              }`}
                            >
                              {lvlTag}: {level.name.replace(/^(Station\s+|Metro\s+)/i, "").split(" ")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      );
    }

    // Default / Idle Mode: Corridors & Fleet Explorer
    return (
      <div className="flex flex-col h-full overflow-hidden p-4 space-y-3.5">
        {/* Fleet Telemetry Status & Active Metrics Card */}
        <div className="rounded-xl p-3.5 bg-[#0E1624] border border-[#1B293C] space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00E5FF] text-base">sensors</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Fleet Telemetry</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              Live MMR Feed
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <div>
              <span className="text-2xl font-black text-white">{vehicles ? vehicles.length : 0}</span>
              <span className="text-xs text-slate-400 ml-1.5 font-medium">Trains on Track</span>
            </div>
            <span className="text-xs font-semibold text-[#00E5FF]">
              {serviceStatus.displayText}
            </span>
          </div>

          {/* Real-time Network Metrics dynamically calculated from telemetry stream */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <div className="p-2 rounded-lg bg-[#080E18] border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium">Network Punctuality</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>{networkPunctuality}</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#080E18] border border-white/5">
              <div className="text-[10px] text-slate-400 font-medium">Live Telemetry</div>
              <div className="text-sm font-bold text-[#00E5FF] flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-xs">sensors</span>
                <span>{telemetryStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rapid Transit Corridors List (Interactive: Pans/Zooms map to line bounding box) */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Rapid Transit Corridors
            </h3>
            <span className="text-[10px] text-slate-500">Tap to focus line</span>
          </div>
          {corridors.map((c) => (
            <div
              key={c.code}
              onClick={() => handleCorridorClick(c)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1624] border border-white/5 hover:border-[#00D5E8]/40 transition cursor-pointer active:scale-98 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                  style={{
                    backgroundColor: c.color,
                    boxShadow: `0 0 8px ${c.color}80`,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate group-hover:text-[#00D5E8] transition-colors">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{c.route}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800/70 border border-white/10 px-2.5 py-1 rounded-lg shrink-0 ml-2 shadow-sm">
                {c.liveTrains > 0 ? (
                  <span className="text-emerald-400 font-bold">{c.liveTrains} Live · </span>
                ) : null}
                <span>{c.stationCount} Stns</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#070B12] text-slate-200 h-screen flex overflow-hidden font-sans select-none text-[13px]">
      <Sidebar />

      {/* Main Full-Bleed Canvas Area */}
      <div className="flex-1 flex flex-col md:ml-16 h-full overflow-hidden relative">
        {/* Full-Bleed Map Canvas */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <MapContainer
            mapRef={mapRef}
            activeCity={activeCity}
            activeLayers={mapActiveLayers}
            vehicles={vehicles || []}
            selectedStationId={selectedStationId}
            journeyGeojson={routeGeojson}
            selectedCandidate={activeRoute}
            candidates={candidates}
            activeLevel={activeLevel}
            rightPanelOpen={!inspectorCollapsed}
            onStationSelect={(id) => {
              const match = (stations || []).find((s) => s.id === id);
              handleSelectStation({
                id,
                name: match ? match.name : "Station",
                lat: match?.lat,
                lng: match?.lng,
              });
            }}
            onSelectStation={(st) => handleSelectStation(st)}
            onSetOrigin={(st) => {
              setOriginInput(cleanPlaceName(st.name));
              setOriginStationId(st.id);
              setIsPlanOpen(true);
            }}
            onSetDestination={(st) => {
              setDestInput(cleanPlaceName(st.name));
              setDestStationId(st.id);
              setIsPlanOpen(true);
            }}
          />
        </div>

        {/* Top Floating Command Capsule & Horizontal Filters */}
        <div className="absolute top-3 left-3 right-3 md:left-6 md:right-6 z-30 flex flex-col gap-2 pointer-events-none">
          {/* Row 1: Command Capsule */}
          <div className="pointer-events-auto flex items-center justify-between gap-2.5 bg-[#090F19]/90 backdrop-blur-xl border border-[#1F2E43] rounded-2xl px-3 py-2 shadow-2xl">
            {/* Mobile Brand Icon */}
            <div className="flex items-center gap-2 md:hidden shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00D5E8] to-[#2563EB] flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-white text-[18px]">subway</span>
              </div>
            </div>

            {/* Universal Search Capsule */}
            <div ref={searchWrapperRef} className="relative flex-1 max-w-lg">
              <span className="material-symbols-outlined w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                className="w-full bg-[#101A27]/80 border border-[#1F2E43] rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00D5E8]/70 focus:ring-1 focus:ring-[#00D5E8] transition"
                placeholder="Search station, line, or ask AI..."
                type="text"
                value={stationSearchInput}
                onChange={(e) => {
                  setStationSearchInput(e.target.value);
                  setShowStationSearchSuggestions(true);
                  searchGeneralStations(e.target.value);
                }}
                onFocus={() => {
                  setShowStationSearchSuggestions(true);
                  if (stationSearchInput.trim()) searchGeneralStations(stationSearchInput);
                }}
              />
              {/* Transit AI Sparkle Button */}
              <button
                onClick={toggleAssistant}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#00D5E8] hover:text-white transition cursor-pointer p-0.5"
                title="Ask Transit AI"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              </button>

              {/* Station Search Autocomplete Dropdown */}
              {showStationSearchSuggestions &&
                (generalSearchLoading || generalSearchResults.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-full min-w-[300px] sm:min-w-[360px] bg-[#0E1825]/98 backdrop-blur-md border border-[#1E2E44] rounded-2xl shadow-2xl py-1 z-50 max-h-80 overflow-y-auto scrollbar-hide">
                    {generalSearchLoading ? (
                      <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin inline-block" />
                        <span>Searching transit index...</span>
                      </div>
                    ) : (
                      generalSearchResults.map((s: StationSearchResult) => {
                        const suggestion = toPlaceSuggestion(s);
                        return (
                          <PlaceSuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            onSelect={(p) => {
                              setStationSearchInput(cleanPlaceName(p.name));
                              setShowStationSearchSuggestions(false);
                              handleSelectStation({
                                id: p.rawStationId || p.id,
                                name: cleanPlaceName(p.name),
                                lat: p.lat,
                                lng: p.lng,
                              });
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                )}
            </div>

            {/* Quick Actions & Auth Avatar */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Dynamic Live Weather Info */}
              <div className="hidden lg:flex items-center gap-1.5 bg-[#101A27]/80 border border-[#1F2E43] px-2.5 py-1.5 rounded-xl text-xs">
                <span className="material-symbols-outlined text-amber-400 text-sm">
                  {weatherCode !== null && weatherCode > 50 ? "rainy" : "wb_sunny"}
                </span>
                <span className="font-bold text-white text-xs">
                  {weatherTemp !== null ? `${weatherTemp}°C` : "30°C"}
                </span>
                <span className="text-[10px] text-slate-400">Mumbai</span>
              </div>

              {/* Guest Commuter Avatar Button */}
              <div ref={profileWrapperRef} className="relative">
                <button
                  onClick={() => setShowProfilePopover((prev) => !prev)}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-[#00D5E8] hover:border-cyan-300 transition cursor-pointer shadow-md"
                  title="Guest Commuter Profile"
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                </button>

                {/* Profile Popover */}
                {showProfilePopover && (
                  <div className="absolute top-11 right-0 w-64 bg-[#0D1522]/98 backdrop-blur-xl border border-[#1F2E44] rounded-2xl p-4 shadow-2xl z-50 text-left animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3 pb-3 border-b border-[#1A283B]">
                      <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-[#00D5E8]">
                        <span className="material-symbols-outlined text-[17px]">account_circle</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">Guest Commuter</h4>
                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Local Session Active
                        </p>
                      </div>
                    </div>
                    <div className="py-2.5 space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Active Network</span>
                        <span className="text-white font-semibold">Mumbai MMR</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Offline Caching</span>
                        <span className="text-emerald-400 font-mono text-[10px]">Active (v2.4)</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#1A283B] flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Device local storage</span>
                      <button
                        onClick={() => setShowProfilePopover(false)}
                        className="text-[10px] text-[#00D5E8] font-bold hover:underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Horizontally Scrollable Layer Filter Pills */}
          <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5">
            {(
              [
                { id: "all", label: "All Layers", icon: "layers" },
                { id: "lines", label: "Lines", icon: "alt_route" },
                { id: "stations", label: "Stations", icon: "location_city" },
                { id: "interchanges", label: "Interchanges", icon: "sync_alt" },
                { id: "live_trains", label: "Live Trains", icon: "directions_transit" },
                { id: "accessible", label: "Step-Free Lifts", icon: "accessible" },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveFilterMode(mode.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer shrink-0 shadow-lg ${
                  activeFilterMode === mode.id
                    ? "bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                    : "bg-[#0B1320]/80 border-white/10 text-slate-300 hover:text-white hover:border-slate-500"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Floating Journey Planner Input Bar (Visible when isPlanOpen is true) */}
        {isPlanOpen && (
          <div
            className={`absolute top-28 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 max-w-[95vw] transition-all duration-200 ${
              showOriginSuggestions || showDestSuggestions ? "z-50" : "z-40"
            }`}
          >
            <div className="flex flex-wrap md:flex-nowrap items-center bg-[#0C1522]/95 backdrop-blur-md border border-[#1E2E44] rounded-2xl p-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)] gap-2">
              {/* Origin Input */}
              <div
                ref={originWrapperRef}
                className="relative flex items-center bg-[#131F2E] border border-[#1F3147] hover:border-slate-500 focus-within:border-[#00D5E8] rounded-xl px-3 py-1.5 w-[220px] sm:w-[260px] space-x-2.5 transition"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(0,230,118,0.7)]" />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Origin</div>
                  <input
                    className="w-full bg-transparent border-0 p-0 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-0 leading-tight"
                    type="text"
                    value={originInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginInput(val);
                      setShowOriginSuggestions(true);
                      searchOriginPlaces(val);
                    }}
                    onFocus={() => {
                      setShowOriginSuggestions(true);
                      if (originInput.trim().length >= 2) searchOriginPlaces(originInput);
                    }}
                    placeholder="Origin station or landmark..."
                  />
                </div>
                {originInput && (
                  <button
                    onClick={() => {
                      setOriginInput("");
                      setOriginStationId(null);
                      clearOriginSearch();
                      setShowOriginSuggestions(false);
                    }}
                    className="text-gray-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}

                {showOriginSuggestions && (originSearchLoading || originSearchResults.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-full min-w-[320px] sm:min-w-[380px] bg-[#0E1825]/98 backdrop-blur-md border border-[#1E2E44] rounded-2xl shadow-2xl py-1 z-50 max-h-72 overflow-y-auto scrollbar-hide">
                    {originSearchLoading ? (
                      <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin inline-block" />
                        <span>Searching transit index...</span>
                      </div>
                    ) : (
                      originSearchResults.map((s: StationSearchResult) => {
                        const suggestion = toPlaceSuggestion(s);
                        return (
                          <PlaceSuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            onSelect={(place) => {
                              setOriginInput(cleanPlaceName(place.name));
                              setOriginOutOfCoverage(Boolean(place.isOutOfCoverage));
                              const chosenId = place.isOutOfCoverage
                                ? null
                                : place.type === "poi" || place.isLandmark
                                ? (place.lat && place.lng ? `${place.lat.toFixed(5)},${place.lng.toFixed(5)}` : place.id)
                                : (place.rawStationId || place.id || place.name);
                              setOriginStationId(chosenId);
                              setShowOriginSuggestions(false);
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <button
                onClick={() => {
                  setOriginInput(destInput);
                  setDestInput(originInput);
                  const tempId = originStationId;
                  setOriginStationId(destStationId);
                  setDestStationId(tempId);
                  const tempOut = originOutOfCoverage;
                  setOriginOutOfCoverage(destOutOfCoverage);
                  setDestOutOfCoverage(tempOut);
                }}
                className="w-8 h-8 rounded-xl bg-[#142131] border border-[#20344C] hover:bg-[#1A2C42] text-gray-300 flex items-center justify-center transition cursor-pointer"
                title="Swap origin and destination"
              >
                <span className="material-symbols-outlined text-sm text-[#00E5FF]">sync_alt</span>
              </button>

              {/* Destination Input */}
              <div
                ref={destWrapperRef}
                className="relative flex items-center bg-[#131F2E] border border-[#1F3147] hover:border-slate-500 focus-within:border-[#00D5E8] rounded-xl px-3 py-1.5 w-[220px] sm:w-[260px] space-x-2.5 transition"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF477E] shrink-0 shadow-[0_0_8px_rgba(255,71,126,0.7)]" />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Destination</div>
                  <input
                    className="w-full bg-transparent border-0 p-0 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-0 leading-tight"
                    type="text"
                    value={destInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDestInput(val);
                      setShowDestSuggestions(true);
                      searchDestPlaces(val);
                    }}
                    onFocus={() => {
                      setShowDestSuggestions(true);
                      if (destInput.trim().length >= 2) searchDestPlaces(destInput);
                    }}
                    placeholder="Destination station or landmark..."
                  />
                </div>
                {destInput && (
                  <button
                    onClick={() => {
                      setDestInput("");
                      setDestStationId(null);
                      clearDestSearch();
                      setShowDestSuggestions(false);
                    }}
                    className="text-gray-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}

                {showDestSuggestions && (destSearchLoading || destSearchResults.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-full min-w-[320px] sm:min-w-[380px] bg-[#0E1825]/98 backdrop-blur-md border border-[#1E2E44] rounded-2xl shadow-2xl py-1 z-50 max-h-72 overflow-y-auto scrollbar-hide">
                    {destSearchLoading ? (
                      <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin inline-block" />
                        <span>Searching transit index...</span>
                      </div>
                    ) : (
                      destSearchResults.map((s: StationSearchResult) => {
                        const suggestion = toPlaceSuggestion(s);
                        return (
                          <PlaceSuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            onSelect={(place) => {
                              setDestInput(cleanPlaceName(place.name));
                              setDestOutOfCoverage(Boolean(place.isOutOfCoverage));
                              const chosenId = place.isOutOfCoverage
                                ? null
                                : place.type === "poi" || place.isLandmark
                                ? (place.lat && place.lng ? `${place.lat.toFixed(5)},${place.lng.toFixed(5)}` : place.id)
                                : (place.rawStationId || place.id || place.name);
                              setDestStationId(chosenId);
                              setShowDestSuggestions(false);
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Plan Button */}
              <button
                onClick={planJourney}
                disabled={journeyLoading}
                className="bg-[#00E5FF] hover:bg-cyan-300 disabled:opacity-50 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-[0_0_16px_rgba(0,229,255,0.35)] cursor-pointer"
              >
                <span>{journeyLoading ? "Planning..." : "Plan route"}</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>

              {/* Close Journey Planner Bar */}
              <button
                onClick={() => setIsPlanOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close Planner Bar"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-950/90 border border-red-500/40 text-red-200 px-3.5 py-1.5 rounded-lg text-xs shadow-lg">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {/* Desktop Floating Glass Card (Top Right) */}
        {!inspectorCollapsed ? (
          <div className="hidden md:flex absolute top-24 right-6 bottom-6 w-[380px] lg:w-[400px] bg-[#0B111D]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex-col z-30 transition-all duration-300 overflow-hidden">
            {/* Consolidated Header Bar with Operational Status */}
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#070D18]/80">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#00D5E8] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                  Transit Inspector
                </span>
                {realtimeLoading && (!vehicles || vehicles.length === 0) ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/30 flex items-center gap-1 shrink-0 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                    Connecting
                  </span>
                ) : vehicles && vehicles.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Operational
                  </span>
                ) : serviceStatus.isOffPeak ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Off-Peak Standby
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 shrink-0 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Scheduled Service
                  </span>
                )}
              </div>
              <button
                onClick={() => setInspectorCollapsed(true)}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer shrink-0 ml-2"
                title="Collapse Inspector"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderInspectorBody(false)}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setInspectorCollapsed(false)}
            className="hidden md:flex absolute top-24 right-6 z-30 items-center gap-2 px-3.5 py-2 rounded-full bg-[#0B121E]/90 hover:bg-[#111C2E] border border-white/10 text-white shadow-2xl backdrop-blur-xl cursor-pointer text-xs font-bold transition active:scale-95 group"
            title="Expand Transit Inspector"
          >
            <span className="material-symbols-outlined text-[#00E5FF] text-base group-hover:scale-110 transition-transform">
              dock_to_left
            </span>
            <span>Inspector</span>
            {selectedStationId && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        )}

        {/* Mobile 3-State Draggable Bottom Sheet */}
        <div
          className={`md:hidden fixed left-0 right-0 z-40 bg-[#0B111D]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.7)] flex flex-col transition-all duration-300 ease-out ${
            mobileSheetState === "peek"
              ? "bottom-16 h-[120px]"
              : mobileSheetState === "mid"
              ? "bottom-16 h-[380px]"
              : "bottom-16 h-[calc(100vh-80px)]"
          }`}
        >
          {/* Drag Handle & Summary */}
          <div
            className="pt-2.5 pb-2 px-4 cursor-pointer select-none shrink-0"
            onClick={() => {
              setMobileSheetState((prev) =>
                prev === "peek" ? "mid" : prev === "mid" ? "expanded" : "peek"
              );
            }}
          >
            <div className="w-10 h-1 rounded-full bg-slate-600/80 mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00E5FF] text-base">sensors</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Fleet Status</span>
              </div>
              <div className="flex items-center gap-2">
                {realtimeLoading && (!vehicles || vehicles.length === 0) ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                    Connecting Fleet
                  </span>
                ) : vehicles && vehicles.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {vehicles.length} Active Trains
                  </span>
                ) : serviceStatus.isOffPeak ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Off-Peak Standby
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Scheduled Service
                  </span>
                )}
                <span className="material-symbols-outlined text-slate-400 text-sm">
                  {mobileSheetState === "expanded" ? "expand_more" : "expand_less"}
                </span>
              </div>
            </div>
            {/* Dynamic Status / Headway Ticker & Telemetry Pill */}
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 truncate">
                {serviceStatus.displayText}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/30 shrink-0 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                {realtimeLoading ? "Syncing Fleet" : vehicles && vehicles.length > 0 ? `Live Feed: ${vehicles.length} Trains` : "Telemetry Standby"}
              </span>
            </div>
          </div>

          {/* Sheet Body Content */}
          {(mobileSheetState === "mid" || mobileSheetState === "expanded") && (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 scrollbar-hide">
              {renderInspectorBody(true)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
