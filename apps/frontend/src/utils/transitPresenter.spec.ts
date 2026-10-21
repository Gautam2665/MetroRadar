/**
 * TransitOS — Automated Unit Tests for Presentation Layer & Journey Context
 * Validates requirements:
 * 1. Raw GTFS string sanitization
 * 2. Station lines deduplication (prevents 2 boxes for same line in different directions)
 * 3. Interchange determination
 * 4. Transfer vs Direct Pass-Through journey context derivation
 * 5. Multi-leg trajectory normalization
 */

import {
  cleanLineName,
  shortLineName,
  normalizeStationLines,
  deriveJourneyStationContext,
  isStationMatch,
  resolveLineColor,
} from "./transitPresenter";
import { RouteOption } from "../containers/JourneyPlannerContainer";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log("=== RUNNING TRANSIT PRESENTER UNIT TESTS ===");

// ── Test 1: Clean line names ──────────────────────────────────────────────────
console.log("\n[Test Suite 1: Clean line names]");
assert(
  cleanLineName("ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi") === "Airport Express (Orange Line)",
  "Airport Express line name correctly sanitized"
);
assert(
  shortLineName("ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi") === "Airport Express",
  "Airport Express short name correctly formatted"
);
assert(
  shortLineName("YELLOW_Samaypur Badli to Huda City Centre") === "Yellow Line",
  "Yellow Line sanitized"
);
assert(
  shortLineName("BLUE_Dwarka Sector - 21 to Noida Electronic City") === "Blue Line",
  "Blue Line sanitized"
);
assert(
  shortLineName("PINK_Shiv Vihar to Majlis Park") === "Pink Line",
  "Pink Line sanitized"
);
assert(
  shortLineName("MAGENTA_Janakpuri West to Botanical Garden") === "Magenta Line",
  "Magenta Line sanitized"
);

// ── Test 2: Line color resolution ─────────────────────────────────────────────
console.log("\n[Test Suite 2: Line color resolution]");
assert(
  resolveLineColor("ORANGE/AIRPORT") === "#f97316",
  "Orange line color is #f97316"
);
assert(
  resolveLineColor("YELLOW_Line") === "#facc15",
  "Yellow line color is #facc15"
);
assert(
  resolveLineColor("BLUE_Line") === "#007DC5",
  "Blue line color is #007DC5"
);
assert(
  resolveLineColor("GREY_Line") === "#808080",
  "Grey line color is #808080"
);
assert(
  resolveLineColor("GRAY_Line") === "#808080",
  "Gray line color is #808080"
);

// ── Test 3: Deduplication of station lines ────────────────────────────────────
console.log("\n[Test Suite 3: Deduplication of station lines]");
// Real database sample for Shivaji Stadium (2 opposite directions of Airport Express)
const shivajiRawLines = [
  { code: "1", name: "ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi", color: "#f97316" },
  { code: "2", name: "ORANGE/AIRPORT_New Delhi to Dwarka Sector - 21", color: "#f97316" },
];
const shivajiCleanLines = normalizeStationLines(shivajiRawLines);
assert(
  shivajiCleanLines.length === 1,
  `Shivaji Stadium lines deduped from 2 to 1 (got ${shivajiCleanLines.length})`
);
assert(
  shivajiCleanLines[0].shortName === "Airport Express",
  "Shivaji Stadium clean line is Airport Express"
);

// Real database sample for Dilshad Garden (4 entries for Red Line)
const dilshadRawLines = [
  { code: "19", name: "RED_Shaheed Sthal to Rithala", color: "#ef4444" },
  { code: "18", name: "RED_Dilshad Garden to Rithala", color: "#ef4444" },
  { code: "19", name: "RED_Shaheed Sthal to Rithala", color: "#ef4444" },
  { code: "18", name: "RED_Dilshad Garden to Rithala", color: "#ef4444" },
];
const dilshadCleanLines = normalizeStationLines(dilshadRawLines);
assert(
  dilshadCleanLines.length === 1,
  `Dilshad Garden lines deduped from 4 to 1 (got ${dilshadCleanLines.length})`
);
assert(
  dilshadCleanLines[0].shortName === "Red Line",
  "Dilshad Garden clean line is Red Line"
);

// Real database sample for Anand Vihar ISBT (Blue Line + Pink Line interchange)
const anandViharRawLines = [
  { code: "3", name: "BLUE_Dwarka Sector - 21 to Vaishali", color: "#3b82f6" },
  { code: "4", name: "BLUE_Vaishali to Dwarka Sector - 21", color: "#3b82f6" },
  { code: "7", name: "PINK_Majlis Park to Shiv Vihar", color: "#ec4899" },
  { code: "8", name: "PINK_Shiv Vihar to Majlis Park", color: "#ec4899" },
];
const anandViharCleanLines = normalizeStationLines(anandViharRawLines);
assert(
  anandViharCleanLines.length === 2,
  `Anand Vihar interchange lines deduped from 4 to 2 distinct lines (got ${anandViharCleanLines.length})`
);
const anandViharLineNames = anandViharCleanLines.map((l) => l.shortName).sort();
assert(
  anandViharLineNames[0] === "Blue Line" && anandViharLineNames[1] === "Pink Line",
  "Anand Vihar has both Blue Line and Pink Line cleanly identified"
);

// ── Test 4: Station matching utility ──────────────────────────────────────────
console.log("\n[Test Suite 4: Station matching]");
assert(
  isStationMatch("Dwarka Sector - 21", "Dwarka Sector 21"),
  "Matches across dash differences"
);
assert(
  isStationMatch("Kashmere Gate", "kashmere gate"),
  "Matches across case differences"
);
assert(
  isStationMatch("Rajiv Chowk (Platform 1)", "Rajiv Chowk"),
  "Matches with parenthetical suffix"
);
assert(
  !isStationMatch("Noida City Centre", "Noida Sector 52"),
  "Rejects distinct stations"
);

// ── Test 5: Transfer Station derivation for Journey Context ───────────────────
console.log("\n[Test Suite 5: Journey Context Derivation (Transfer vs Direct)]");

// Candidate 1: Multi-leg route (Dwarka Sec 21 -> New Delhi -> Rajiv Chowk -> Yamuna Bank)
const candidate1: RouteOption = {
  id: "cand-1",
  label: "⚡ Fastest",
  duration: "46 min",
  durationMins: 46,
  durationSeconds: 2760,
  fare: "₹41",
  smartCardFare: "₹38",
  distance: "28 km",
  interchanges: 2,
  walkDistance: "120m",
  walkMins: 2,
  crowd: "High",
  crowdColor: "#f87171",
  boardCoach: "Coach 3",
  score: 54,
  legs: [
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Airport Express",
      rawLineName: "ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi",
      color: "#f97316",
      fromStation: "Dwarka Sector - 21",
      toStation: "New Delhi",
      durationMins: 26,
    },
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Yellow Line",
      rawLineName: "YELLOW_Qutab Minar to Vishwavidyalaya",
      color: "#facc15",
      fromStation: "New Delhi",
      toStation: "Rajiv Chowk",
      durationMins: 3,
    },
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Blue Line",
      rawLineName: "BLUE_Dwarka Sector - 21 to Noida Electronic City",
      color: "#3b82f6",
      fromStation: "Rajiv Chowk",
      toStation: "Yamuna Bank",
      durationMins: 11,
    },
  ],
};

// Candidate 2: Direct route (Blue Line direct, 0 transfers)
const candidate2: RouteOption = {
  id: "cand-2",
  label: "◎ Direct",
  duration: "69 min",
  durationMins: 69,
  durationSeconds: 4140,
  fare: "₹62",
  smartCardFare: "₹59",
  distance: "32 km",
  interchanges: 0,
  walkDistance: "0m",
  walkMins: 0,
  crowd: "Medium",
  crowdColor: "#fec931",
  boardCoach: "Coach 2",
  score: 33,
  stations: [
    { name: "Dwarka Sector - 21", code: "DW21" },
    { name: "Rajiv Chowk", code: "RC" },
    { name: "Yamuna Bank", code: "YB" },
  ],
  legs: [
    {
      mode: "subway",
      type: "TRANSIT",
      line: "Blue Line",
      rawLineName: "BLUE_Dwarka Sector - 21 to Noida Electronic City",
      color: "#3b82f6",
      fromStation: "Dwarka Sector - 21",
      toStation: "Yamuna Bank",
      durationMins: 67,
    },
  ],
};

// Check Rajiv Chowk on Candidate 1 (Must be TRANSFER!)
const rajivContextCand1 = deriveJourneyStationContext("Rajiv Chowk", candidate1);
assert(
  rajivContextCand1 !== null && rajivContextCand1.role === "transfer",
  "Rajiv Chowk on Candidate 1 is identified as a TRANSFER station"
);
assert(
  rajivContextCand1?.incomingLine === "Yellow Line",
  `Incoming line to Rajiv Chowk on Candidate 1 is Yellow Line (got ${rajivContextCand1?.incomingLine})`
);
assert(
  rajivContextCand1?.outgoingLine === "Blue Line",
  `Outgoing line from Rajiv Chowk on Candidate 1 is Blue Line (got ${rajivContextCand1?.outgoingLine})`
);

// Check New Delhi on Candidate 1 (Must be TRANSFER!)
const newDelhiContextCand1 = deriveJourneyStationContext("New Delhi", candidate1);
assert(
  newDelhiContextCand1 !== null && newDelhiContextCand1.role === "transfer",
  "New Delhi on Candidate 1 is identified as a TRANSFER station"
);
assert(
  newDelhiContextCand1?.incomingLine === "Airport Express",
  `Incoming line to New Delhi is Airport Express (got ${newDelhiContextCand1?.incomingLine})`
);
assert(
  newDelhiContextCand1?.outgoingLine === "Yellow Line",
  `Outgoing line from New Delhi is Yellow Line (got ${newDelhiContextCand1?.outgoingLine})`
);

// Check Rajiv Chowk on Candidate 2 (Must be DIRECT PASS-THROUGH, NOT TRANSFER!)
const rajivContextCand2 = deriveJourneyStationContext("Rajiv Chowk", candidate2);
assert(
  rajivContextCand2 !== null && rajivContextCand2.role === "direct_pass_through",
  "Rajiv Chowk on Candidate 2 is identified as a DIRECT PASS-THROUGH station (no transfer)"
);
assert(
  rajivContextCand2?.directLine === "Blue Line",
  `Direct line on Candidate 2 is Blue Line (got ${rajivContextCand2?.directLine})`
);

// Check Palam on Candidate 1 (Palam is not on this route -> null context)
const palamContextCand1 = deriveJourneyStationContext("Palam", candidate1);
assert(
  palamContextCand1 === null,
  "Palam station (Magenta Line) has no journey context on Candidate 1"
);

// Check Mogra on Candidate 2 (Mogra is on Line 7 / Red Line, not Blue Line direct -> must be null!)
const mograContextCand2 = deriveJourneyStationContext("Mogra", candidate2);
assert(
  mograContextCand2 === null,
  "Mogra station (Line 7) has no journey context on Candidate 2 (prevents card bug on unvisited stations)"
);

// Check Palam on Candidate 2 (Palam is on Magenta Line, not Blue Line direct -> must be null!)
const palamContextCand2 = deriveJourneyStationContext("Palam", candidate2);
assert(
  palamContextCand2 === null,
  "Palam station has no journey context on Candidate 2"
);

console.log("\n✅ ALL 18 ASSERTIONS PASSED SUCCESSFULLY!");
