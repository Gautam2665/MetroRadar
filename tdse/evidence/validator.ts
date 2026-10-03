/**
 * TDSE Evidence System — Validation Engine
 *
 * Validates evidence records against structural rules, source authority constraints,
 * and temporal status validity.
 *
 * Sprint v0.6.5-A.1 — Hardened Temporal Semantics
 */

import { EvidenceRecord, SourceRecord, TemporalStatus } from "./schema";

const VALID_TEMPORAL_STATUSES: Set<TemporalStatus> = new Set([
  "PROPOSED",
  "APPROVED",
  "UNDER_CONSTRUCTION",
  "OPERATIONAL",
  "HISTORICAL",
  "UNKNOWN",
]);

export interface EvidenceValidationResult {
  valid: boolean;
  errors: Array<{ evidenceId: string; message: string }>;
  warnings: Array<{ evidenceId: string; message: string }>;
  summary: {
    totalRecords: number;
    validRecords: number;
    errorCount: number;
    warningCount: number;
    categoriesChecked: string[];
  };
}

export class EvidenceValidator {
  static validate(
    records: EvidenceRecord[],
    sourcesCatalog: SourceRecord[]
  ): EvidenceValidationResult {
    const errors: Array<{ evidenceId: string; message: string }> = [];
    const warnings: Array<{ evidenceId: string; message: string }> = [];
    const sourceMap = new Map<string, SourceRecord>();

    for (const s of sourcesCatalog) {
      sourceMap.set(s.sourceId, s);
    }

    const categoriesSet = new Set<string>();

    for (const r of records) {
      categoriesSet.add(r.category);

      // 1. Required fields
      if (!r.evidenceId) errors.push({ evidenceId: r.evidenceId || "UNKNOWN", message: "Missing evidenceId" });
      if (!r.entityType) errors.push({ evidenceId: r.evidenceId, message: "Missing entityType" });
      if (!r.entityKey) errors.push({ evidenceId: r.evidenceId, message: "Missing entityKey" });
      if (!r.attribute) errors.push({ evidenceId: r.evidenceId, message: "Missing attribute" });
      if (r.value === undefined || r.value === null) {
        errors.push({ evidenceId: r.evidenceId, message: "Missing value" });
      }

      // 2. Temporal Status validation
      if (!r.temporalStatus) {
        errors.push({ evidenceId: r.evidenceId, message: "Missing temporalStatus" });
      } else if (!VALID_TEMPORAL_STATUSES.has(r.temporalStatus)) {
        errors.push({ evidenceId: r.evidenceId, message: `Invalid temporalStatus '${r.temporalStatus}'` });
      }

      // 3. Source checks
      if (!r.source || !r.source.sourceId) {
        errors.push({ evidenceId: r.evidenceId, message: "Missing source.sourceId" });
      } else {
        const src = sourceMap.get(r.source.sourceId);
        if (!src) {
          errors.push({ evidenceId: r.evidenceId, message: `Source '${r.source.sourceId}' not registered in source catalog` });
        } else {
          // Rule: Secondary sources cannot have confidence > 0.6 for direct facts
          if (src.authorityLevel === "SECONDARY" && r.confidence > 0.6) {
            errors.push({
              evidenceId: r.evidenceId,
              message: `Secondary source '${r.source.sourceId}' cannot claim confidence > 0.6 (claimed ${r.confidence})`,
            });
          }

          // Rule: DPR 2011 facts should be PROPOSED / APPROVED / UNKNOWN unless specific evidence exists
          if (src.type === "DPR" && r.temporalStatus === "OPERATIONAL") {
            warnings.push({
              evidenceId: r.evidenceId,
              message: `DPR source '${r.source.sourceId}' (2011) claims OPERATIONAL status — verify if DPR text establishes operational reality or if this should be PROPOSED`,
            });
          }
        }
      }

      // 4. Page/Section check for DIRECT facts
      if (r.evidenceType === "DIRECT" && (!r.source?.page && !r.source?.section && !r.source?.table)) {
        warnings.push({
          evidenceId: r.evidenceId,
          message: "DIRECT evidence record missing page/section/table reference",
        });
      }

      // 5. Derivation check for DERIVED facts
      if (r.evidenceType === "DERIVED" && !r.derivation?.method) {
        errors.push({
          evidenceId: r.evidenceId,
          message: "DERIVED evidence record missing derivation.method",
        });
      }

      // 6. Confidence range
      if (r.confidence < 0.0 || r.confidence > 1.0) {
        errors.push({
          evidenceId: r.evidenceId,
          message: `Confidence ${r.confidence} out of valid range [0.0, 1.0]`,
        });
      }
    }

    const errorCount = errors.length;
    const warningCount = warnings.length;
    const valid = errorCount === 0;

    return {
      valid,
      errors,
      warnings,
      summary: {
        totalRecords: records.length,
        validRecords: records.length - errors.length,
        errorCount,
        warningCount,
        categoriesChecked: Array.from(categoriesSet),
      },
    };
  }
}
