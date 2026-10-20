import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { VehiclePositionService } from './vehicle-position.service';
import { GtfsRtSyncService, TripStopTimeUpdate } from './gtfs-rt-sync.service';
import {
  NormalizedVehicle,
  RealtimeFeedResponse,
} from '../interfaces/gtfs-realtime.interface';

const PROVIDER = 'OTD';
const SYSTEM_CODE = 'DMRC';

interface ShapeVertex {
  lng: number;
  lat: number;
  cumMeters: number;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  // Cache of shape polylines keyed by shapeId (or lineId fallback) to avoid repeated DB queries
  private shapeCache = new Map<string, ShapeVertex[]>();

  constructor(
    private readonly vehicleCache: VehiclePositionService,
    private readonly gtfsRtSync: GtfsRtSyncService,
    private readonly db: DatabaseService,
  ) {}

  async getVehicles(
    system = SYSTEM_CODE,
    lineFilter?: string,
  ): Promise<RealtimeFeedResponse> {
    const cached = await this.vehicleCache.getVehicles(PROVIDER, system);
    const syncedVehicles = this.gtfsRtSync.getAllActiveVehicles();

    // 1. Collect any verified GPS VehiclePosition entities first
    const mergedMap = new Map<string, NormalizedVehicle>();

    if (cached?.vehicles) {
      for (const v of cached.vehicles) {
        if (
          typeof v.latitude === 'number' &&
          typeof v.longitude === 'number' &&
          v.latitude !== 0 &&
          v.longitude !== 0
        ) {
          mergedMap.set(v.vehicleId, {
            ...v,
            isEstimated: false,
            positionSource: 'GPS',
          });
        }
      }
    }

    for (const sv of syncedVehicles) {
      if (
        typeof sv.latitude === 'number' &&
        typeof sv.longitude === 'number' &&
        sv.latitude !== 0 &&
        sv.longitude !== 0
      ) {
        mergedMap.set(sv.vehicleId, {
          vehicleId: sv.vehicleId,
          tripId: sv.tripId || null,
          routeId: sv.routeId || null,
          latitude: sv.latitude,
          longitude: sv.longitude,
          bearing: sv.bearing ?? null,
          speed: sv.speed ?? null,
          currentStopSequence: sv.currentStopSequence ?? null,
          currentStatus: sv.currentStatus || null,
          timestamp: sv.timestamp ?? null,
          headsign: sv.headsign ?? null,
          isEstimated: false,
          positionSource: 'GPS',
        });
      }
    }

    let gpsVehicles = Array.from(mergedMap.values());

    if (gpsVehicles.length > 0) {
      if (lineFilter) {
        const upper = lineFilter.toUpperCase();
        gpsVehicles = gpsVehicles.filter((v) =>
          v.routeId?.toUpperCase().includes(upper),
        );
      }
      gpsVehicles = await this.enrichVehicles(gpsVehicles);
    }

    // 2. Determine final vehicle set:
    // If live GTFS-RT feed is broadcasting active trains, use them directly without double-counting.
    // Only fall back to synthetic estimator if GTFS-RT feed has zero or fewer than 10 vehicles.
    let vehicles: NormalizedVehicle[] = [];

    if (gpsVehicles.length >= 10) {
      vehicles = gpsVehicles;
    } else {
      const estimatedVehicles =
        await this.estimateVehiclesFromTripUpdatesAndSchedule(
          system,
          lineFilter,
        );

      const gpsTripIds = new Set(
        gpsVehicles.map((v) => v.tripId).filter(Boolean),
      );
      vehicles = [
        ...gpsVehicles,
        ...estimatedVehicles.filter(
          (ev) => !ev.tripId || !gpsTripIds.has(ev.tripId),
        ),
      ];
    }

    const cachedAt = cached?.cachedAt ? new Date(cached.cachedAt) : new Date();
    const staleAgeSeconds = Math.round(
      (Date.now() - cachedAt.getTime()) / 1000,
    );

    return {
      system,
      provider:
        gpsVehicles.length > 0 ? PROVIDER : 'GTFS_RT_TRIP_UPDATES_ESTIMATOR',
      generatedAt: new Date().toISOString(),
      cachedAt: cached?.cachedAt ?? new Date().toISOString(),
      isStale: staleAgeSeconds > 120,
      staleAgeSeconds,
      vehicleCount: vehicles.length,
      vehicles,
    };
  }

  /**
   * Estimates active train positions from GTFS-RT TripUpdates + static GTFS schedule:
   * - Matches TripUpdate stopTimeUpdates by static stopSequence / station code (never by array index).
   * - Falls back to static scheduled times + known TripUpdate delays when explicit timestamps are missing.
   * - Interpolates along the actual rail alignment from `shapes` (falling back to segment only if no shape exists).
   * - Calculates true track bearing from the rail geometry tangent; leaves speed null instead of faking 12.5.
   */
  private async estimateVehiclesFromTripUpdatesAndSchedule(
    system: string,
    lineFilter?: string,
  ): Promise<NormalizedVehicle[]> {
    try {
      const nowSecs = this.getNowSecondsOfDay();
      const sysLower = (system || 'mumbai').toLowerCase().trim();

      // Fetch lines matching the requested city/system
      const allLines = await this.db.line.findMany({
        where: { isActive: true },
        include: {
          system: { select: { id: true, code: true, city: true } },
        },
      });

      const cityLines = allLines.filter((l) => {
        const c = (l.system?.city || '').toLowerCase();
        const sCode = (l.system?.code || '').toLowerCase();
        const sId = (l.systemId || '').toLowerCase();
        if (sysLower === 'mumbai' || sysLower === 'mm') {
          return (
            c.includes('mumbai') ||
            sCode.includes('mm') ||
            sId.includes('mumbai') ||
            sId.includes('mm')
          );
        }
        return (
          c.includes(sysLower) ||
          sCode.includes(sysLower) ||
          sId.includes(sysLower)
        );
      });

      const targetLines =
        cityLines.length > 0
          ? lineFilter
            ? cityLines.filter(
                (l) =>
                  l.code.toLowerCase().includes(lineFilter.toLowerCase()) ||
                  l.name.toLowerCase().includes(lineFilter.toLowerCase()),
              )
            : cityLines
          : allLines;

      if (targetLines.length === 0) return [];

      const lineIds = targetLines.map((l) => l.id);
      const lineById = new Map(targetLines.map((l) => [l.id, l] as const));

      // Active calendar serviceIds for today
      const dayField = this.getDayField(new Date());
      const activeCalendars = await this.db.calendar.findMany({
        where: { [dayField]: true, isActive: true },
        select: { serviceId: true },
      });
      const activeServiceIds = activeCalendars.map((c) => c.serviceId);

      // Find candidate trips that have stop_times spanning near current clock time
      // Expand window to 60 mins ago to 30 mins ahead to comfortably cover full line traversals (35-55 mins)
      const windowStartSecs = Math.max(0, nowSecs - 3600);
      const windowEndSecs = Math.min(86399, nowSecs + 1800);
      const startStr = this.formatSecondsToHHMMSS(windowStartSecs);
      const endStr = this.formatSecondsToHHMMSS(windowEndSecs);

      const activeTrips = await this.db.trip.findMany({
        where: {
          lineId: { in: lineIds },
          isActive: true,
          ...(activeServiceIds.length > 0
            ? { serviceId: { in: activeServiceIds } }
            : {}),
          stopTimes: {
            some: {
              isActive: true,
              departureTime: { gte: startStr, lte: endStr },
            },
          },
        },
        include: {
          stopTimes: {
            where: { isActive: true },
            orderBy: { stopSequence: 'asc' },
            include: {
              station: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
        take: 300,
      });

      // If no trips are running in current window (e.g. late-night after closing), return empty array
      if (activeTrips.length === 0) {
        return [];
      }

      const estimatedVehicles: NormalizedVehicle[] = [];
      const nowEpochSecs = Math.floor(Date.now() / 1000);

      for (const trip of activeTrips) {
        const line = lineById.get(trip.lineId);
        if (!line) continue;

        const stops = trip.stopTimes.filter(
          (st) =>
            st.station &&
            typeof st.station.latitude === 'number' &&
            typeof st.station.longitude === 'number',
        );
        if (stops.length < 2) continue;

        // Look up GTFS-RT TripUpdate state for this trip (exact match or prefix match for frequency-expanded tripIds)
        let tripDelayState = this.gtfsRtSync.getDelayForTrip(trip.tripId);
        if (!tripDelayState) {
          const allDelays = this.gtfsRtSync.getAllActiveDelays();
          tripDelayState = allDelays.find(
            (d) =>
              d.tripId.startsWith(trip.tripId) ||
              trip.tripId.startsWith(d.tripId) ||
              (d.routeId &&
                (d.routeId.toUpperCase() === line.code.toUpperCase() ||
                  d.routeId.toUpperCase() === line.id.toUpperCase())),
          );
        }
        const stopUpdates = tripDelayState?.stopTimeUpdates || [];
        let runningDelaySecs = tripDelayState?.delaySeconds ?? 0;

        const resolvedStops = stops.map((st) => {
          // Match StopTimeUpdate explicitly by stopSequence or station code/id (never by array index)
          const matchedStu: TripStopTimeUpdate | undefined = stopUpdates.find(
            (u) =>
              (u.stopSequence !== null && u.stopSequence === st.stopSequence) ||
              (u.stopId !== null &&
                (u.stopId === st.station.code || u.stopId === st.stationId)),
          );

          if (
            matchedStu?.arrivalDelay !== null &&
            matchedStu?.arrivalDelay !== undefined
          ) {
            runningDelaySecs = matchedStu.arrivalDelay;
          } else if (
            matchedStu?.departureDelay !== null &&
            matchedStu?.departureDelay !== undefined
          ) {
            runningDelaySecs = matchedStu.departureDelay;
          }

          const staticArrSecs = this.parseTimeToSeconds(st.arrivalTime);
          const staticDepSecs = this.parseTimeToSeconds(st.departureTime);

          const predArrSecs =
            matchedStu?.arrivalTimeEpoch != null
              ? this.epochToIstSecondsOfDay(matchedStu.arrivalTimeEpoch)
              : staticArrSecs + runningDelaySecs;

          const predDepSecs =
            matchedStu?.departureTimeEpoch != null
              ? this.epochToIstSecondsOfDay(matchedStu.departureTimeEpoch)
              : staticDepSecs + runningDelaySecs;

          return {
            stopSequence: st.stopSequence,
            stationId: st.station.id,
            stationCode: st.station.code,
            stationName: st.station.name,
            lat: st.station.latitude,
            lng: st.station.longitude,
            predArrSecs,
            predDepSecs,
            delaySecs: runningDelaySecs,
          };
        });

        // First check if the trip is active at all: first departure <= nowSecs <= last arrival
        const tripFirstDep = resolvedStops[0].predDepSecs;
        const tripLastArr = resolvedStops[resolvedStops.length - 1].predArrSecs;
        if (nowSecs < tripFirstDep || nowSecs > tripLastArr) continue;

        // Check if the train is currently dwelling at a platform (predArrSecs <= nowSecs <= predDepSecs)
        let dwellingStop: (typeof resolvedStops)[0] | null = null;
        for (const st of resolvedStops) {
          if (nowSecs >= st.predArrSecs && nowSecs <= st.predDepSecs) {
            dwellingStop = st;
            break;
          }
        }

        let activePrev: (typeof resolvedStops)[0] | null = null;
        let activeNext: (typeof resolvedStops)[0] | null = null;
        let progress = 0;
        let currentStatus = 'IN_TRANSIT_TO';

        if (dwellingStop) {
          activePrev = dwellingStop;
          const nextIdx = resolvedStops.findIndex(
            (s) => s.stopSequence === dwellingStop.stopSequence,
          );
          activeNext =
            nextIdx < resolvedStops.length - 1
              ? resolvedStops[nextIdx + 1]
              : dwellingStop;
          progress = 0;
          currentStatus = 'STOPPED_AT';
        } else {
          // Inter-station travel (predDepSecs < nowSecs < next.predArrSecs)
          for (let i = 0; i < resolvedStops.length - 1; i++) {
            const curr = resolvedStops[i];
            const next = resolvedStops[i + 1];

            if (nowSecs >= curr.predDepSecs && nowSecs <= next.predArrSecs) {
              activePrev = curr;
              activeNext = next;
              const segDuration = Math.max(
                1,
                next.predArrSecs - curr.predDepSecs,
              );
              progress = Math.max(
                0,
                Math.min(1, (nowSecs - curr.predDepSecs) / segDuration),
              );
              currentStatus =
                progress >= 0.95
                  ? 'STOPPED_AT'
                  : progress >= 0.5
                    ? 'ARRIVING'
                    : 'IN_TRANSIT_TO';
              break;
            }
          }
        }

        if (!activePrev || !activeNext) continue;

        // Interpolate along actual rail alignment from `shapes` table
        const shapeVertices = await this.getTrackShapeVertices(
          trip.shapeId,
          line.id,
          line.systemId,
        );

        const { lat, lng, bearing } = this.interpolateAlongRailAlignment(
          shapeVertices,
          [activePrev.lng, activePrev.lat],
          [activeNext.lng, activeNext.lat],
          progress,
        );

        const terminalName =
          trip.tripHeadsign ||
          resolvedStops[resolvedStops.length - 1].stationName;

        estimatedVehicles.push({
          vehicleId: `EST-${line.code}-${trip.directionId ?? 0}-${activePrev.stopSequence}`,
          tripId: trip.tripId,
          routeId: line.code,
          latitude: lat,
          longitude: lng,
          bearing,
          speed: null, // Never fabricate fake speed; leave null when estimated
          currentStopSequence: activeNext.stopSequence,
          currentStatus,
          timestamp: nowEpochSecs,
          lineName: line.name,
          lineColor: this.normalizeHexColor(line.color) || '#00E5FF',
          previousStationName: activePrev.stationName,
          nextStationName: activeNext.stationName,
          headsign: terminalName,
          delaySeconds: activePrev.delaySecs,
          isEstimated: true,
          positionSource: 'ESTIMATED',
        });
      }

      return estimatedVehicles;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[RealtimeService] Position estimation fallback notice: ${msg}`,
      );
      return [];
    }
  }

  /**
   * Loads ordered track geometry vertices for a shapeId (or canonical line shape) with cumulative distance in meters.
   */
  private async getTrackShapeVertices(
    shapeId: string | null,
    lineId: string,
    systemId: string,
  ): Promise<ShapeVertex[]> {
    const cacheKey = shapeId ? `shape:${shapeId}` : `line:${lineId}`;
    if (this.shapeCache.has(cacheKey)) {
      return this.shapeCache.get(cacheKey)!;
    }

    let resolvedShapeId = shapeId;
    if (!resolvedShapeId) {
      const sampleTrip = await this.db.trip.findFirst({
        where: { lineId, shapeId: { not: null } },
        select: { shapeId: true },
      });
      resolvedShapeId = sampleTrip?.shapeId ?? null;
    }

    if (!resolvedShapeId) {
      this.shapeCache.set(cacheKey, []);
      return [];
    }

    const pts = await this.db.shape.findMany({
      where: { shapeId: resolvedShapeId, systemId },
      orderBy: { sequence: 'asc' },
      select: { longitude: true, latitude: true },
    });

    const vertices: ShapeVertex[] = [];
    let cumMeters = 0;

    for (let i = 0; i < pts.length; i++) {
      if (i > 0) {
        cumMeters +=
          this.haversineKm(
            pts[i - 1].latitude,
            pts[i - 1].longitude,
            pts[i].latitude,
            pts[i].longitude,
          ) * 1000;
      }
      vertices.push({
        lng: pts[i].longitude,
        lat: pts[i].latitude,
        cumMeters,
      });
    }

    this.shapeCache.set(cacheKey, vertices);
    return vertices;
  }

  /**
   * Projects prevStation and nextStation onto the actual rail alignment polyline,
   * interpolates arc-length along the track vertices, and computes true tangent bearing.
   */
  private interpolateAlongRailAlignment(
    shape: ShapeVertex[],
    prevCoord: [number, number],
    nextCoord: [number, number],
    progress: number,
  ): { lng: number; lat: number; bearing: number } {
    if (!shape || shape.length < 2) {
      const lng = prevCoord[0] + (nextCoord[0] - prevCoord[0]) * progress;
      const lat = prevCoord[1] + (nextCoord[1] - prevCoord[1]) * progress;
      const bearing = this.computeBearing(
        prevCoord[1],
        prevCoord[0],
        nextCoord[1],
        nextCoord[0],
      );
      return { lng, lat, bearing };
    }

    // Find closest vertex index on the track polyline for prevStation and nextStation
    let prevIdx = 0;
    let minPrevDist = Infinity;
    let nextIdx = 0;
    let minNextDist = Infinity;

    for (let i = 0; i < shape.length; i++) {
      const dPrev = this.haversineKm(
        prevCoord[1],
        prevCoord[0],
        shape[i].lat,
        shape[i].lng,
      );
      if (dPrev < minPrevDist) {
        minPrevDist = dPrev;
        prevIdx = i;
      }
      const dNext = this.haversineKm(
        nextCoord[1],
        nextCoord[0],
        shape[i].lat,
        shape[i].lng,
      );
      if (dNext < minNextDist) {
        minNextDist = dNext;
        nextIdx = i;
      }
    }

    if (prevIdx === nextIdx) {
      const lng = prevCoord[0] + (nextCoord[0] - prevCoord[0]) * progress;
      const lat = prevCoord[1] + (nextCoord[1] - prevCoord[1]) * progress;
      const bearing = this.computeBearing(
        prevCoord[1],
        prevCoord[0],
        nextCoord[1],
        nextCoord[0],
      );
      return { lng, lat, bearing };
    }

    const startMeters = shape[prevIdx].cumMeters;
    const endMeters = shape[nextIdx].cumMeters;
    const targetMeters = startMeters + (endMeters - startMeters) * progress;

    const forward = endMeters >= startMeters;
    const lowIdx = Math.min(prevIdx, nextIdx);
    const highIdx = Math.max(prevIdx, nextIdx);

    for (let i = lowIdx; i < highIdx; i++) {
      const vA = shape[i];
      const vB = shape[i + 1];
      if (targetMeters >= vA.cumMeters && targetMeters <= vB.cumMeters) {
        const segLen = Math.max(0.1, vB.cumMeters - vA.cumMeters);
        const localT = (targetMeters - vA.cumMeters) / segLen;
        const lng = vA.lng + (vB.lng - vA.lng) * localT;
        const lat = vA.lat + (vB.lat - vA.lat) * localT;
        const bearing = forward
          ? this.computeBearing(vA.lat, vA.lng, vB.lat, vB.lng)
          : this.computeBearing(vB.lat, vB.lng, vA.lat, vA.lng);
        return { lng, lat, bearing };
      }
    }

    const fallbackVertex = shape[nextIdx];
    const bearing = this.computeBearing(
      prevCoord[1],
      prevCoord[0],
      nextCoord[1],
      nextCoord[0],
    );
    return { lng: fallbackVertex.lng, lat: fallbackVertex.lat, bearing };
  }

  /**
   * Computes forward geodesic bearing in degrees [0, 360) from point 1 to point 2.
   */
  private computeBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dLambda = toRad(lon2 - lon1);

    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
    const theta = Math.atan2(y, x);
    return Math.round((toDeg(theta) + 360) % 360);
  }

  private async enrichVehicles(
    vehicles: NormalizedVehicle[],
  ): Promise<NormalizedVehicle[]> {
    const routeIds = [
      ...new Set(vehicles.map((v) => v.routeId).filter(Boolean)),
    ] as string[];

    if (routeIds.length === 0) return [];

    try {
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          str,
        );
      const uuidIds = routeIds.filter(isUuid);
      const codeIds = routeIds.filter((id) => !isUuid(id));

      const orConditions: any[] = [{ code: { in: routeIds } }];
      if (uuidIds.length > 0) {
        orConditions.push({ id: { in: uuidIds } });
      }

      const lines = await this.db.line.findMany({
        where: { OR: orConditions },
        select: { id: true, code: true, name: true, color: true },
      });

      const lineMap = new Map<string, (typeof lines)[0]>();
      for (const l of lines) {
        lineMap.set(l.code, l);
        lineMap.set(l.id, l);
      }

      const stations = await this.db.station.findMany({
        select: { name: true, latitude: true, longitude: true },
      });

      const tripIds = [
        ...new Set(vehicles.map((v) => v.tripId).filter(Boolean)),
      ] as string[];

      const trips =
        tripIds.length > 0
          ? await this.db.trip.findMany({
              where: { tripId: { in: tripIds } },
              select: { tripId: true, tripHeadsign: true },
            })
          : [];

      const tripMap = new Map(trips.map((t) => [t.tripId, t.tripHeadsign]));

      return vehicles
        .filter((v) => {
          if (!v.routeId || !lineMap.has(v.routeId)) return false;
          return stations.some(
            (s) =>
              this.haversineKm(
                v.latitude,
                v.longitude,
                s.latitude,
                s.longitude,
              ) <= 2.5,
          );
        })
        .map((v) => {
          const line = lineMap.get(v.routeId!);
          let nearestStationName: string | null = v.nextStationName ?? null;
          if (!nearestStationName) {
            let minDist = Infinity;
            for (const s of stations) {
              const d = this.haversineKm(
                v.latitude,
                v.longitude,
                s.latitude,
                s.longitude,
              );
              if (d < minDist) {
                minDist = d;
                nearestStationName = s.name;
              }
            }
          }

          const headsign =
            v.headsign || (v.tripId ? tripMap.get(v.tripId) : null) || null;

          return {
            ...v,
            routeId: line?.code ?? v.routeId,
            lineName: line?.name ?? null,
            lineColor: this.normalizeHexColor(line?.color) ?? '#00E5FF',
            nextStationName: nearestStationName,
            headsign,
            isEstimated: false,
            positionSource: 'GPS',
          };
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[RealtimeService] DB enrichment failed: ${msg}`);
      return [];
    }
  }

  private normalizeHexColor(val?: string | null): string | null {
    if (!val) return null;
    const clean = val.trim().replace(/^#/, '');
    return /^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean.toUpperCase()}` : null;
  }

  private getNowSecondsOfDay(): number {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffsetMs);
    return (
      istDate.getUTCHours() * 3600 +
      istDate.getUTCMinutes() * 60 +
      istDate.getUTCSeconds()
    );
  }

  private epochToIstSecondsOfDay(epochSeconds: number): number {
    const istOffsetSecs = 5.5 * 3600;
    return Math.floor(epochSeconds + istOffsetSecs) % 86400;
  }

  private parseTimeToSeconds(timeStr: string): number {
    const parts = (timeStr || '00:00:00').split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }

  private formatSecondsToHHMMSS(totalSecs: number): string {
    const clamped = Math.max(0, Math.min(86399, Math.floor(totalSecs)));
    const hrs = Math.floor(clamped / 3600);
    const mins = Math.floor((clamped % 3600) / 60);
    const secs = clamped % 60;
    return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
  }

  private getDayField(
    date: Date = new Date(),
  ):
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday' {
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffsetMs);
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const;
    return days[istDate.getUTCDay()];
  }

  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
