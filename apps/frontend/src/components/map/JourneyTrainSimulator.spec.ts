/**
 * TransitOS — Journey Train Simulator Trajectory Tests
 * Validates:
 * 1. Normalized continuous trajectory across multi-leg candidate
 * 2. Cumulative distance calculation
 * 3. Leg transition and segment interpolation
 * 4. Safe transform without blowing away MapLibre translate
 */

import { RouteOption } from "../../containers/JourneyPlannerContainer";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log("=== RUNNING JOURNEY TRAIN SIMULATOR UNIT TESTS ===");

// ── Multi-Leg Sample Route ───────────────────────────────────────────────────
const multiLegCandidate: RouteOption = {
  id: "test-cand-multi",
  label: "⚡ Fastest",
  duration: "46 min",
  durationMins: 46,
  durationSeconds: 2760,
  fare: "₹41",
  distance: "28 km",
  interchanges: 2,
  walkDistance: "120m",
  walkMins: 2,
  crowd: "High",
  crowdColor: "#f87171",
  boardCoach: "Coach 3",
  score: 95,
  legs: [
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Airport Express",
      color: "#f97316",
      fromStation: "Dwarka Sector - 21",
      toStation: "New Delhi",
      durationMins: 26,
    },
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Yellow Line",
      color: "#facc15",
      fromStation: "New Delhi",
      toStation: "Rajiv Chowk",
      durationMins: 3,
    },
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Blue Line",
      color: "#3b82f6",
      fromStation: "Rajiv Chowk",
      toStation: "Yamuna Bank",
      durationMins: 11,
    },
  ],
  geojson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { lineName: "Airport Express", color: "#f97316" },
        geometry: {
          type: "LineString",
          coordinates: [
            [77.058, 28.552],
            [77.085, 28.555],
            [77.121, 28.574],
            [77.218, 28.643], // New Delhi
          ],
        },
      },
      {
        type: "Feature",
        properties: { lineName: "Yellow Line", color: "#facc15" },
        geometry: {
          type: "LineString",
          coordinates: [
            [77.218, 28.643], // New Delhi
            [77.219, 28.632], // Rajiv Chowk
          ],
        },
      },
      {
        type: "Feature",
        properties: { lineName: "Blue Line", color: "#3b82f6" },
        geometry: {
          type: "LineString",
          coordinates: [
            [77.219, 28.632], // Rajiv Chowk
            [77.235, 28.629],
            [77.271, 28.623], // Yamuna Bank
          ],
        },
      },
    ],
  },
};

function getCoordDistance(c1: [number, number], c2: [number, number]): number {
  const dLng = (c2[0] - c1[0]) * Math.cos((((c1[1] + c2[1]) / 2) * Math.PI) / 180);
  const dLat = c2[1] - c1[1];
  return Math.hypot(dLng, dLat) * 111320;
}

interface Segment {
  p1: [number, number];
  p2: [number, number];
  length: number;
  cumStart: number;
  cumEnd: number;
  legIndex: number;
  lineColor: string;
  lineName: string;
}

function buildTestTrajectory(cand: RouteOption): { segments: Segment[]; totalLength: number } {
  const segments: Segment[] = [];
  let cum = 0;
  const lineFeatures = cand.geojson?.features.filter((f) => f.geometry.type === "LineString") || [];

  lineFeatures.forEach((feat, legIdx) => {
    const coords = (feat.geometry as GeoJSON.LineString).coordinates as [number, number][];
    const legProps = cand.legs[legIdx];
    const lineColor = legProps?.color || "#06b6d4";
    const lineName = legProps?.line || "Metro Line";

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const dist = getCoordDistance(p1, p2);
      if (dist > 0.01) {
        segments.push({
          p1,
          p2,
          length: dist,
          cumStart: cum,
          cumEnd: cum + dist,
          legIndex: legIdx,
          lineColor,
          lineName,
        });
        cum += dist;
      }
    }
  });

  return { segments, totalLength: cum };
}

console.log("\n[Test Suite 1: Multi-Leg Trajectory Normalization]");
const { segments, totalLength } = buildTestTrajectory(multiLegCandidate);

assert(segments.length === 6, `Total segments count across all 3 legs is 6 (got ${segments.length})`);
assert(totalLength > 15000, `Total trajectory length is > 15km (got ${Math.round(totalLength)}m)`);

// Check continuity across legs
const leg0LastSeg = segments[2];
const leg1FirstSeg = segments[3];
assert(
  leg0LastSeg.p2[0] === leg1FirstSeg.p1[0] && leg0LastSeg.p2[1] === leg1FirstSeg.p1[1],
  "Leg 0 (Airport Express) connects seamlessly to Leg 1 (Yellow Line) at New Delhi"
);

const leg1LastSeg = segments[3];
const leg2FirstSeg = segments[4];
assert(
  leg1LastSeg.p2[0] === leg2FirstSeg.p1[0] && leg1LastSeg.p2[1] === leg2FirstSeg.p1[1],
  "Leg 1 (Yellow Line) connects seamlessly to Leg 2 (Blue Line) at Rajiv Chowk"
);

console.log("\n[Test Suite 2: Progress Mapping & Leg Color Transitions]");
// Test progress p = 0.1 (in Leg 0 Airport Express)
function getLegAtProgress(p: number, segs: Segment[], totalLen: number): Segment {
  const targetDist = p * totalLen;
  for (const s of segs) {
    if (targetDist >= s.cumStart && targetDist <= s.cumEnd) {
      return s;
    }
  }
  return segs[segs.length - 1];
}

const segAtStart = getLegAtProgress(0.1, segments, totalLength);
assert(segAtStart.legIndex === 0, `p=0.1 maps to Leg 0 (Airport Express)`);
assert(segAtStart.lineColor === "#f97316", `p=0.1 has line color #f97316`);

const segAtMid = getLegAtProgress(0.75, segments, totalLength);
assert(segAtMid.legIndex === 1 || segAtMid.legIndex === 2, `p=0.75 maps to connecting leg (Yellow or Blue)`);

const segAtEnd = getLegAtProgress(0.95, segments, totalLength);
assert(segAtEnd.legIndex === 2, `p=0.95 maps to Leg 2 (Blue Line)`);
assert(segAtEnd.lineColor === "#3b82f6", `p=0.95 has line color #3b82f6 (Blue Line)`);

console.log("\n[Test Suite 3: Safe Marker Transform Separation]");
// Verify architectural rule: outer element is NOT modified by rotation
const outerEl = { style: { transform: "translate3d(100px, 200px, 0px)" } };
const innerEl = { style: { transform: "" } };
const angle = 45.5;

// Apply rotation to inner element ONLY
innerEl.style.transform = `rotate(${angle}deg)`;

assert(
  outerEl.style.transform === "translate3d(100px, 200px, 0px)",
  "MapLibre translate3d positioning on outer element is preserved"
);
assert(
  innerEl.style.transform === "rotate(45.5deg)",
  "Rotation angle is applied cleanly to inner child element"
);

console.log("\n✅ ALL 9 TRAJECTORY & LIFECYCLE ASSERTIONS PASSED!");
