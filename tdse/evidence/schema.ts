/**
 * TDSE Evidence System — Schema Definitions
 *
 * TransitOS Evidence Layer captures atomic facts extracted directly from primary sources.
 * Architecture Principle:
 *   SOURCES → EVIDENCE → SOURCE FACTS / GAPS → CTM → GTFS
 *
 * Sprint v0.6.5-A.1 — Hardened Temporal Semantics
 */

export type AuthorityLevel = "OFFICIAL" | "GOVERNMENT" | "OPERATOR" | "SECONDARY" | "UNVERIFIED";

export type SourceType = "DPR" | "OFFICIAL_TIMETABLE" | "GIS_KML" | "GTFS_STATIC" | "COMMUNITY" | "RESEARCH" | "OBSERVATION";

export type KnowledgeCategory =
  | "A_NETWORK"       // Topology, alignment, chainage, curves, gradients, crossovers
  | "B_STATION"       // Physical infrastructure: platforms, concourses, exits, levels
  | "C_OPERATIONS"    // Headways, dwell times, fleet requirements, operating hours
  | "D_ROLLING_STOCK" // Car dimensions, capacity, motorization, acceleration
  | "E_SIGNALLING"    // CBTC, interlockings, block sections, safety systems
  | "F_GIS"           // Spatial shapefiles, WGS84 coordinates, track centerlines
  | "G_PASSENGER"     // Fare structures, ticketing, passenger flow data
  | "H_HISTORICAL"    // Commissioning phases, delay history, timeline
  | "I_OBSERVATIONS"; // Ground telemetry, field calibration readings

export type EvidenceType = "DIRECT" | "DERIVED" | "ESTIMATED" | "CROSS_REFERENCED";

export type TemporalStatus =
  | "PROPOSED"
  | "APPROVED"
  | "UNDER_CONSTRUCTION"
  | "OPERATIONAL"
  | "HISTORICAL"
  | "UNKNOWN";

export type ExtractionMethod =
  | "TABLE_EXTRACTION"
  | "TEXT_PARSING"
  | "DIAGRAM_READING"
  | "GEOSPATIAL_ANALYSIS"
  | "DPR_DGPS_PLUS_OSM"
  | "HEADWAY_CALCULATION"
  | "MANUAL_VERIFICATION";

export type EvidenceStatus = "UNVALIDATED" | "VALIDATED" | "REJECTED" | "SUPERSEDED";

export interface SourceReference {
  sourceId: string;         // e.g. "SOURCE-001"
  document: string;         // e.g. "dpr-metro-line-III.pdf"
  page?: number;            // e.g. 118
  section?: string;         // e.g. "Table 4.3" or "Section 4.4.3"
  table?: string;           // e.g. "Table 4.3: List of Stations"
}

export interface DerivationDetails {
  method: string;           // e.g. "CHAINAGE_PLUS_OSM_ALIGNMENT"
  inputs?: string[];        // Array of evidenceIds used as inputs
  formula?: string;
  rationale?: string;
}

export interface EvidenceRecord {
  evidenceId: string;       // Unique ID, e.g. "E-L3-A-0001"
  systemCode: string;       // e.g. "MMRDA_LINE3"
  category: KnowledgeCategory;
  entityType: string;       // e.g. "line", "station", "interchange", "track_segment", "depot"
  entityKey: string;        // Unique domain key, e.g. "LINE3_STATION_01", "LINE3_ALIGNMENT"
  attribute: string;        // e.g. "name", "chainage_m", "inter_station_dist_m", "rail_level_m"
  value: any;               // Raw extracted value (string, number, boolean, object)
  unit?: string;            // e.g. "m", "km", "km/h", "mm", "deg"
  source: SourceReference;
  evidenceType: EvidenceType;
  temporalStatus: TemporalStatus; // Hardened temporal validity (PROPOSED, OPERATIONAL, etc.)
  extractionMethod: ExtractionMethod;
  derivation?: DerivationDetails;
  confidence: number;       // 0.0 to 1.0 (extraction fidelity, NOT currentness)
  status: EvidenceStatus;
  extractedAt: string;      // ISO Date
  verifiedBy?: string;
  notes?: string;
}

export interface SourceRecord {
  sourceId: string;
  title: string;
  shortName: string;
  publisher: string;
  authority: string;
  authorityLevel: AuthorityLevel;
  type: SourceType;
  documentPath: string;
  originalFilename: string;
  publicationDate: string;
  format: string;
  pages?: number;
  sizeBytes?: number;
  confidenceBaseline: number;
  status: string;
  categoriesCovered: KnowledgeCategory[];
  notes?: string;
}

export interface KnowledgeGapRecord {
  gapId: string;            // e.g. "GAP-L3-A-001"
  systemCode: string;
  category: KnowledgeCategory;
  entityType: string;
  entityKey: string;
  attribute: string;
  requiredFor: string;      // e.g. "WGS84 GTFS stops.txt export"
  reason: string;           // e.g. "DPR lists chainage in meters, not WGS84 lat/lng coordinates"
  potentialSourceTypes: SourceType[];
  impactSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
}

export interface CategoryEvidenceSummary {
  category: KnowledgeCategory;
  totalFacts: number;
  directFacts: number;
  derivedFacts: number;
  estimatedFacts: number;
  averageConfidence: number;
  temporalBreakdown: {
    proposed: number;
    approved: number;
    underConstruction: number;
    operational: number;
    historical: number;
    unknown: number;
  };
  knowledgeGaps: number;
}
