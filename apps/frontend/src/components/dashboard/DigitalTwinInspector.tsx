import { useEffect, useState } from "react";
import { MapPin, ShieldAlert, Sparkles, Navigation } from "lucide-react";

type LineInfo = {
  id: string;
  code: string;
  name: string;
  color?: string;
};

type LevelInfo = {
  id: string;
  name: string;
  levelNumber: number;
  type: string;
  description?: string;
};

type EntranceInfo = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  parking?: boolean;
  lift?: boolean;
  escalator?: boolean;
  accessible?: boolean;
  openingTime?: string;
  closingTime?: string;
};

type PlatformInfo = {
  id: string;
  levelId: string;
  lineId: string;
  platformNumber: string;
  length?: number;
  screenDoors?: boolean;
  wheelchairBoarding?: boolean;
  status: string;
  line?: LineInfo;
  towardsStation?: { id: string; name: string; code: string };
};

type AmenityInfo = {
  id: string;
  levelId: string;
  type: string;
  name: string;
  status: string;
  latitude?: number;
  longitude?: number;
};

type OutletInfo = {
  id: string;
  commercialSpaceId: string;
  brand: string;
  category: string;
  openingTime?: string;
  closingTime?: string;
  averageVisitTime?: number;
  rating?: number;
};

type SpaceInfo = {
  id: string;
  levelId: string;
  unitNumber: string;
  area?: number;
  status: string;
  latitude?: number;
  longitude?: number;
};

type DigitalTwinPayload = {
  metadata: { generatedAt: string; version: string };
  station: {
    id: string;
    systemId: string;
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    address?: string;
    city: string;
    state?: string;
    country: string;
    wheelchairAccessible: boolean;
    parking: boolean;
    bikeParking: boolean;
    lines?: LineInfo[];
  };
  physical: { levels: LevelInfo[]; platforms: PlatformInfo[]; entrances: EntranceInfo[] };
  services: { amenities: AmenityInfo[]; commercial: { spaces: SpaceInfo[]; outlets: OutletInfo[] } };
  operational: { crowding: Record<string, unknown> | null; status: string; lastUpdated: string | null };
};

type DigitalTwinInspectorProps = {
  stationId: string;
  onClose: () => void;
  onTrackEntrance: (lat: number, lon: number, name: string) => void;
};

export default function DigitalTwinInspector({
  stationId,
  onClose,
  onTrackEntrance,
}: DigitalTwinInspectorProps) {
  const [data, setData] = useState<DigitalTwinPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let active = true;
    const fetchTwin = async () => {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/stations/${stationId}/digital-twin?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to load digital twin data");
        const twinData = await response.json();
        if (active) {
          setData(twinData as DigitalTwinPayload);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void fetchTwin();
    return () => {
      active = false;
    };
  }, [stationId]);

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-800 w-3/4 rounded-lg" />
        <div className="h-4 bg-zinc-800 w-1/2 rounded" />
        <div className="h-10 bg-zinc-800 rounded-xl" />
        <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 p-6 space-y-4">
          <div className="h-20 bg-zinc-800 rounded-xl" />
          <div className="h-20 bg-zinc-800 rounded-xl" />
          <div className="h-20 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-3" />
        <p className="font-semibold text-zinc-200 mb-1">Failed to load twin</p>
        <p className="text-xs text-zinc-500">Verify the backend container is running and populated.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-semibold text-zinc-200 transition">
          Close Inspector
        </button>
      </div>
    );
  }

  const { station, physical, services, operational } = data;

  const tabs = [
    { id: "overview", name: "Overview" },
    { id: "platforms", name: "Platforms" },
    { id: "entrances", name: "Entrances" },
    { id: "accessibility", name: "Accessibility" },
    { id: "amenities", name: "Amenities" },
    { id: "commercial", name: "Commercial" },
    { id: "analytics", name: "Analytics" },
  ];

  return (
    <div className="w-full flex-1 flex flex-col h-full overflow-hidden text-[#f4f4f5] font-sans">
      
      {/* Station Title Header */}
      <div className="px-6 py-5 border-b border-zinc-800">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest text-sky-400 uppercase bg-sky-950/40 border border-sky-900/60 px-2 py-0.5 rounded">
                Twin Active
              </span>
              <span className="text-zinc-500 text-xs font-mono">{station.code}</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mt-1">{station.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center">
              <MapPin className="h-3.5 w-3.5 text-zinc-500 mr-1" />
              {station.city || "Unknown City"}, {station.country || "India"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition text-xs font-semibold border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg bg-zinc-900/20"
          >
            Close
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="px-4 border-b border-zinc-850 bg-zinc-950/20 overflow-x-auto flex scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Lines Served</h3>
              <div className="flex flex-wrap gap-2">
                {station.lines && station.lines.length > 0 ? (
                  station.lines.map((l) => (
                    <span
                      key={l.code}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-sm"
                      style={{ backgroundColor: l.color || "#71717a" }}
                    >
                      🚇 {l.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No serving lines found</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Operational State</span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
                  {operational.status}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Levels Count</span>
                <span className="text-lg font-bold text-zinc-200">{physical.levels?.length || 0} Levels</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Geo Information</h3>
              <div className="rounded-xl border border-zinc-850 p-4 space-y-2.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Coordinates:</span>
                  <span>
                    {station.longitude != null ? station.longitude.toFixed(6) : "—"} E,{" "}
                    {station.latitude != null ? station.latitude.toFixed(6) : "—"} N
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Timezone:</span>
                  <span>{station.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">State / Region:</span>
                  <span>{station.state || "-"}</span>
                </div>
                {station.address && (
                  <div className="flex justify-between pt-2 border-t border-zinc-850">
                    <span className="text-zinc-500">Address:</span>
                    <span className="text-right max-w-[180px]">{station.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Platforms */}
        {activeTab === "platforms" && (
          <div className="space-y-4">
            {physical.platforms.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No platform records available.</p>
            ) : (
              physical.platforms.map((p) => (
                <div key={p.id} className="p-4 rounded-xl bg-zinc-950/20 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-extrabold text-zinc-100">Platform {p.platformNumber}</span>
                      <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    </div>
                    {p.towardsStation && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Towards: <span className="text-zinc-200 font-medium">{p.towardsStation.name}</span>
                      </p>
                    )}
                  </div>
                  {p.line && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: p.line.color }}
                    >
                      {p.line.code}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Entrances */}
        {activeTab === "entrances" && (
          <div className="space-y-4">
            {physical.entrances.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No entrance gates mapped.</p>
            ) : (
              physical.entrances.map((e) => (
                <div key={e.id} className="p-4 rounded-xl bg-zinc-950/20 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-200">{e.name}</span>
                    <div className="flex space-x-2 mt-1.5">
                      {e.lift && <span className="text-[9px] bg-zinc-800 text-sky-400 px-1.5 py-0.5 rounded font-bold uppercase">Lift</span>}
                      {e.escalator && <span className="text-[9px] bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Escalator</span>}
                      {e.accessible && <span className="text-[9px] bg-zinc-800 text-violet-400 px-1.5 py-0.5 rounded font-bold uppercase">ADA</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onTrackEntrance(e.latitude, e.longitude, e.name)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-400 transition hover:scale-105"
                    title="Focus on Map"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Accessibility */}
        {activeTab === "accessibility" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-zinc-200 font-bold">Wheelchair Boarding</span>
                <p className="text-xs text-zinc-500 mt-0.5">Complies with national accessibility standards.</p>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                station.wheelchairAccessible ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800" : "bg-zinc-950 text-zinc-500 border border-zinc-850"
              }`}>
                {station.wheelchairAccessible ? "YES" : "NO"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Entrance Gates Access</h4>
              <div className="space-y-2.5">
                {physical.entrances.map((e) => (
                  <div key={e.id} className="flex justify-between text-xs text-zinc-300">
                    <span>{e.name}</span>
                    <span className={e.accessible ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                      {e.accessible ? "Step-free Access" : "Stairs Only"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Amenities */}
        {activeTab === "amenities" && (
          <div className="space-y-3">
            {services.amenities.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No public amenities mapped.</p>
            ) : (
              services.amenities.map((a) => (
                <div key={a.id} className="p-4 rounded-xl bg-zinc-950/20 border border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-200">{a.name}</span>
                    <p className="text-xs text-zinc-500 mt-0.5">Type: {a.type}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-zinc-800 text-sky-400 px-2 py-0.5 rounded">
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 6: Commercial */}
        {activeTab === "commercial" && (
          <div className="space-y-6">
            
            {/* Outlets */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Retail & F&B Outlets</h4>
              {services.commercial.outlets.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4 bg-zinc-950/10 rounded-xl border border-zinc-850">
                  No retail stores mapped.
                </p>
              ) : (
                services.commercial.outlets.map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-zinc-950/20 border border-zinc-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-zinc-200">{o.brand}</span>
                      <p className="text-xs text-zinc-500 mt-0.5">Category: {o.category}</p>
                    </div>
                    {o.rating && (
                      <span className="text-xs font-bold text-amber-400 flex items-center">
                        ⭐ {o.rating}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Spaces */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Commercial Spaces</h4>
              {services.commercial.spaces.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4 bg-zinc-950/10 rounded-xl border border-zinc-850">
                  No leasing spaces mapped.
                </p>
              ) : (
                services.commercial.spaces.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-zinc-950/20 border border-zinc-800 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-zinc-200">Space Unit {s.unitNumber}</span>
                      {s.area && <p className="text-xs text-zinc-500 mt-0.5">Area: {s.area} sq ft</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.status === "VACANT" ? "bg-emerald-950/60 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* Tab 7: Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-4 py-4 text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-zinc-800/40 text-sky-400 mb-2 border border-zinc-700/50">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200">Real-time Telemetry Offline</h4>
            <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
              Dwell time forecast, crowd analytics, and live train sync indicators are currently offline.
            </p>
            <div className="rounded-xl border border-zinc-850 bg-zinc-950/20 p-4 text-[10px] text-zinc-600 font-mono mt-4 text-left space-y-1">
              <div>Telemetry Status: DISABLED</div>
              <div>Connection Reason: TELEMETRY_NOT_CONFIGURED</div>
              <div>Available Sprints: Sprint 6 (Realtime) & Sprint 7 (Analytics)</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
