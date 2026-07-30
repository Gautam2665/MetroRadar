export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];

  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is missing');
  }

  if (!config.REDIS_HOST) {
    errors.push('REDIS_HOST is missing');
  }

  const port = Number(config.PORT ?? 3001);
  if (isNaN(port)) {
    errors.push('PORT must be a number');
  }

  const redisPort = Number(config.REDIS_PORT ?? 6379);
  if (isNaN(redisPort)) {
    errors.push('REDIS_PORT must be a number');
  }

  const pollInterval = Number(config.REALTIME_POLL_INTERVAL_SECONDS ?? 30);
  if (isNaN(pollInterval) || pollInterval < 10) {
    errors.push('REALTIME_POLL_INTERVAL_SECONDS must be a number >= 10');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  // Warn (not fail) if OTD realtime key is absent — realtime module degrades gracefully
  if (!config.OTD_API_KEY) {
    console.warn(
      '[config] OTD_API_KEY is not set — GTFS-Realtime feed polling will be disabled.',
    );
  }
  if (!config.OTD_BASE_URL) {
    console.warn(
      '[config] OTD_BASE_URL is not set — defaulting to https://otd.delhi.gov.in/api/realtime',
    );
  }

  return {
    ...config,
    PORT: port,
    REDIS_PORT: redisPort,
    REALTIME_POLL_INTERVAL_SECONDS: pollInterval,
    OTD_BASE_URL:
      (config.OTD_BASE_URL as string) ??
      'https://otd.delhi.gov.in/api/realtime',
  };
}
