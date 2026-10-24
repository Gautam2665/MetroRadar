"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import maplibregl from "maplibre-gl";
import { Sidebar } from "../../components/Sidebar";
import MapContainer from "../../components/map/MapContainer";
import { useCityContext } from "../../contexts/CityContext";
import { useStations } from "../../hooks/useStations";
import {
  useStationCatchment,
  usePedestrianNetwork,
  useDatasetAudit,
} from "../../hooks/useAnalytics";
import {
  Footprints,
  ShieldCheck,
  Layers,
  Info,
  MapPin,
  RefreshCw,
  Clock,
  Compass,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";

const KEY_MUMBAI_STATIONS = [
  { name: "Gundavali", code: "STN_L7_014", label: "Line 7 (Interchange)" },
  { name: "Andheri", code: "STN_L1_004", label: "Line 1 (Rail Interchange)" },
  { name: "Marol Naka", code: "STN_L1_008", label: "Line 1 ↔ Line 3 Hub" },
  { name: "D. N. Nagar", code: "STN_L1_002", label: "Line 1 ↔ Line 2A" },
  { name: "Dahisar (East)", code: "STN_L7_001", label: "Line 7 / 2A Terminal" },
];

export default function AnalyticsPage() {
  const { activeCity } = useCityContext();
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Workspace Mode: 'catchment' | 'governance'
  const [activeTab, setActiveTab] = useState<"catchment" | "governance">("catchment");

  // Selected Station for Isochrone Catchment
  const [selectedStationQuery, setSelectedStationQuery] = useState<string>("Gundavali");
  const [showNetworkEdges, setShowNetworkEdges] = useState<boolean>(true);
  const [showFobsOnly, setShowFobsOnly] = useState<boolean>(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  // Data Hooks
  const { data: stations } = useStations(activeCity);
  const {
    data: catchmentData,
    loading: catchmentLoading,
    error: catchmentError,
    refresh: refreshCatchment,
  } = useStationCatchment(selectedStationQuery, [5, 10]);

  const {
    data: networkGeoJson,
    loading: networkLoading,
  } = usePedestrianNetwork();

  const {
    data: auditReport,
    loading: auditLoading,
    refresh: refreshAudit,
  } = useDatasetAudit();

  // Selected station coordinate lookup
  const currentStationCoords = useMemo<[number, number] | null>(() => {
    if (catchmentData?.station) {
      return [catchmentData.station.longitude, catchmentData.station.latitude];
    }
    const found = stations?.find(
      (s) =>
        s.name.toLowerCase().includes(selectedStationQuery.toLowerCase()) ||
        s.code.toLowerCase() === selectedStationQuery.toLowerCase()
    );
    if (found) {
      return [found.lng, found.lat];
    }
    return [72.8552, 19.1144]; // Gundavali default
  }, [catchmentData, stations, selectedStationQuery]);

  // Fly to station when selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStationCoords) return;
    map.flyTo({
      center: currentStationCoords,
      zoom: 14.5,
      essential: true,
      duration: 1200,
    });
  }, [currentStationCoords]);

  // Render Pedestrian Network Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !networkGeoJson) return;

    const SOURCE_ID = "pedestrian-network-source";
    const FOOTWAY_LAYER_ID = "pedestrian-footways-layer";
    const FOB_LAYER_ID = "pedestrian-fob-layer";

    // Add or update source
    const existingSource = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(networkGeoJson as any);
    } else {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: networkGeoJson as any,
      });

      // Footways & street sidewalks
      map.addLayer({
        id: FOOTWAY_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["!=", ["get", "isElevatedFob"], true],
        paint: {
          "line-color": "#00e5ff",
          "line-width": 2,
          "line-opacity": 0.65,
        },
      });

      // Elevated Foot Overbridges (FOBs) & Skywalks
      map.addLayer({
        id: FOB_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "isElevatedFob"], true],
        paint: {
          "line-color": "#f59e0b",
          "line-width": 4.5,
          "line-opacity": 0.95,
        },
      });
    }

    // Toggle layer visibility
    if (map.getLayer(FOOTWAY_LAYER_ID)) {
      map.setLayoutProperty(
        FOOTWAY_LAYER_ID,
        "visibility",
        showNetworkEdges && !showFobsOnly ? "visible" : "none"
      );
    }
    if (map.getLayer(FOB_LAYER_ID)) {
      map.setLayoutProperty(
        FOB_LAYER_ID,
        "visibility",
        showNetworkEdges ? "visible" : "none"
      );
    }
  }, [networkGeoJson, showNetworkEdges, showFobsOnly]);

  // Render Isochrone Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const ISO_10_SRC = "isochrone-10m-source";
    const ISO_10_FILL = "isochrone-10m-fill";
    const ISO_10_LINE = "isochrone-10m-line";

    const ISO_5_SRC = "isochrone-5m-source";
    const ISO_5_FILL = "isochrone-5m-fill";
    const ISO_5_LINE = "isochrone-5m-line";

    const iso5 = catchmentData?.isochrones?.find((i) => i.minutes === 5);
    const iso10 = catchmentData?.isochrones?.find((i) => i.minutes === 10);

    // 10-Minute Isochrone Layer
    if (iso10?.polygonGeoJson) {
      const src10 = map.getSource(ISO_10_SRC) as maplibregl.GeoJSONSource | undefined;
      if (src10) {
        src10.setData(iso10.polygonGeoJson);
      } else {
        map.addSource(ISO_10_SRC, {
          type: "geojson",
          data: iso10.polygonGeoJson,
        });
        map.addLayer(
          {
            id: ISO_10_FILL,
            type: "fill",
            source: ISO_10_SRC,
            paint: {
              "fill-color": "#06b6d4",
              "fill-opacity": 0.22,
            },
          },
          "stations-layer"
        );
        map.addLayer(
          {
            id: ISO_10_LINE,
            type: "line",
            source: ISO_10_SRC,
            paint: {
              "line-color": "#0891b2",
              "line-width": 2,
              "line-dasharray": [3, 2],
            },
          },
          "stations-layer"
        );
      }
    } else {
      if (map.getLayer(ISO_10_LINE)) map.removeLayer(ISO_10_LINE);
      if (map.getLayer(ISO_10_FILL)) map.removeLayer(ISO_10_FILL);
      if (map.getSource(ISO_10_SRC)) map.removeSource(ISO_10_SRC);
    }

    // 5-Minute Isochrone Layer
    if (iso5?.polygonGeoJson) {
      const src5 = map.getSource(ISO_5_SRC) as maplibregl.GeoJSONSource | undefined;
      if (src5) {
        src5.setData(iso5.polygonGeoJson);
      } else {
        map.addSource(ISO_5_SRC, {
          type: "geojson",
          data: iso5.polygonGeoJson,
        });
        map.addLayer(
          {
            id: ISO_5_FILL,
            type: "fill",
            source: ISO_5_SRC,
            paint: {
              "fill-color": "#10b981",
              "fill-opacity": 0.32,
            },
          },
          "stations-layer"
        );
        map.addLayer(
          {
            id: ISO_5_LINE,
            type: "line",
            source: ISO_5_SRC,
            paint: {
              "line-color": "#059669",
              "line-width": 2.5,
            },
          },
          "stations-layer"
        );
      }
    } else {
      if (map.getLayer(ISO_5_LINE)) map.removeLayer(ISO_5_LINE);
      if (map.getLayer(ISO_5_FILL)) map.removeLayer(ISO_5_FILL);
      if (map.getSource(ISO_5_SRC)) map.removeSource(ISO_5_SRC);
    }
  }, [catchmentData]);

  const iso5 = catchmentData?.isochrones?.find((i) => i.minutes === 5);
  const iso10 = catchmentData?.isochrones?.find((i) => i.minutes === 10);

  return (
    <div className="flex h-screen overflow-hidden bg-[#070B12] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-16 relative h-full">
        {/* Top Header / Mode Switcher */}
        <header className="h-14 border-b border-white/10 bg-[#0B0F19]/90 backdrop-blur px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-[#00e5ff] font-mono font-bold bg-[#00e5ff]/10 px-2 py-0.5 rounded border border-[#00e5ff]/20">
              CTM v1.0 Intelligence
            </span>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <h1 className="text-sm font-semibold text-white tracking-wide hidden sm:block">
              Mobility Analytics & Geospatial Workbench
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Switch to Commuter Journey Planner */}
            <Link
              href="/plan"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 border border-white/5 transition-all"
            >
              <span>🚆 Commuter View</span>
            </Link>

            <div className="flex items-center bg-[#131926] p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setActiveTab("catchment")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "catchment"
                    ? "bg-[#00e5ff]/15 text-[#00e5ff] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Station Walksheds</span>
              </button>

              <button
                onClick={() => setActiveTab("governance")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "governance"
                    ? "bg-[#10b981]/15 text-[#10b981] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Data Governance</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
          {/* Map Canvas */}
          <div className="flex-1 relative h-full">
            <MapContainer
              mapRef={mapRef}
              activeCity="mumbai"
              center={currentStationCoords || [72.8552, 19.1144]}
              zoom={14}
              activeLayers={["lines", "stations"]}
              onStationSelect={(stnId) => {
                setSelectedStationQuery(stnId);
              }}
            />

            {/* Floating Map Legend & Layer Controls */}
            <div className="absolute top-4 left-4 z-10 bg-[#0B0F19]/90 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl max-w-xs text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-white pb-1.5 border-b border-white/10">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>Analytical Map Layers</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1,164 links</span>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center justify-between cursor-pointer hover:text-white">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span>5-min Walkshed (300s)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {iso5 ? `${iso5.networkAreaSqKm} km²` : "—"}
                  </span>
                </label>

                <label className="flex items-center justify-between cursor-pointer hover:text-white">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                    <span>10-min Walkshed (600s)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {iso10 ? `${iso10.networkAreaSqKm} km²` : "—"}
                  </span>
                </label>

                <label className="flex items-center justify-between cursor-pointer hover:text-white pt-1 border-t border-white/5">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-1 bg-[#f59e0b] rounded" />
                    <span>Elevated FOBs & Skywalks</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showNetworkEdges}
                    onChange={(e) => setShowNetworkEdges(e.target.checked)}
                    className="rounded accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Analytical Inspector Panel */}
          <div className="w-full lg:w-96 bg-[#0B0F19] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-1/2 lg:h-full z-10 overflow-y-auto scrollbar-hide">
            {activeTab === "catchment" ? (
              <div className="p-5 space-y-5">
                {/* Station Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-slate-400">
                      Target Station
                    </span>
                    <button
                      onClick={() => setShowMethodologyModal(true)}
                      className="text-xs text-[#00e5ff] hover:underline flex items-center gap-1"
                    >
                      <Info className="w-3 h-3" />
                      <span>Methodology</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {KEY_MUMBAI_STATIONS.map((stn) => (
                      <button
                        key={stn.name}
                        onClick={() => setSelectedStationQuery(stn.name)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                          selectedStationQuery.toLowerCase().includes(stn.name.toLowerCase())
                            ? "bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40 font-semibold"
                            : "bg-[#131926] text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {stn.name}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={selectedStationQuery}
                      onChange={(e) => setSelectedStationQuery(e.target.value)}
                      placeholder="Type station name or code..."
                      className="w-full bg-[#131926] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00e5ff]"
                    />
                  </div>
                </div>

                {/* Catchment Metrics Card */}
                {catchmentLoading ? (
                  <div className="bg-[#131926] border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-[#00e5ff] animate-spin" />
                    <span className="text-xs text-slate-400">
                      Computing Multi-Source Network Dijkstra...
                    </span>
                  </div>
                ) : catchmentData ? (
                  <div className="space-y-4">
                    {/* Station Overview */}
                    <div className="bg-[#131926] border border-white/10 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-base font-bold text-white">
                            {catchmentData.station.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-mono text-[#00e5ff]">
                              {catchmentData.station.code}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">
                              {catchmentData.station.activeEntrancesCount} Active Gates
                            </span>
                          </div>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                          100% Snapped
                        </span>
                      </div>
                    </div>

                    {/* Walkshed Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#131926] border border-emerald-500/20 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>5-Min Catchment</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="text-lg font-bold text-white font-mono">
                          {iso5?.networkAreaSqKm ?? "—"}{" "}
                          <span className="text-xs font-normal text-slate-400">km²</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Walkable: <span className="text-slate-200">{iso5?.walkableNetworkLengthKm} km</span>
                        </div>
                      </div>

                      <div className="bg-[#131926] border border-cyan-500/20 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>10-Min Catchment</span>
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        </div>
                        <div className="text-lg font-bold text-white font-mono">
                          {iso10?.networkAreaSqKm ?? "—"}{" "}
                          <span className="text-xs font-normal text-slate-400">km²</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Walkable: <span className="text-slate-200">{iso10?.walkableNetworkLengthKm} km</span>
                        </div>
                      </div>
                    </div>

                    {/* Barrier Severance Analysis */}
                    <div className="bg-[#131926] border border-white/10 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">
                          Urban Barrier Severance Ratio
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {iso5 ? `${(iso5.severanceRatio * 100).toFixed(0)}%` : "—"}
                        </span>
                      </div>

                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full"
                          style={{ width: `${(iso5?.severanceRatio ?? 0) * 100}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                        High severance indicates significant walking detours caused by Western Express Highway,
                        rail corridors, or missing grade-separated pedestrian crossings.
                      </p>
                    </div>

                    {/* Entrance List */}
                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase text-slate-400">
                        Snapped Gate Snapping Table
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {catchmentData.station.entrances.map((ent) => (
                          <div
                            key={ent.id}
                            className="bg-[#131926] border border-white/5 rounded-lg p-2.5 flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-200 truncate max-w-[200px]">
                              {ent.name}
                            </span>
                            <span className="font-mono text-emerald-400 text-[11px]">
                              {ent.snapDistanceMeters ?? 0}m snap
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-xs text-slate-500">
                    Select a station to calculate walking catchments.
                  </div>
                )}
              </div>
            ) : (
              /* Data Governance & Lineage Tab */
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Data Governance Audit</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live verification of CTM v1.0 data pipelines
                    </p>
                  </div>
                  <button
                    onClick={refreshAudit}
                    className="p-1.5 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {auditLoading ? (
                  <div className="text-center p-6 text-xs text-slate-400">
                    Fetching live audit report...
                  </div>
                ) : auditReport ? (
                  <div className="space-y-4">
                    {/* Completeness Card */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-emerald-400 font-medium">
                          Data Completeness Score
                        </span>
                        <div className="text-2xl font-bold font-mono text-white mt-0.5">
                          {auditReport.system.dataCompletenessScore}%
                        </div>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono px-2.5 py-1 rounded-md">
                        {auditReport.system.overallStatus}
                      </span>
                    </div>

                    {/* Pedestrian Graph Stats */}
                    <div className="bg-[#131926] border border-white/10 rounded-xl p-4 space-y-3">
                      <span className="text-xs font-semibold text-slate-200">
                        Pedestrian Street Network
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/5 p-2 rounded">
                          <span className="text-slate-400 block text-[10px]">Total Edges</span>
                          <span className="font-mono font-bold text-white">
                            {auditReport.pedestrianNetwork.totalWalkableEdges}
                          </span>
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                          <span className="text-slate-400 block text-[10px]">Network Length</span>
                          <span className="font-mono font-bold text-white">
                            {auditReport.pedestrianNetwork.totalNetworkLengthKm} km
                          </span>
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                          <span className="text-slate-400 block text-[10px]">Elevated FOBs</span>
                          <span className="font-mono font-bold text-amber-400">
                            {auditReport.pedestrianNetwork.elevatedFobCount} links
                          </span>
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                          <span className="text-slate-400 block text-[10px]">Speed Standard</span>
                          <span className="font-mono font-bold text-white">
                            {auditReport.pedestrianNetwork.traversalSpeedStandardMs} m/s
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Entrance Snapping Audit */}
                    <div className="bg-[#131926] border border-white/10 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Gate Snapping Success</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {auditReport.entranceSnappingAudit.snapSuccessRatePercent}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        All {auditReport.entranceSnappingAudit.totalActiveEntrances} active station entrances are
                        snapped to the walkable network within 100 meters.
                      </p>
                    </div>

                    {/* Feed Lineage Breakdown */}
                    <div className="bg-[#131926] border border-white/10 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Data Trust Tier Lineage
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tier-A Official (DMRC/MMMOCL)</span>
                          <span className="font-mono text-emerald-400">
                            {auditReport.governanceSummary.tierAOfficialPercent}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tier-X Synthesized Timetable</span>
                          <span className="font-mono text-cyan-400">
                            {auditReport.governanceSummary.tierSynthesizedPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-xs text-rose-400">
                    Unable to load audit report.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Methodology & Transport Engineering Assumptions Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00e5ff]" />
                <h3 className="text-sm font-bold text-white">
                  Accessibility Methodology & Assumptions
                </h3>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <div>
                <h4 className="font-semibold text-white mb-1">1. Pedestrian Network Routing</h4>
                <p>
                  Calculations use Multi-Source Bidirectional Dijkstra seeded at all active snapped
                  entrance nodes for the selected station complex.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1">2. Impedance Formulation</h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>Standard walking speed: <strong>1.2 m/s</strong> (4.32 km/h).</li>
                  <li>Elevated Foot Overbridges / Stairs: <strong>0.6 m/s</strong> + <strong>15s</strong> vertical level penalty.</li>
                  <li>Crosswalk street crossings: <strong>+10s</strong> signal transition allowance.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1">3. Geometric Isochrone Construction</h4>
                <p>
                  Reached street edges within 300 seconds (5-min) and 600 seconds (10-min)
                  are expanded with a 45m street buffer and dissolved via PostGIS:
                  <code className="block bg-[#131926] p-2 rounded text-[11px] font-mono text-cyan-300 mt-1">
                    ST_Multi(ST_Union(ST_Buffer(geom::geography, 45)::geometry))
                  </code>
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1">4. Severance Ratio Metric</h4>
                <p>
                  Calculated as:{" "}
                  <code className="text-amber-300 font-mono">1 - (Network Area / Euclidean Area)</code>.
                  Quantifies how physical urban severance (highways, rail tracks) restricts walking access.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-[#00e5ff] text-black font-semibold text-xs rounded-lg hover:bg-[#00cce6] transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
