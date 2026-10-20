const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function timeToSecs(timeStr) {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

function secsToTime(totalSecs) {
  let s = Math.round(totalSecs);
  let h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  s %= 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
}

async function analyzeCorridor(lineCode, lineName, peakTime, nonPeakTime) {
  console.log(`\n================================================================================`);
  console.log(`🚄 CORRIDOR: ${lineName} (${lineCode})`);
  console.log(`================================================================================`);

  for (const [mode, targetTime] of [['PEAK HOUR', peakTime], ['NON-PEAK (MIDDAY)', nonPeakTime]]) {
    const line = await prisma.line.findFirst({ where: { code: lineCode } });
    if (!line) continue;

    // Load Dir 0 and Dir 1 trips
    const dir0Trips = await prisma.trip.findMany({
      where: { lineId: line.id, directionId: 0, serviceId: 'SVC_WEEKDAY' },
      include: {
        stopTimes: {
          orderBy: { stopSequence: 'asc' },
          include: { station: true }
        }
      }
    });
    dir0Trips.sort((a, b) => a.stopTimes[0].departureTime.localeCompare(b.stopTimes[0].departureTime));

    const dir1Trips = await prisma.trip.findMany({
      where: { lineId: line.id, directionId: 1, serviceId: 'SVC_WEEKDAY' },
      include: {
        stopTimes: {
          orderBy: { stopSequence: 'asc' },
          include: { station: true }
        }
      }
    });
    dir1Trips.sort((a, b) => a.stopTimes[0].departureTime.localeCompare(b.stopTimes[0].departureTime));

    // Find trip closest to targetTime
    const targetSecs = timeToSecs(targetTime);
    let chosenTrip = dir0Trips[0];
    let minDiff = 999999;
    for (const t of dir0Trips) {
      const depSecs = timeToSecs(t.stopTimes[0].departureTime);
      const diff = Math.abs(depSecs - targetSecs);
      if (diff < minDiff) {
        minDiff = diff;
        chosenTrip = t;
      }
    }

    const tripIdx = dir0Trips.indexOf(chosenTrip);
    const nextTrip = dir0Trips[tripIdx + 1];
    let headwayMin = 0;
    if (nextTrip) {
      headwayMin = (timeToSecs(nextTrip.stopTimes[0].departureTime) - timeToSecs(chosenTrip.stopTimes[0].departureTime)) / 60;
    }

    const originStop = chosenTrip.stopTimes[0];
    const destStop = chosenTrip.stopTimes[chosenTrip.stopTimes.length - 1];
    const tripDurationMins = (timeToSecs(destStop.arrivalTime) - timeToSecs(originStop.departureTime)) / 60;

    console.log(`\n--- [${mode}] Target Window: ~${targetTime} ---`);
    console.log(`Train ID           : ${chosenTrip.tripId}`);
    console.log(`Route Direction    : ${originStop.station.name} ➔ ${destStop.station.name}`);
    console.log(`Scheduled Departure: ${secsToTime(timeToSecs(originStop.departureTime))} (from ${originStop.station.name})`);
    console.log(`Scheduled Arrival  : ${secsToTime(timeToSecs(destStop.arrivalTime))} (at ${destStop.station.name})`);
    console.log(`Total Run Duration : ${tripDurationMins.toFixed(1)} mins (${chosenTrip.stopTimes.length} stations, ${chosenTrip.stopTimes.length - 1} hops)`);
    console.log(`Dispatched Headway : ${headwayMin.toFixed(1)} mins`);

    // Detect Meetings with Dir 1 Trains
    // For each Dir 1 train, check where its trajectory intersects with chosenTrip
    const crossings = [];

    for (const oppTrip of dir1Trips) {
      const oppOrigin = oppTrip.stopTimes[0];
      const oppDest = oppTrip.stopTimes[oppTrip.stopTimes.length - 1];
      const oppDepSecs = timeToSecs(oppOrigin.departureTime);
      const oppArrSecs = timeToSecs(oppDest.arrivalTime);

      const myDepSecs = timeToSecs(originStop.departureTime);
      const myArrSecs = timeToSecs(destStop.arrivalTime);

      // Overlap check
      if (oppArrSecs < myDepSecs || oppDepSecs > myArrSecs) continue;

      // Find intersection station or block
      for (let i = 0; i < chosenTrip.stopTimes.length; i++) {
        const myStop = chosenTrip.stopTimes[i];
        const myArr = timeToSecs(myStop.arrivalTime);
        const myDep = timeToSecs(myStop.departureTime);

        // Find corresponding stop in oppTrip
        const oppStop = oppTrip.stopTimes.find(s => s.stationId === myStop.stationId);
        if (oppStop) {
          const oppArr = timeToSecs(oppStop.arrivalTime);
          const oppDep = timeToSecs(oppStop.departureTime);

          // Check if both trains dwell at station simultaneously
          if (Math.max(myArr, oppArr) <= Math.min(myDep, oppDep)) {
            crossings.push({
              oppTripId: oppTrip.tripId,
              oppHeadsign: oppTrip.tripHeadsign || oppDest.station.name,
              timeSecs: Math.max(myArr, oppArr),
              location: `${myStop.station.name} (Simultaneous Dwell)`,
              stationName: myStop.station.name,
              type: 'STATION_DWELL'
            });
            break;
          }
        }

        // Check if crossed on inter-station track section
        if (i < chosenTrip.stopTimes.length - 1) {
          const myNextStop = chosenTrip.stopTimes[i + 1];
          const myLegStart = myDep;
          const myLegEnd = timeToSecs(myNextStop.arrivalTime);

          const oppStopCurrent = oppTrip.stopTimes.find(s => s.stationId === myStop.stationId);
          const oppStopNext = oppTrip.stopTimes.find(s => s.stationId === myNextStop.stationId);

          if (oppStopCurrent && oppStopNext) {
            // In oppTrip, train moves from myNextStop to myStop
            const oppLegStart = timeToSecs(oppStopNext.departureTime);
            const oppLegEnd = timeToSecs(oppStopCurrent.arrivalTime);

            const overlapStart = Math.max(myLegStart, oppLegStart);
            const overlapEnd = Math.min(myLegEnd, oppLegEnd);

            if (overlapStart <= overlapEnd) {
              const crossingTime = (overlapStart + overlapEnd) / 2;
              crossings.push({
                oppTripId: oppTrip.tripId,
                oppHeadsign: oppTrip.tripHeadsign || oppDest.station.name,
                timeSecs: crossingTime,
                location: `Between ${myStop.station.name} & ${myNextStop.station.name}`,
                stationName: myStop.station.name,
                type: 'TRACK_CROSSING'
              });
              break;
            }
          }
        }
      }
    }

    crossings.sort((a, b) => a.timeSecs - b.timeSecs);

    console.log(`\nOpposite-Direction Train Encounters (${crossings.length} trains crossed during trip):`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Time         Location                                  Opposite Train & Interval`);
    console.log(`--------------------------------------------------------------------------------`);

    for (let cIdx = 0; cIdx < crossings.length; cIdx++) {
      const c = crossings[cIdx];
      let intervalStr = '';
      if (cIdx > 0) {
        const gapSecs = c.timeSecs - crossings[cIdx - 1].timeSecs;
        intervalStr = ` (+${(gapSecs / 60).toFixed(1)}m)`;
      } else {
        intervalStr = ' (First meeting)';
      }
      const timeStr = secsToTime(c.timeSecs);
      const locPadded = c.location.padEnd(41, ' ');
      console.log(`${timeStr}  ${locPadded} 🚆 Towards ${c.oppHeadsign}${intervalStr}`);
    }

    if (crossings.length > 1) {
      const totalCrossingTimeSecs = crossings[crossings.length - 1].timeSecs - crossings[0].timeSecs;
      const avgIntervalMins = (totalCrossingTimeSecs / (crossings.length - 1)) / 60;
      console.log(`--------------------------------------------------------------------------------`);
      console.log(`✔ Mathematical Sync: With ${headwayMin.toFixed(1)}m headway, trains meet every ${avgIntervalMins.toFixed(1)}m (Theoretical: ${(headwayMin/2).toFixed(1)}m).`);
    }
  }
}

async function main() {
  await analyzeCorridor('LINE2A', 'Line 2A (Yellow Line)', '18:00:00', '14:00:00');
  await analyzeCorridor('LINE7',  'Line 7 (Red Line)',    '09:00:00', '14:00:00');
  await analyzeCorridor('LINE1',  'Line 1 (Blue Line)',   '18:30:00', '14:30:00');
  await analyzeCorridor('LINE3',  'Line 3 (Aqua Line)',   '09:00:00', '14:00:00');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
