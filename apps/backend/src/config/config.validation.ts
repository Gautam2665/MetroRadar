export function validateEnv(config: Record<string, any>) {
  const errors: string[] = [];

  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is missing');
  }

  if (!config.REDIS_HOST) {
    errors.push('REDIS_HOST is missing');
  }

  const port = Number(config.PORT || 3001);
  if (isNaN(port)) {
    errors.push('PORT must be a number');
  }

  const redisPort = Number(config.REDIS_PORT || 6379);
  if (isNaN(redisPort)) {
    errors.push('REDIS_PORT must be a number');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  return {
    ...config,
    PORT: port,
    REDIS_PORT: redisPort,
  };
}
