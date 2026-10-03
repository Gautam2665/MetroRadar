/**
 * TDSE Evidence System — Evidence Helper & Utility Class
 *
 * Provides factory functions for building valid, type-safe evidence records.
 *
 * Sprint v0.6.5-A
 */

import {
  EvidenceRecord,
  EvidenceType,
  ExtractionMethod,
  KnowledgeCategory,
  SourceReference,
  DerivationDetails,
} from "./schema";

export class EvidenceFactory {
  private static idCounter = 1;

  static resetCounter(startAt = 1) {
    this.idCounter = startAt;
  }

  static createDirectFact(params: {
    systemCode: string;
    category: KnowledgeCategory;
    entityType: string;
    entityKey: string;
    attribute: string;
    value: any;
    unit?: string;
    sourceId: string;
    document: string;
    page: number;
    section?: string;
    table?: string;
    extractionMethod?: ExtractionMethod;
    confidence?: number;
    notes?: string;
  }): EvidenceRecord {
    const sequenceNum = String(this.idCounter++).padStart(4, "0");
    const categoryLetter = params.category.split("_")[0];
    const evidenceId = `E-L3-${categoryLetter}-${sequenceNum}`;

    return {
      evidenceId,
      systemCode: params.systemCode,
      category: params.category,
      entityType: params.entityType,
      entityKey: params.entityKey,
      attribute: params.attribute,
      value: params.value,
      unit: params.unit,
      source: {
        sourceId: params.sourceId,
        document: params.document,
        page: params.page,
        section: params.section,
        table: params.table,
      },
      evidenceType: "DIRECT",
      extractionMethod: params.extractionMethod || "TABLE_EXTRACTION",
      confidence: params.confidence ?? 1.0,
      status: "UNVALIDATED",
      extractedAt: new Date().toISOString(),
      notes: params.notes,
    };
  }

  static createDerivedFact(params: {
    systemCode: string;
    category: KnowledgeCategory;
    entityType: string;
    entityKey: string;
    attribute: string;
    value: any;
    unit?: string;
    sourceId: string;
    document: string;
    derivationMethod: string;
    inputs?: string[];
    confidence?: number;
    notes?: string;
  }): EvidenceRecord {
    const sequenceNum = String(this.idCounter++).padStart(4, "0");
    const categoryLetter = params.category.split("_")[0];
    const evidenceId = `E-L3-${categoryLetter}-${sequenceNum}`;

    return {
      evidenceId,
      systemCode: params.systemCode,
      category: params.category,
      entityType: params.entityType,
      entityKey: params.entityKey,
      attribute: params.attribute,
      value: params.value,
      unit: params.unit,
      source: {
        sourceId: params.sourceId,
        document: params.document,
      },
      evidenceType: "DERIVED",
      extractionMethod: "GEOSPATIAL_ANALYSIS",
      derivation: {
        method: params.derivationMethod,
        inputs: params.inputs,
      },
      confidence: params.confidence ?? 0.8,
      status: "UNVALIDATED",
      extractedAt: new Date().toISOString(),
      notes: params.notes,
    };
  }
}
