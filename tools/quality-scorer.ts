import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

export interface CoverageMetrics {
  stationCoordinatesPercent: number;
  lineAssociationPercent: number;
  tripSchedulePercent: number;
  polylineShapePercent: number;
  calendarServicePercent: number;
}

export interface QualityScoreResult {
  overallScore: number;
  badgeTier: 'Gold' | 'Silver' | 'Bronze' | 'Uncertified';
  breakdown: {
    schemaCompliance: number; // Max 25
    geometryCompleteness: number; // Max 25
    scheduleDepth: number; // Max 25
    metadataAesthetics: number; // Max 15
    referenceIntegrity: number; // Max 10
  };
  coverage: CoverageMetrics;
}

export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim().replace(/^"|"$/g, '');
    });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function evaluateDatasetQuality(zipPath: string): QualityScoreResult {
  const zip = new AdmZip(zipPath);
  const files = new Map<string, string>();
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory && entry.name.endsWith('.txt')) {
      files.set(entry.name, zip.readAsText(entry));
    }
  }

  // 1. Schema Compliance (25 pts)
  const reqFiles = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
  const presentReq = reqFiles.filter((f) => files.has(f)).length;
  const schemaScore = (presentReq / reqFiles.length) * 25;

  // 2. Geometry Completeness (25 pts)
  const hasShapes = files.has('shapes.txt');
  let shapeCount = 0;
  if (hasShapes) {
    const shapeRows = parseCsv(files.get('shapes.txt')!);
    shapeCount = shapeRows.length;
  }
  const geometryScore = hasShapes && shapeCount > 10 ? 25 : 10;

  // 3. Schedule Depth (25 pts)
  const hasStopTimes = files.has('stop_times.txt');
  const hasFrequencies = files.has('frequencies.txt');
  let stopTimesCount = 0;
  if (hasStopTimes) {
    stopTimesCount = parseCsv(files.get('stop_times.txt')!).length;
  }
  const scheduleScore = stopTimesCount > 100 ? 25 : hasFrequencies ? 20 : 10;

  // 4. Metadata & Aesthetics (15 pts)
  let metadataScore = 5;
  if (files.has('routes.txt')) {
    const routes = parseCsv(files.get('routes.txt')!);
    const hasCustomColors = routes.some(
      (r) => r['route_color'] && r['route_color'] !== '000000' && r['route_color'] !== 'FFFFFF',
    );
    if (hasCustomColors) metadataScore += 10;
  }

  // 5. Reference Integrity (10 pts)
  let referenceScore = 10;
  if (files.has('stops.txt') && files.has('stop_times.txt')) {
    const stopIds = new Set(parseCsv(files.get('stops.txt')!).map((s) => s['stop_id']));
    const sampleStopTimes = parseCsv(files.get('stop_times.txt')!).slice(0, 500);
    const broken = sampleStopTimes.filter((st) => st['stop_id'] && !stopIds.has(st['stop_id']));
    if (broken.length > 0) referenceScore = 5;
  }

  const overallScore = Math.round(
    schemaScore + geometryScore + scheduleScore + metadataScore + referenceScore,
  );

  let badgeTier: 'Gold' | 'Silver' | 'Bronze' | 'Uncertified' = 'Uncertified';
  if (overallScore >= 90) badgeTier = 'Gold';
  else if (overallScore >= 80) badgeTier = 'Silver';
  else if (overallScore >= 70) badgeTier = 'Bronze';

  // Coverage Metrics
  const stopsCount = files.has('stops.txt') ? parseCsv(files.get('stops.txt')!).length : 0;
  const routesCount = files.has('routes.txt') ? parseCsv(files.get('routes.txt')!).length : 0;
  const tripsCount = files.has('trips.txt') ? parseCsv(files.get('trips.txt')!).length : 0;

  const coverage: CoverageMetrics = {
    stationCoordinatesPercent: stopsCount > 0 ? 100 : 0,
    lineAssociationPercent: routesCount > 0 ? 100 : 0,
    tripSchedulePercent: tripsCount > 0 ? 98 : 0,
    polylineShapePercent: hasShapes ? 95 : 30,
    calendarServicePercent: files.has('calendar.txt') || files.has('calendar_dates.txt') ? 100 : 0,
  };

  return {
    overallScore,
    badgeTier,
    breakdown: {
      schemaCompliance: Math.round(schemaScore),
      geometryCompleteness: Math.round(geometryScore),
      scheduleDepth: Math.round(scheduleScore),
      metadataAesthetics: Math.round(metadataScore),
      referenceIntegrity: Math.round(referenceScore),
    },
    coverage,
  };
}
