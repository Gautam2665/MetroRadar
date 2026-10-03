/**
 * TDSE Evidence System — Provenance Tracker
 *
 * Generates audit trails, confidence metrics, and coverage summaries from evidence records.
 *
 * Sprint v0.6.5-A
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

    for (const r of categoryRecords) {
      if (r.evidenceType === "DIRECT") direct++;
      else if (r.evidenceType === "DERIVED") derived++;
      else if (r.evidenceType === "ESTIMATED") estimated++;
      totalConfidence += r.confidence;
    }

    const avgConfidence = total > 0 ? Number((totalConfidence / total).toFixed(2)) : 0;
    // Simple completion metric: direct facts vs gaps
    const totalSlots = total + knowledgeGapCount;
    const completionPercentage = totalSlots > 0 ? Number(((total / totalSlots) * 100).toFixed(1)) : 0;

    return {
      category,
      totalFacts: total,
      directFacts: direct,
      derivedFacts: derived,
      estimatedFacts: estimated,
      averageConfidence: avgConfidence,
      knowledgeGaps: knowledgeGapCount,
      completionPercentage,
    };
  }
}
