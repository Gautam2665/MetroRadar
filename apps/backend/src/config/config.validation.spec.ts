import { validateEnv } from './config.validation';

describe('validateEnv', () => {
  it('should validate complete and correct config', () => {
    const validConfig = {
      DATABASE_URL: 'postgresql://localhost:5432/db',
      REDIS_HOST: 'localhost',
      PORT: '3001',
      REDIS_PORT: '6379',
    };

    const result = validateEnv(validConfig);
    expect(result.PORT).toBe(3001);
    expect(result.REDIS_PORT).toBe(6379);
  });

  it('should throw an error if parameters are missing', () => {
    const invalidConfig = {};
    expect(() => validateEnv(invalidConfig)).toThrow(
      'Environment validation failed',
    );
  });
});
