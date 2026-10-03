/**
 * TDSE Evidence System — Provenance Tracker
 *
 * Generates audit trails, confidence metrics, and temporal validity breakdowns from evidence records.
 *
 * Sprint v0.6.5-A.1 — Hardened Temporal Semantics
 */

import { EvidenceRecord, CategoryEvidenceSummary, KnowledgeCategory } from "./schema";

export class EvidenceProvenanceTracker {
  static generateCategorySummary(
    category: KnowledgeCategory,
    records: EvidenceRecord[],
    knowledgeGapCount: number
  ): CategoryEvidenceSummary {
    const categoryRecords = records.filter((r) => r.category === category);
    const total = categoryRecords.length;

    let direct = 0;
    let derived = 0;
    let estimated = 0;
    let totalConfidence = 0;

    const temporalBreakdown = {
      proposed: 0,
      approved: 0,
      underConstruction: 0,
      operational: 0,
      historical: 0,
      unknown: 0,
    };

    for (const r of categoryRecords) {
      if (r.evidenceType === "DIRECT") direct++;
      else if (r.evidenceType === "DERIVED") derived++;
      else if (r.evidenceType === "ESTIMATED") estimated++;
      totalConfidence += r.confidence;

      switch (r.temporalStatus) {
        case "PROPOSED":
          temporalBreakdown.proposed++;
          break;
        case "APPROVED":
          temporalBreakdown.approved++;
          break;
        case "UNDER_CONSTRUCTION":
          temporalBreakdown.underConstruction++;
          break;
        case "OPERATIONAL":
          temporalBreakdown.operational++;
          break;
        case "HISTORICAL":
          temporalBreakdown.historical++;
          break;
        case "UNKNOWN":
        default:
          temporalBreakdown.unknown++;
          break;
      }
    }

    const avgConfidence = total > 0 ? Number((totalConfidence / total).toFixed(2)) : 0;

    return {
      category,
      totalFacts: total,
      directFacts: direct,
      derivedFacts: derived,
      estimatedFacts: estimated,
      averageConfidence: avgConfidence,
      temporalBreakdown,
      knowledgeGaps: knowledgeGapCount,
    };
  }
}
