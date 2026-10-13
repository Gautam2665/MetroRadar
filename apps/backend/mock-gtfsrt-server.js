/**
 * Dynamic GTFS-Realtime Feed Server for TransitOS (Mumbai Metro Network)
 *
 * Powered directly by `datasets/mumbai/mumbai_discrete_ready.zip` (`datasets/mumbai/trips.txt` & `stop_times.txt`):
 * 1. Loads the exact discrete trips and stop_times for today's service calendar (`SVC_WEEKDAY` / `SVC_SATURDAY` / `SVC_SUNDAY`).
 * 2. On every request, selects the actual active discrete trips running right now (e.g. `TRIP_LINE1_0_WD_1222_56`,
 *    `TRIP_LINE2A_0_WD_...`, `TRIP_LINE7_0_WD_...`, `TRIP_LINE3_0_WD_...`, `TRIP_MONORAIL_0_WD_...`).
 * 3. Computes a fresh Unix epoch `timestamp: Math.floor(Date.now() / 1000)` on every request.
 * 4. Separates entities by endpoint:
 *    - `/gtfsrt/updates`  -> Only `tripUpdate` entities (Protobuf)
 *    - `/gtfsrt/vehicles` -> Only `vehicle` entities (Protobuf)
 *    - `/gtfsrt/alerts`   -> Only `alert` entities (Protobuf)
 *    - `/`                -> Live JSON diagnostic snapshot
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;

const PORT = Number(process.env.MOCK_GTFSRT_PORT || 8080);
const MUMBAI_DIR = path.resolve(__dirname, '../../datasets/mumbai');

function parseTimeToSecs(t) {
  const parts = (t || '00:00:00').trim().split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

// Load discrete trips, stops, stop_times, and shapes from datasets/mumbai
const stopsById = new Map();
const tripsById = new Map();
const stopTimesByTripId = new Map();
const shapesByShapeId = new Map();

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBearing(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function interpolateAlongRailAlignment(shapePts, prevCoord, nextCoord, progress) {
  if (!shapePts || shapePts.length < 2) {
    const lat = Number((prevCoord.lat + (nextCoord.lat - prevCoord.lat) * progress).toFixed(5));
    const lng = Number((prevCoord.lng + (nextCoord.lng - prevCoord.lng) * progress).toFixed(5));
    const bearing = Number(computeBearing(prevCoord.lat, prevCoord.lng, nextCoord.lat, nextCoord.lng).toFixed(1));
    return { lat, lng, bearing };
  }

  let prevIdx = 0;
  let minPrev = Infinity;
  let nextIdx = 0;
  let minNext = Infinity;

  for (let i = 0; i < shapePts.length; i++) {
    const dP = haversineKm(prevCoord.lat, prevCoord.lng, shapePts[i].lat, shapePts[i].lng);
    if (dP < minPrev) {
      minPrev = dP;
      prevIdx = i;
    }
    const dN = haversineKm(nextCoord.lat, nextCoord.lng, shapePts[i].lat, shapePts[i].lng);
    if (dN < minNext) {
      minNext = dN;
      nextIdx = i;
    }
  }

  if (prevIdx === nextIdx) {
    return {
      lat: Number(shapePts[prevIdx].lat.toFixed(5)),
      lng: Number(shapePts[prevIdx].lng.toFixed(5)),
      bearing: Number(computeBearing(prevCoord.lat, prevCoord.lng, nextCoord.lat, nextCoord.lng).toFixed(1)),
    };
  }

  const startMeters = shapePts[prevIdx].cumMeters;
  const endMeters = shapePts[nextIdx].cumMeters;
  const targetMeters = startMeters + (endMeters - startMeters) * progress;
  const forward = endMeters >= startMeters;
  const lowIdx = Math.min(prevIdx, nextIdx);
  const highIdx = Math.max(prevIdx, nextIdx);

  for (let i = lowIdx; i < highIdx; i++) {
    const vA = shapePts[i];
    const vB = shapePts[i + 1];
    if (targetMeters >= vA.cumMeters && targetMeters <= vB.cumMeters) {
      const segLen = Math.max(0.1, vB.cumMeters - vA.cumMeters);
      const localT = (targetMeters - vA.cumMeters) / segLen;
      const lat = Number((vA.lat + (vB.lat - vA.lat) * localT).toFixed(5));
      const lng = Number((vA.lng + (vB.lng - vA.lng) * localT).toFixed(5));
      const rawBearing = forward
        ? computeBearing(vA.lat, vA.lng, vB.lat, vB.lng)
        : computeBearing(vB.lat, vB.lng, vA.lat, vA.lng);
      return { lat, lng, bearing: Number(rawBearing.toFixed(1)) };
    }
  }

  const fb = shapePts[nextIdx];
  return {
    lat: Number(fb.lat.toFixed(5)),
    lng: Number(fb.lng.toFixed(5)),
    bearing: Number(computeBearing(prevCoord.lat, prevCoord.lng, nextCoord.lat, nextCoord.lng).toFixed(1)),
  };
}

function loadDiscreteGtfs() {
  try {
    const shapesPath = path.join(MUMBAI_DIR, 'shapes.txt');
    if (fs.existsSync(shapesPath)) {
      const lines = fs.readFileSync(shapesPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
      const headers = lines[0].split(',').map((h) => h.trim());
      const sIdx = headers.indexOf('shape_id');
      const latIdx = headers.indexOf('shape_pt_lat');
      const lonIdx = headers.indexOf('shape_pt_lon');
      const seqIdx = headers.indexOf('shape_pt_sequence');

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        const shapeId = cols[sIdx]?.trim();
        const lat = parseFloat(cols[latIdx]);
        const lon = parseFloat(cols[lonIdx]);
        const seq = parseInt(cols[seqIdx], 10);
        if (shapeId && !isNaN(lat) && !isNaN(lon)) {
          if (!shapesByShapeId.has(shapeId)) shapesByShapeId.set(shapeId, []);
          shapesByShapeId.get(shapeId).push({ lat, lng: lon, seq: isNaN(seq) ? i : seq });
        }
      }

      for (const pts of shapesByShapeId.values()) {
        pts.sort((a, b) => a.seq - b.seq);
        let cum = 0;
        for (let j = 0; j < pts.length; j++) {
          if (j > 0) cum += haversineKm(pts[j - 1].lat, pts[j - 1].lng, pts[j].lat, pts[j].lng) * 1000;
          pts[j].cumMeters = cum;
        }
      }
    }

    const stopsPath = path.join(MUMBAI_DIR, 'stops.txt');
    if (fs.existsSync(stopsPath)) {
      const lines = fs.readFileSync(stopsPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
      const headers = lines[0].split(',').map((h) => h.trim());
      const idIdx = headers.indexOf('stop_id');
      const nameIdx = headers.indexOf('stop_name');
      const latIdx = headers.indexOf('stop_lat');
      const lonIdx = headers.indexOf('stop_lon');

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        const stopId = cols[idIdx]?.trim();
        const lat = parseFloat(cols[latIdx]);
        const lon = parseFloat(cols[lonIdx]);
        if (stopId && !isNaN(lat) && !isNaN(lon)) {
          stopsById.set(stopId, {
            stopId,
            name: cols[nameIdx]?.replace(/^"|"$/g, '').trim() || stopId,
            lat,
            lng: lon,
          });
        }
      }
    }

    const tripsPath = path.join(MUMBAI_DIR, 'trips.txt');
    if (fs.existsSync(tripsPath)) {
      const lines = fs.readFileSync(tripsPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
      const headers = lines[0].split(',').map((h) => h.trim());
      const rIdx = headers.indexOf('route_id');
      const sIdx = headers.indexOf('service_id');
      const hIdx = headers.indexOf('trip_headsign');
      const dIdx = headers.indexOf('direction_id');
      const shpIdx = headers.indexOf('shape_id');
      const tIdx = headers.indexOf('trip_id');

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        const tripId = cols[tIdx]?.trim();
        if (!tripId) continue;
        tripsById.set(tripId, {
          tripId,
          routeId: cols[rIdx]?.trim() || 'LINE1',
          serviceId: cols[sIdx]?.trim() || 'SVC_WEEKDAY',
          headsign: cols[hIdx]?.replace(/^"|"$/g, '').trim() || '',
          directionId: Number(cols[dIdx] || 0),
          shapeId: shpIdx !== -1 ? cols[shpIdx]?.trim() : '',
        });
      }
    }

    const stPath = path.join(MUMBAI_DIR, 'stop_times.txt');
    if (fs.existsSync(stPath)) {
      const lines = fs.readFileSync(stPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
      const headers = lines[0].split(',').map((h) => h.trim());
      const tIdx = headers.indexOf('trip_id');
      const arrIdx = headers.indexOf('arrival_time');
      const depIdx = headers.indexOf('departure_time');
      const stopIdx = headers.indexOf('stop_id');
      const seqIdx = headers.indexOf('stop_sequence');

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        const tripId = cols[tIdx]?.trim();
        if (!tripId || !tripsById.has(tripId)) continue;

        const arrStr = cols[arrIdx]?.trim() || '00:00:00';
        const depStr = cols[depIdx]?.trim() || arrStr;
        const stopId = cols[stopIdx]?.trim() || '';
        const seq = Number(cols[seqIdx] || 1);

        let list = stopTimesByTripId.get(tripId);
        if (!list) {
          list = [];
          stopTimesByTripId.set(tripId, list);
        }
        list.push({
          stopId,
          stopSequence: seq,
          arrivalTime: arrStr,
          departureTime: depStr,
          arrSecs: parseTimeToSecs(arrStr),
          depSecs: parseTimeToSecs(depStr),
        });
      }

      for (const list of stopTimesByTripId.values()) {
        list.sort((a, b) => a.stopSequence - b.stopSequence);
      }
    }

    console.log(
      `[GTFS-RT Server] Loaded mumbai_discrete_ready schedule: ${tripsById.size} discrete trips, ${stopTimesByTripId.size} trip timetables, ${stopsById.size} stops.`,
    );
  } catch (err) {
    console.error('[GTFS-RT Server] Error loading discrete GTFS files:', err.message);
  }
}

loadDiscreteGtfs();

function getIstContext() {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const istDate = new Date(nowMs + 5.5 * 3600 * 1000);
  const dayOfWeek = istDate.getUTCDay(); // 0 = Sun, 1..5 = Mon..Fri, 6 = Sat
  const serviceId =
    dayOfWeek === 0 ? 'SVC_SUNDAY' : dayOfWeek === 6 ? 'SVC_SATURDAY' : 'SVC_WEEKDAY';
  const dayTag = dayOfWeek === 0 ? 'SUN' : dayOfWeek === 6 ? 'SAT' : 'WD';

  const nowSecsOfDay =
    istDate.getUTCHours() * 3600 +
    istDate.getUTCMinutes() * 60 +
    istDate.getUTCSeconds();

  const startDateStr = [
    istDate.getUTCFullYear(),
    String(istDate.getUTCMonth() + 1).padStart(2, '0'),
    String(istDate.getUTCDate()).padStart(2, '0'),
  ].join('');

  // Epoch timestamp corresponding to 00:00:00 IST today
  const istMidnightEpoch = nowSec - nowSecsOfDay;

  return {
    nowSec,
    nowSecsOfDay,
    istMidnightEpoch,
    serviceId,
    dayTag,
    startDateStr,
  };
}

/**
 * Finds all currently active discrete trips from `mumbai_discrete_ready` (`trips.txt` + `stop_times.txt`)
 * that are actively running right now across all Mumbai Metro lines (no per-route or per-direction capping).
 */
function findActiveDiscreteTrips() {
  const { nowSecsOfDay, serviceId } = getIstContext();
  const activeTrips = [];

  for (const [tripId, trip] of tripsById.entries()) {
    if (trip.serviceId !== serviceId) continue;
    const stList = stopTimesByTripId.get(tripId);
    if (!stList || stList.length < 2) continue;

    const firstDep = stList[0].depSecs;
    const lastArr = stList[stList.length - 1].arrSecs;

    // Active span match: First station departure <= NOW <= Last station arrival
    if (nowSecsOfDay >= firstDep && nowSecsOfDay <= lastArr) {
      activeTrips.push({ trip, stList });
    }
  }

  return activeTrips;
}

function buildTripUpdateEntities() {
  const { nowSec, nowSecsOfDay, istMidnightEpoch, startDateStr } = getIstContext();
  const activeTrips = findActiveDiscreteTrips();

  return activeTrips.map(({ trip, stList }) => {
    // Deterministic gentle delay (0s, 15s, or 30s) per line
    const delaySecs =
      trip.routeId === 'LINE1' ? 30 : trip.routeId === 'LINE7' ? 15 : 0;

    // Include upcoming stops from current position onward
    const upcomingStops = stList.filter((s) => s.arrSecs + delaySecs >= nowSecsOfDay - 60);
    const targetStops = upcomingStops.length > 0 ? upcomingStops : stList.slice(-2);

    const stopTimeUpdate = targetStops.map((s) => ({
      stopSequence: s.stopSequence,
      stopId: s.stopId,
      arrival: {
        delay: delaySecs,
        time: istMidnightEpoch + s.arrSecs + delaySecs,
      },
      departure: {
        delay: delaySecs,
        time: istMidnightEpoch + s.depSecs + delaySecs,
      },
    }));

    return {
      id: `tu-${trip.tripId}`,
      tripUpdate: {
        trip: {
          tripId: trip.tripId,
          routeId: trip.routeId,
          directionId: trip.directionId,
          startTime: stList[0].departureTime,
          startDate: startDateStr,
        },
        stopTimeUpdate,
        timestamp: nowSec,
      },
    };
  });
}

function buildVehiclePositionEntities() {
  const { nowSec, nowSecsOfDay, startDateStr } = getIstContext();
  const activeTrips = findActiveDiscreteTrips();
  const entities = [];

  for (const { trip, stList } of activeTrips) {
    if (!stList || stList.length < 2) continue;

    let prevSt = stList[0];
    let nextSt = stList[1];
    let currentStatus = 2; // IN_TRANSIT_TO
    let inTransit = true;

    // Check if train is currently dwelling at a station
    for (let i = 0; i < stList.length; i++) {
      if (nowSecsOfDay >= stList[i].arrSecs && nowSecsOfDay <= stList[i].depSecs) {
        prevSt = stList[i];
        nextSt = stList[i];
        currentStatus = 1; // STOPPED_AT
        inTransit = false;
        break;
      }
    }

    // If not dwelling, find active running segment between stations
    if (inTransit) {
      for (let i = 0; i < stList.length - 1; i++) {
        if (nowSecsOfDay >= stList[i].depSecs && nowSecsOfDay <= stList[i + 1].arrSecs) {
          prevSt = stList[i];
          nextSt = stList[i + 1];
          currentStatus = 2; // IN_TRANSIT_TO
          break;
        }
      }
    }

    const prevStopCoord = stopsById.get(prevSt.stopId);
    const nextStopCoord = stopsById.get(nextSt.stopId);

    if (prevStopCoord && nextStopCoord) {
      let lat = prevStopCoord.lat;
      let lng = prevStopCoord.lng;
      let bearing = trip.directionId === 0 ? 112.0 : 292.0;
      let speed = 0;

      const shapePts = trip.shapeId ? shapesByShapeId.get(trip.shapeId) : null;

      if (inTransit && prevSt !== nextSt) {
        const segDur = Math.max(10, nextSt.arrSecs - prevSt.depSecs);
        const progress = Math.max(0, Math.min(1, (nowSecsOfDay - prevSt.depSecs) / segDur));
        const interp = interpolateAlongRailAlignment(shapePts, prevStopCoord, nextStopCoord, progress);
        lat = interp.lat;
        lng = interp.lng;
        bearing = interp.bearing;
        speed = 13.5;
      } else {
        // Dwelling at station: use station coordinates and shape tangent if available
        if (shapePts) {
          const interp = interpolateAlongRailAlignment(shapePts, prevStopCoord, nextStopCoord, 0);
          bearing = interp.bearing;
        }
      }

      // Generate multi-carriage details for realistic crowd telemetry
      const carriageCount = trip.routeId === 'LINE3' ? 8 : trip.routeId === 'MONORAIL' ? 4 : 6;
      const coaches = Array.from({ length: carriageCount }, (_, idx) => {
        const hash = ((trip.tripId.charCodeAt(trip.tripId.length - 1) + idx * 17) % 50) + 30;
        return {
          coachNumber: idx + 1,
          occupancyPercent: hash,
          wheelchairAccessible: idx === 1,
        };
      });

      const dirCode = trip.directionId === 0 ? 'D0' : 'D1';
      const rakeSuffix = trip.tripId.split('_').slice(-2).join('_');

      entities.push({
        id: `vp-${trip.tripId}`,
        vehicle: {
          trip: {
            tripId: trip.tripId,
            routeId: trip.routeId,
            directionId: trip.directionId,
            startTime: stList[0].departureTime,
            startDate: startDateStr,
            tripHeadsign: trip.headsign,
          },
          position: {
            latitude: lat,
            longitude: lng,
            bearing,
            speed,
          },
          currentStopSequence: nextSt.stopSequence,
          stopId: nextSt.stopId,
          currentStatus,
          timestamp: nowSec,
          vehicle: {
            id: `MUM-${trip.routeId}-${dirCode}-${rakeSuffix}`,
            label: `${trip.routeId} Rake (${trip.headsign})`,
          },
          multiCarriageDetails: coaches,
        },
      });
    }
  }

  return entities;
}

function buildAlertEntities() {
  const { nowSec } = getIstContext();
  return [
    {
      id: 'alert-mumbai-line1-headway',
      alert: {
        activePeriod: [{ start: nowSec - 1800, end: nowSec + 7200 }],
        informedEntity: [{ routeId: 'LINE1' }],
        cause: 1,
        effect: 3,
        headerText: {
          translation: [
            {
              text: 'Normal operations across Mumbai Metro Lines 1, 2A, 3, 7 & Monorail',
              language: 'en',
            },
          ],
        },
        descriptionText: {
          translation: [
            {
              text: 'Discrete timetable schedule from mumbai_discrete_ready active across all corridors.',
              language: 'en',
            },
          ],
        },
      },
    },
  ];
}

function encodeFeed(entities) {
  const { nowSec } = getIstContext();
  const payload = {
    header: {
      gtfsRealtimeVersion: '2.0',
      incrementality: 0,
      timestamp: nowSec,
    },
    entity: entities,
  };
  const message = FeedMessage.fromObject(payload);
  return Buffer.from(FeedMessage.encode(message).finish());
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (url === '/gtfsrt/updates' || url === '/realtime/updates') {
    const buf = encodeFeed(buildTripUpdateEntities());
    res.writeHead(200, {
      'Content-Type': 'application/x-protobuf',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
    });
    res.end(buf);
    return;
  }

  if (url === '/gtfsrt/vehicles' || url === '/realtime/vehicles') {
    const buf = encodeFeed(buildVehiclePositionEntities());
    res.writeHead(200, {
      'Content-Type': 'application/x-protobuf',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
    });
    res.end(buf);
    return;
  }

  if (url === '/gtfsrt/alerts' || url === '/realtime/alerts') {
    const buf = encodeFeed(buildAlertEntities());
    res.writeHead(200, {
      'Content-Type': 'application/x-protobuf',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
    });
    res.end(buf);
    return;
  }

  // Diagnostic JSON view on `/`
  const { nowSec, serviceId, dayTag, startDateStr } = getIstContext();
  const tripUpdates = buildTripUpdateEntities();
  const vehicles = buildVehiclePositionEntities();
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(
    JSON.stringify(
      {
        status: 'OK',
        sourceDataset: 'datasets/mumbai/mumbai_discrete_ready.zip',
        serviceId,
        dayTag,
        startDate: startDateStr,
        header: {
          gtfsRealtimeVersion: '2.0',
          incrementality: 'FULL_DATASET',
          timestamp: nowSec,
        },
        activeDiscreteTripCount: tripUpdates.length,
        activeTripIds: tripUpdates.map((e) => e.tripUpdate.trip.tripId),
        endpoints: {
          updates: '/gtfsrt/updates (TripUpdate entities only)',
          vehicles: '/gtfsrt/vehicles (VehiclePosition entities only)',
          alerts: '/gtfsrt/alerts (Alert entities only)',
        },
        sampleEntities: {
          tripUpdates: tripUpdates.slice(0, 4),
          vehicles,
          alerts: buildAlertEntities(),
        },
      },
      null,
      2,
    ),
  );
});

server.listen(PORT, () => {
  console.log(`[GTFS-RT Server] Listening on http://localhost:${PORT}`);
});
