"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "../../components/Sidebar";
import MapContainer from "../../components/map/MapContainer";
import { RouteOption } from "../../containers/JourneyPlannerContainer";
import { useCityContext } from "../../contexts/CityContext";
import { useStations } from "../../hooks/useStations";
import { useAssistantUi } from "../../contexts/AssistantUiContext";
import { ApiClient } from "../../services/api/client";
import { StationApi, StationSearchResult, toPlaceSuggestion } from "../../services/api/station.api";
import { useStationsSearch } from "../../hooks/useStationsSearch";
import { formatLineName } from "../../utils/transitFormatter";
import { JourneyDetailsTimeline } from "../../components/ui/JourneyPlannerView";
import { PlaceSuggestion } from "../../models/search";
import { PlaceSuggestionItem } from "../../components/PlaceSuggestionItem";

function JourneyPlannerContent() {
  const { activeCity } = useCityContext();
  const { toggleAssistant } = useAssistantUi();
  const { data: stations } = useStations(activeCity);
  const searchParams = useSearchParams();

  // Input states
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [originStationId, setOriginStationId] = useState<string | null>(null);
  const [destStationId, setDestStationId] = useState<string | null>(null);
  const [originOutOfCoverage, setOriginOutOfCoverage] = useState(false);
  const [destOutOfCoverage, setDestOutOfCoverage] = useState(false);

  // Time & Backend routing parameters
  const [departureMode, setDepartureMode] = useState<"now" | "depart_at">("now");
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const d = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffsetMs);
    const hrs = String(istDate.getUTCHours()).padStart(2, "0");
    const mins = String(istDate.getUTCMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  });
  const [safetyBufferMins, setSafetyBufferMins] = useState<number>(3);
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(false);
  const [showTimeMenu, setShowTimeMenu] = useState<boolean>(false);

  // Candidate routes and map selection state
  const [candidates, setCandidates] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number>(0);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [routeGeojson, setRouteGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mobile drawer state
  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "expanded">("peek");

  // Autocomplete dropdown visibility
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Live weather
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

  // Geocoding and places search hooks
  const {
    results: originSearchResults,
    loading: originSearchLoading,
    search: searchOriginPlaces,
    clear: clearOriginSearch,
  } = useStationsSearch("mumbai");

  const {
    results: destSearchResults,
    loading: destSearchLoading,
    search: searchDestPlaces,
    clear: clearDestSearch,
  } = useStationsSearch("mumbai");

  const originWrapperRef = useRef<HTMLDivElement>(null);
  const destWrapperRef = useRef<HTMLDivElement>(null);
  const timeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originWrapperRef.current && !originWrapperRef.current.contains(event.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destWrapperRef.current && !destWrapperRef.current.contains(event.target as Node)) {
        setShowDestSuggestions(false);
      }
      if (timeMenuRef.current && !timeMenuRef.current.contains(event.target as Node)) {
        setShowTimeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanPlaceName = (name: string) =>
    name
      .replace(/\s*\(Landmark\)/gi, "")
      .replace(/\s*\((?:Nearest Metro:\s*[^·)]+(?:·\s*~?\d+m?)?|Direct FOB to [^)]+|Direct FOB[^)]*|Outside Mumbai Metro Coverage[^)]*)\)/gi, "")
      .trim();

  // Place selection handlers prioritizing underlying station ID
  const handleSelectOrigin = (place: PlaceSuggestion) => {
    setOriginInput(cleanPlaceName(place.name));
    setOriginOutOfCoverage(Boolean(place.isOutOfCoverage));
    setOriginStationId(
      place.isOutOfCoverage
        ? null
        : (place.rawStationId || place.nearestStation?.id || place.id || place.name)
    );
    setShowOriginSuggestions(false);
  };

  const handleSelectDest = (place: PlaceSuggestion) => {
    setDestInput(cleanPlaceName(place.name));
    setDestOutOfCoverage(Boolean(place.isOutOfCoverage));
    setDestStationId(
      place.isOutOfCoverage
        ? null
        : (place.rawStationId || place.nearestStation?.id || place.id || place.name)
    );
    setShowDestSuggestions(false);
  };

  // Swap Locations Handler
  const handleSwap = () => {
    setOriginInput(destInput);
    setDestInput(originInput);
    const tempId = originStationId;
    setOriginStationId(destStationId);
    setDestStationId(tempId);
    const tempOut = originOutOfCoverage;
    setOriginOutOfCoverage(destOutOfCoverage);
    setDestOutOfCoverage(tempOut);
  };

  // Plan Journey Engine
  const planJourney = useCallback(async () => {
    if (!originInput.trim() || !destInput.trim()) {
      setErrorMsg("Please enter both origin and destination");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    let isOrigOut = originOutOfCoverage;
    let isDestOut = destOutOfCoverage;

    // Resolve Origin Station ID
    let finalOrigId = originStationId;
    if (!finalOrigId && stations && !isOrigOut) {
      const match = stations.find((s) => s.name.toLowerCase() === originInput.trim().toLowerCase());
      if (match) {
        finalOrigId = match.id;
      } else {
        const searchRes = await StationApi.searchStations(originInput.trim(), "mumbai");
        if (searchRes.success && searchRes.data.length > 0) {
          const first = searchRes.data[0];
          if (first.isOutOfCoverage) {
            isOrigOut = true;
          } else {
            finalOrigId = first.stationId || first.nearestStation?.id || first.id;
          }
        }
      }
    }

    // Resolve Destination Station ID
    let finalDestId = destStationId;
    if (!finalDestId && stations && !isDestOut) {
      const match = stations.find((s) => s.name.toLowerCase() === destInput.trim().toLowerCase());
      if (match) {
        finalDestId = match.id;
      } else {
        const searchRes = await StationApi.searchStations(destInput.trim(), "mumbai");
        if (searchRes.success && searchRes.data.length > 0) {
          const first = searchRes.data[0];
          if (first.isOutOfCoverage) {
            isDestOut = true;
          } else {
            finalDestId = first.stationId || first.nearestStation?.id || first.id;
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
      setErrorMsg(
        `${outLoc} currently outside active Mumbai Metro coverage. Transit routing will become available once regional networks are integrated.`
      );
      setLoading(false);
      return;
    }

    if (!finalOrigId || !finalDestId) {
      setErrorMsg("Please select valid origin and destination stations or landmarks within metro coverage.");
      setLoading(false);
      return;
    }

    if (finalOrigId === finalDestId) {
      setErrorMsg("Origin and destination must be different stations.");
      setLoading(false);
      return;
    }

    try {
      let queryUrl = `/journeys?from=${encodeURIComponent(finalOrigId)}&to=${encodeURIComponent(finalDestId)}&systemId=mumbai&safetyBufferMins=${safetyBufferMins}`;
      if (departureMode === "depart_at" && departureTime) {
        queryUrl += `&departureTime=${encodeURIComponent(departureTime)}`;
      }
      if (accessibleOnly) {
        queryUrl += `&mobility=REDUCED&options[wheelchair]=true`;
      }

      const res = await ApiClient.get<{
        candidates?: any[];
        geojson?: GeoJSON.FeatureCollection;
      }>(queryUrl);

      if (res.success && res.data?.candidates && res.data.candidates.length > 0) {
        const mappedList: RouteOption[] = res.data.candidates.map((c: any, idx: number) => {
          const totalDurationMins = c.durationMinutes ?? Math.max(1, Math.round(c.durationSeconds / 60));
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
              durationMins: leg.durationMinutes ?? Math.max(1, Math.round((leg.durationSeconds ?? leg.duration ?? 180) / 60)),
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
            realtimeOccupancy: c.realtimeOccupancy,
            realtime: c.realtime,
            transferSafetyBufferSeconds: c.transferSafetyBufferSeconds,
            transferRiskLevel: c.transferRiskLevel,
            confidence: c.confidence,
            humanSummary: c.humanSummary,
          };
        });

        setCandidates(mappedList);
        setActiveRoute(mappedList[0]);
        setActiveCandidateIndex(0);
        setRouteGeojson(res.data.geojson || mappedList[0].geojson || null);
        setExpandedCandidateId(mappedList[0].id);
        setMobileSheetState("peek");
      } else {
        const err = !res.success ? res.error : undefined;
        setErrorMsg(
          err === "Request timed out"
            ? "Route calculation timed out. Please retry."
            : err || "No feasible transit route found between these locations."
        );
      }
    } catch {
      setErrorMsg("Failed to connect to journey engine");
    } finally {
      setLoading(false);
    }
  }, [
    originInput,
    destInput,
    originStationId,
    destStationId,
    stations,
    originOutOfCoverage,
    destOutOfCoverage,
    safetyBufferMins,
    departureMode,
    departureTime,
    accessibleOnly,
  ]);

  // Read URL parameters when provided
  useEffect(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const originIdParam = searchParams.get("originId");
    const destIdParam = searchParams.get("destId");

    let shouldPlan = false;

    if (fromParam) {
      setOriginInput(cleanPlaceName(fromParam));
      setOriginOutOfCoverage(false);
      shouldPlan = true;
      if (originIdParam) {
        setOriginStationId(originIdParam);
      } else if (stations) {
        const match = stations.find((s) => s.name.toLowerCase() === fromParam.toLowerCase());
        if (match) setOriginStationId(match.id);
      }
    }

    if (toParam) {
      setDestInput(cleanPlaceName(toParam));
      setDestOutOfCoverage(false);
      shouldPlan = true;
      if (destIdParam) {
        setDestStationId(destIdParam);
      } else if (stations) {
        const match = stations.find((s) => s.name.toLowerCase() === toParam.toLowerCase());
        if (match) setDestStationId(match.id);
      }
    }

    if (fromParam && toParam && shouldPlan) {
      const timer = setTimeout(() => {
        planJourney();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchParams, stations, planJourney]);

  // Candidate card renderer
  const renderCandidateCard = (cand: RouteOption, idx: number) => {
    const isSelected = idx === activeCandidateIndex;
    const isExpanded = expandedCandidateId === cand.id;

    return (
      <div
        key={cand.id}
        onClick={() => {
          setActiveCandidateIndex(idx);
          setActiveRoute(cand);
          if (cand.geojson) setRouteGeojson(cand.geojson);
        }}
        className={`bg-[#0F1926]/95 rounded-xl p-3.5 transition cursor-pointer ${
          isSelected
            ? "border-2 border-[#00E5FF] shadow-[0_0_18px_rgba(0,229,255,0.18)]"
            : "border border-[#18283C] hover:border-slate-600"
        }`}
      >
        {/* Top Row: Badge, Time, and Fare */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider ${
                isSelected
                  ? "bg-cyan-500/20 text-[#00E5FF] border border-[#00E5FF]/40"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {cand.label}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-white">{cand.duration}</span>
              <span className="text-[11px] text-gray-400">
                {cand.interchanges === 0 ? "Direct Route" : `${cand.interchanges} transfer${cand.interchanges > 1 ? "s" : ""}`} • {cand.walkDistance} walk
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-white leading-tight">{cand.fare}</div>
            {cand.smartCardFare && (
              <div className="text-[10px] text-emerald-400 font-semibold">Card: {cand.smartCardFare}</div>
            )}
          </div>
        </div>

        {/* Realtime Departure countdown if available */}
        {cand.realtime?.primaryTrain?.etaMinutes !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Departs in {cand.realtime.primaryTrain.etaMinutes} min</span>
            {cand.legs[0]?.boardingPlatform && (
              <span className="text-slate-400 ml-1">· Platform {cand.legs[0].boardingPlatform}</span>
            )}
          </div>
        )}

        {/* Leg Breakdown Summary Chips */}
        <div className="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-[#16273B] text-xs flex-wrap gap-y-1">
          {cand.legs.map((leg, legIdx) => (
            <div key={legIdx} className="flex items-center gap-1.5">
              {legIdx > 0 && <span className="text-slate-600 text-xs">→</span>}
              {leg.mode === "walk" ? (
                <div className="flex items-center gap-0.5 text-slate-300 text-[11px]">
                  <span className="material-symbols-outlined text-xs text-[#00E5FF]">directions_walk</span>
                  <span>{leg.durationMins}m</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-white font-bold text-[10px] shadow-sm"
                  style={{ backgroundColor: leg.color || "#F5A623" }}
                >
                  <span className="material-symbols-outlined text-[11px]">subway</span>
                  <span>{leg.shortLine || leg.line}</span>
                  {leg.hopCount && (
                    <span className="font-normal text-white/80 text-[9px] ml-0.5">
                      {leg.hopCount} stn{leg.hopCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Expandable Detailed Timeline Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedCandidateId(isExpanded ? null : cand.id);
          }}
          className="w-full mt-2.5 pt-2 border-t border-[#16273B] flex items-center justify-between text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer transition"
        >
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">
              {isExpanded ? "unfold_less" : "unfold_more"}
            </span>
            <span>{isExpanded ? "Hide Steps" : "View Turn-by-Turn Steps"}</span>
          </span>
          <span className="material-symbols-outlined text-base">
            {isExpanded ? "expand_less" : "expand_more"}
          </span>
        </button>

        {/* Expanded Journey Timeline View */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-[#142233] text-left">
            <JourneyDetailsTimeline
              route={cand}
              origin={originInput || cand.legs[0]?.fromStation || "Origin"}
              destination={destInput || cand.legs[cand.legs.length - 1]?.toStation || "Destination"}
            />
          </div>
        )}
      </div>
    );
  };

  // Structured Planner Input Card
  const renderInputsCard = () => (
    <div className="bg-[#0C1522]/95 backdrop-blur-xl border border-[#1E2E44] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5">
      {/* Origin & Destination stacked with vertical track */}
      <div className="relative flex flex-col gap-1.5">
        {/* Origin Input */}
        <div
          ref={originWrapperRef}
          className="relative flex items-center bg-[#131F2E] border border-[#1F3147] hover:border-slate-500 focus-within:border-[#00D5E8] rounded-xl px-3 py-1.5 space-x-2.5 transition"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          <div className="flex-1 text-left min-w-0">
            <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">From</div>
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
              placeholder="Station, landmark, street (e.g. Oberoi Mall)..."
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
              className="text-gray-400 hover:text-white text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showOriginSuggestions && (originSearchLoading || originSearchResults.length > 0) && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] sm:min-w-[380px] bg-[#0E1825]/98 backdrop-blur-md border border-[#1E2E44] rounded-2xl shadow-2xl py-1 z-50 max-h-72 overflow-y-auto scrollbar-hide">
              {originSearchLoading ? (
                <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin inline-block" />
                  <span>Searching Google Maps & transit index...</span>
                </div>
              ) : (
                originSearchResults.map((s: StationSearchResult) => {
                  const suggestion = toPlaceSuggestion(s);
                  return (
                    <PlaceSuggestionItem
                      key={suggestion.id}
                      suggestion={suggestion}
                      onSelect={handleSelectOrigin}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Swap button placed cleanly between inputs */}
        <div className="flex items-center justify-between px-2 py-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 pl-1">
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="w-1 h-1 rounded-full bg-slate-600" />
          </div>
          <button
            type="button"
            onClick={handleSwap}
            className="w-7 h-7 rounded-lg bg-[#142131] border border-[#20344C] hover:bg-[#1A2C42] text-gray-300 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm"
            title="Swap origin and destination"
          >
            <span className="material-symbols-outlined text-xs text-[#00E5FF]">sync_alt</span>
          </button>
        </div>

        {/* Destination Input */}
        <div
          ref={destWrapperRef}
          className="relative flex items-center bg-[#131F2E] border border-[#1F3147] hover:border-slate-500 focus-within:border-[#00D5E8] rounded-xl px-3 py-1.5 space-x-2.5 transition"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF477E] shrink-0 shadow-[0_0_8px_rgba(255,71,126,0.7)]" />
          <div className="flex-1 text-left min-w-0">
            <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">To</div>
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
              placeholder="Station, landmark, street (e.g. BKC, Airport)..."
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
              className="text-gray-400 hover:text-white text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showDestSuggestions && (destSearchLoading || destSearchResults.length > 0) && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] sm:min-w-[380px] bg-[#0E1825]/98 backdrop-blur-md border border-[#1E2E44] rounded-2xl shadow-2xl py-1 z-50 max-h-72 overflow-y-auto scrollbar-hide">
              {destSearchLoading ? (
                <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin inline-block" />
                  <span>Searching Google Maps & transit index...</span>
                </div>
              ) : (
                destSearchResults.map((s: StationSearchResult) => {
                  const suggestion = toPlaceSuggestion(s);
                  return (
                    <PlaceSuggestionItem
                      key={suggestion.id}
                      suggestion={suggestion}
                      onSelect={handleSelectDest}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backend Parameters Row: Time, Safety Buffer, Accessible Lifts */}
      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
        {/* Departure Time Popover */}
        <div ref={timeMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowTimeMenu((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition cursor-pointer ${
              departureMode === "depart_at"
                ? "bg-cyan-500/20 border-cyan-400/50 text-[#00E5FF]"
                : "bg-[#142131] border-[#20344C] text-slate-300 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>{departureMode === "now" ? "Leave Now" : `Depart ${departureTime}`}</span>
            <span className="material-symbols-outlined text-[10px]">arrow_drop_down</span>
          </button>

          {showTimeMenu && (
            <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#0E1825] border border-[#1E2E44] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setDepartureMode("now");
                  setShowTimeMenu(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  departureMode === "now" ? "bg-cyan-500/20 text-[#00E5FF]" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>Leave Now</span>
                {departureMode === "now" && <span className="material-symbols-outlined text-xs">check</span>}
              </button>

              <div className="border-t border-[#1C2C3F] pt-2">
                <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">Set Departure Time</div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => {
                      setDepartureTime(e.target.value);
                      setDepartureMode("depart_at");
                    }}
                    className="bg-[#142131] border border-[#20344C] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTimeMenu(false)}
                    className="px-2 py-1 rounded bg-cyan-500 text-black text-[11px] font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Safety Buffer Selector */}
        <div className="flex items-center bg-[#131F2E] border border-[#1F3147] rounded-xl p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSafetyBufferMins(3)}
            className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
              safetyBufferMins === 3
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Standard 3 min transfer safety buffer"
          >
            <span>🏃</span>
            <span>3m</span>
          </button>
          <button
            type="button"
            onClick={() => setSafetyBufferMins(5)}
            className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
              safetyBufferMins === 5
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Luggage / Relaxed 5 min transfer safety buffer"
          >
            <span>🧳</span>
            <span>5m</span>
          </button>
        </div>

        {/* Step-Free / Lifts Toggle */}
        <button
          type="button"
          onClick={() => setAccessibleOnly((v) => !v)}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition cursor-pointer ${
            accessibleOnly
              ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
              : "bg-[#142131] border-[#20344C] text-slate-400 hover:text-slate-200"
          }`}
          title="Filter for step-free accessible lift routes"
        >
          <span className="material-symbols-outlined text-[13px]">accessible</span>
          <span>Lifts</span>
        </button>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={planJourney}
        disabled={loading}
        className="w-full bg-[#00E5FF] hover:bg-cyan-300 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-[0_0_16px_rgba(0,229,255,0.35)] cursor-pointer active:scale-[0.99] mt-0.5"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin inline-block" />
            <span>Calculating corridor...</span>
          </>
        ) : (
          <>
            <span>Plan Journey</span>
            <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="bg-red-950/90 border border-red-500/40 text-red-200 px-3 py-1.5 rounded-xl text-[11px] shadow-lg leading-snug">
          {errorMsg}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-[#070B12] text-slate-200 h-screen flex overflow-hidden font-sans select-none text-[13px]">
      {/* Sidebar is uniform on all pages */}
      <Sidebar />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:ml-16 h-full overflow-hidden relative">
        {/* Top Header — Clean single-purpose header without duplicate search */}
        <header
          className="h-14 border-b border-[#1F2E43] bg-[#090F19] px-4 sm:px-6 flex items-center justify-between shrink-0 gap-4 z-30"
          data-purpose="top-header"
        >
          {/* Header Left: Return to Map & Page Identity */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-xl bg-[#101A27] hover:bg-[#162436] border border-[#1F2E43] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              title="Return to Network Map"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wider uppercase">Plan Journey</span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Point-to-point transit intelligence with corridor geometries</p>
            </div>
          </div>

          {/* Header Right: Single Weather Badge, AI Assistant, and Commuter Profile */}
          <div className="flex items-center gap-2.5">
            {/* Merged Single Weather Chip */}
            <div className="flex items-center gap-1.5 bg-[#101A27] border border-[#1F2E43] px-2.5 py-1.5 rounded-lg text-xs">
              <span className="material-symbols-outlined text-amber-400 text-sm">
                {weatherCode !== null && weatherCode > 50 ? "rainy" : "wb_sunny"}
              </span>
              <span className="font-semibold text-white">Mumbai · {weatherTemp !== null ? `${weatherTemp}°C` : "33°C"}</span>
            </div>

            {/* Transit AI Assistant */}
            <button
              onClick={toggleAssistant}
              className="hidden sm:flex items-center gap-1.5 bg-[#101A27] hover:bg-[#152335] border border-cyan-500/30 text-[#00D5E8] px-3 py-1.5 rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(0,229,255,0.15)] transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              <span>Transit AI</span>
            </button>

            {/* Commuter Profile Avatar */}
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-[#00D5E8] shadow-md"
              title="Guest Commuter Session Active"
            >
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
            </div>
          </div>
        </header>

        {/* Main Interactive Map Workspace */}
        <main className="relative flex-1 w-full overflow-hidden">
          {/* Full-bleed MapLibre Map Canvas */}
          <div className="absolute inset-0 z-0">
            <MapContainer
              activeCity="mumbai"
              activeLayers={["lines", "stations"]}
              selectedStationId={selectedStationId}
              journeyGeojson={routeGeojson}
              selectedCandidate={activeRoute}
              selectedCandidateId={activeRoute?.id || null}
              candidates={candidates}
              onStationSelect={(id) => setSelectedStationId(id)}
              onSelectStation={(st) => setSelectedStationId(st.id)}
              onSetOrigin={(st) => {
                setOriginInput(cleanPlaceName(st.name));
                setOriginStationId(st.id);
              }}
              onSetDestination={(st) => {
                setDestInput(cleanPlaceName(st.name));
                setDestStationId(st.id);
              }}
            />
          </div>

          {/* Desktop Pattern: Floating Left Dock Panel */}
          <div className="hidden md:flex absolute top-4 left-4 z-30 w-[420px] max-h-[calc(100vh-80px)] flex-col gap-3 pointer-events-none">
            {/* Structured Planning Inputs Card */}
            <div className="pointer-events-auto">
              {renderInputsCard()}
            </div>

            {/* Candidate Route Results Stack */}
            {candidates.length > 0 && (
              <div className="pointer-events-auto flex-1 overflow-y-auto scrollbar-hide space-y-2.5 bg-[#0A131F]/90 backdrop-blur-xl border border-[#18283C] rounded-2xl p-3 shadow-2xl">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#142233]">
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide uppercase">Route Candidates</h3>
                    <p className="text-[10px] text-slate-400">{candidates.length} options · Ranked by fastest transit</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-[#00E5FF] border border-cyan-500/20">
                    Buffer: {safetyBufferMins}m
                  </span>
                </div>

                {candidates.map((cand, idx) => renderCandidateCard(cand, idx))}
              </div>
            )}
          </div>

          {/* Mobile Pattern: Top Card + Bottom Sheet */}
          <div className="md:hidden absolute top-3 left-3 right-3 z-30 pointer-events-auto">
            {renderInputsCard()}
          </div>

          {/* Mobile Bottom Sheet for Route Candidates */}
          {candidates.length > 0 && activeRoute && (
            <div
              className={`md:hidden fixed left-0 right-0 z-40 bg-[#0B111D]/98 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.85)] flex flex-col transition-all duration-300 ease-out ${
                mobileSheetState === "peek" ? "bottom-0 h-[140px]" : "bottom-0 h-[75vh]"
              }`}
            >
              {/* Drag Handle & Summary Row (Tappable) */}
              <div
                className="pt-2 pb-2 px-4 cursor-pointer select-none shrink-0"
                onClick={() => setMobileSheetState((prev) => (prev === "peek" ? "expanded" : "peek"))}
              >
                <div className="w-10 h-1 rounded-full bg-slate-600/80 mx-auto mb-2" />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00E5FF] border border-[#00E5FF]/40">
                        {activeRoute.label}
                      </span>
                      <span className="text-sm font-bold text-white">{activeRoute.duration}</span>
                      <span className="text-xs text-[#00E5FF] font-bold">({activeRoute.fare})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {activeRoute.interchanges === 0 ? "Direct route" : `${activeRoute.interchanges} transfer(s)`} • Safe transfer: {safetyBufferMins}m buffer
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-cyan-400 font-bold flex items-center gap-0.5 bg-slate-800/80 px-2 py-1 rounded-lg"
                  >
                    <span>{mobileSheetState === "peek" ? "All Routes" : "Collapse"}</span>
                    <span className="material-symbols-outlined text-sm">
                      {mobileSheetState === "peek" ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Expanded Mobile Route Candidate List */}
              {mobileSheetState === "expanded" && (
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
                  {candidates.map((cand, idx) => renderCandidateCard(cand, idx))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function JourneyPlannerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#070C13]" />}>
      <JourneyPlannerContent />
    </Suspense>
  );
}
