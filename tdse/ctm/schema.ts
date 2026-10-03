/**
 * Canonical Transit Model (CTM) — TypeScript Schema
 *
 * This is the INTERNAL source of truth for all transit data in MetroRadar.
 * GTFS is generated FROM this model, not the other way around.
 *
 * Architecture rule: if you find yourself writing `if (system === 'mumbai')`
 * anywhere in the Journey Engine or Map layer — you've broken this abstraction.
 *
 * Sprint v0.6.5
 */

// ---------------------------------------------------------------------------
// Source Provenance
// ---------------------------------------------------------------------------

export type SourceTier = "TIER_A" | "TIER_B" | "TIER_C" | "TIER_D" | "TIER_E";

export type KnowledgeCategory =
  | "A_NETWORK"
  | "B_STATION"
  | "C_OPERATIONS"
  | "D_ROLLING_STOCK"
  | "E_SIGNALLING"
  | "F_GIS"
  | "G_PASSENGER"
  | "H_HISTORICAL"
  | "I_OBSERVATIONS"
  | "X_SYNTHESIZED";

export type XCategory =
  | "X1_HEADWAY_ESTIMATE"
  | "X2_SHAPE_INTERPOLATED"
  | "X3_FARE_ESTIMATED"
  | "X4_TRANSFER_TIME_ESTIMATED"
  | "X5_PLATFORM_ESTIMATED"
  | "X6_CAPACITY_ESTIMATED"
  | "X7_DWELL_ESTIMATED"
  | "X8_SPEED_ESTIMATED"
  | "X9_CROWD_ESTIMATED"
  | "X10_ACCESSIBILITY_ESTIMATED";

export interface FieldProvenance {
  /** Source tier for this specific field value */
  tier: SourceTier;
  /** Knowledge category */
  category: KnowledgeCategory;
  /** Optional sub-category for X (synthesized) fields */
  xCategory?: XCategory;
  /** Confidence score 0.0–1.0 */
  confidence: number;
  /** Human-readable source description */
  source: string;
  /** URL of the source document or API */
  sourceUrl?: string;
  /** Date the data was extracted / verified */
  extractedAt: string; // ISO 8601
  /** Who extracted it (agent, human, automated) */
  extractedBy: "TDSE_AUTOMATED" | "MANUAL_AUDIT" | "OSM_IMPORT" | "OFFICIAL_API";
  /** Notes for auditors */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Geographic Primitives
// ---------------------------------------------------------------------------

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ShapePoint extends LatLng {
  sequence: number;
  distTraveled?: number; // km from shape start
}

// ---------------------------------------------------------------------------
// CTM Agency
// ---------------------------------------------------------------------------

export interface CtmAgency {
  id: string;           // e.g. "MMRDA", "MMOPL", "MMRC"
  name: string;         // Official full name
  shortName?: string;
  url: string;
  timezone: string;     // "Asia/Kolkata"
  lang: string;         // "en"
  phone?: string;
  email?: string;
  provenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM Stop (Station)
// ---------------------------------------------------------------------------

export interface CtmPlatform {
  id: string;
  name: string;
  level: "G" | "L1" | "L2" | "B1" | "B2" | string;
  lineCode: string;
  position: LatLng;
  provenance: FieldProvenance;
}

export interface CtmEntrance {
  id: string;
  name?: string;
  position: LatLng;
  isAccessible: boolean;
  provenance: FieldProvenance;
}

export interface CtmStop {
  id: string;           // Unique stop ID, e.g. "MUM_L1_VERSOVA"
  name: string;         // Official station name
  code: string;         // Short code, e.g. "VVA"
  city: string;         // "Mumbai"
  systemCode: string;   // "MMRDA" — the top-level system this stop belongs to
  agencyId: string;     // Immediate operating agency
  position: LatLng;
  elevation?: number;   // metres above sea level
  locationType: "STATION" | "ENTRANCE" | "PLATFORM" | "GENERIC_NODE";
  wheelchairBoarding: 0 | 1 | 2; // GTFS spec
  platforms?: CtmPlatform[];
  entrances?: CtmEntrance[];
  fareZone?: string;
  openDate?: string;    // ISO 8601 date
  isInterchange: boolean;
  interchangesWith?: string[]; // other stop IDs at same interchange
  positionProvenance: FieldProvenance;
  nameProvenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM Route (Line)
// ---------------------------------------------------------------------------

export interface CtmRoute {
  id: string;           // e.g. "MUM_LINE_1"
  shortName: string;    // e.g. "Line 1"
  longName: string;     // e.g. "Versova–Andheri–Ghatkopar"
  color: string;        // hex without #, e.g. "0066CC"
  textColor: string;    // hex without #
  type: 1;              // GTFS route_type = 1 (subway/metro)
  agencyId: string;
  desc?: string;
  url?: string;
  provenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM Stop Sequence (the ordered stations on a line in one direction)
// ---------------------------------------------------------------------------

export interface CtmStopInSequence {
  sequence: number;     // 1-indexed
  stopId: string;
  distanceFromPrevKm?: number;
  travelTimeSecs?: number;     // scheduled time from previous stop
  dwellTimeSecs?: number;
  provenance: FieldProvenance;
}

export interface CtmStopSequence {
  id: string;           // e.g. "MUM_LINE_1_UP"
  routeId: string;
  direction: 0 | 1;    // GTFS: 0 = outbound, 1 = inbound
  headsign: string;     // e.g. "Ghatkopar"
  stops: CtmStopInSequence[];
  shape?: ShapePoint[];
  provenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM Service (Calendar / Frequency)
// ---------------------------------------------------------------------------

export interface CtmServiceDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface CtmServiceFrequency {
  startTime: string;   // "HH:MM:SS"
  endTime: string;
  headwaySecs: number; // seconds between trains
  exactTimes: 0 | 1;
}

export interface CtmService {
  id: string;          // e.g. "MUM_WEEKDAY_FULL"
  name: string;
  startDate: string;   // "YYYYMMDD"
  endDate: string;
  days: CtmServiceDays;
  frequencies: CtmServiceFrequency[];
  exceptions?: Array<{ date: string; added: boolean }>;
  provenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM Transfer
// ---------------------------------------------------------------------------

export interface CtmTransfer {
  fromStopId: string;
  toStopId: string;
  type: 0 | 1 | 2 | 3;   // GTFS transfer_type
  minTransferTimeSecs?: number;
  walkingDistanceMeters?: number;
  isCovered?: boolean;
  isAccessible?: boolean;
  provenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM Fare
// ---------------------------------------------------------------------------

export interface CtmFareSlab {
  minDistanceKm: number;
  maxDistanceKm: number;
  fareINR: number;
  smartCardFareINR?: number;
}

export interface CtmFareSchema {
  id: string;
  agencyId: string;
  currency: "INR";
  paymentMethod: 0 | 1; // 0 = onboard, 1 = before boarding
  transfers: 0 | 1 | 2 | 3;
  slabs?: CtmFareSlab[];
  flatFare?: number;
  provenance: FieldProvenance;
}

// ---------------------------------------------------------------------------
// CTM System (top-level object)
// ---------------------------------------------------------------------------

export interface CtmSystemMetadata {
  systemCode: string;     // "MMRDA" — used as the key throughout MetroRadar
  displayName: string;    // "Mumbai Metro"
  city: string;
  country: "IN";
  timezone: "Asia/Kolkata";
  defaultLanguage: "en";
  ctmVersion: string;     // e.g. "1.0.0"
  generatedAt: string;    // ISO 8601 timestamp
  generatedBy: "TDSE_v0.6.5";
  dataLicense: string;
  acquisitionNotes: string;
  knowledgeGaps: string[];  // explicit list of what we don't know yet
  confidenceOverall: number; // 0.0–1.0
}

export interface CtmSystem {
  metadata: CtmSystemMetadata;
  agencies: CtmAgency[];
  stops: CtmStop[];
  routes: CtmRoute[];
  sequences: CtmStopSequence[];
  services: CtmService[];
  transfers: CtmTransfer[];
  fares?: CtmFareSchema[];
}
