export interface PipelineError {
  file: string;
  line?: number;
  message: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  rawData?: string;
}

export interface PipelineStats {
  processed: number;
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
}

export interface PipelineContext {
  sessionId: string;
  systemId: string;
  dryRun: boolean;
  extractedDir: string;
  errors: PipelineError[];
  stats: Record<string, PipelineStats>;
  logger: {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}
