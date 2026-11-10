import { parseEnvs } from './envs';

// Variables without a default outside NODE_ENV=test.
const required = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
};

describe('parseEnvs', () => {
  it('applies development defaults when nothing is set', () => {
    const envs = parseEnvs(required);
    expect(envs.NODE_ENV).toBe('development');
    expect(envs.PORT).toBe(3000);
    expect(envs.API_PREFIX).toBe('api');
    expect(envs.LOG_LEVEL).toBe('debug');
    expect(envs.LOG_FORMAT).toBe('pretty');
    expect(envs.SWAGGER_ENABLED).toBe(true);
    expect(envs.CORS_ORIGINS).toEqual(['*']);
    expect(envs.JOBS_WORKER_ENABLED).toBe(true);
  });

  it('switches to safer defaults in production', () => {
    const envs = parseEnvs({ ...required, NODE_ENV: 'production' });
    expect(envs.isProduction).toBe(true);
    expect(envs.LOG_LEVEL).toBe('log');
    expect(envs.LOG_FORMAT).toBe('json');
    expect(envs.SWAGGER_ENABLED).toBe(false);
    expect(envs.CORS_ORIGINS).toEqual([]);
  });

  it('parses typed values', () => {
    const envs = parseEnvs({
      ...required,
      PORT: '8080',
      API_PREFIX: '/v-api/',
      LOG_LEVEL: 'warn',
      LOG_HTTP_REQUESTS: 'off',
      CORS_ORIGINS: 'https://a.uz, https://b.uz ,',
      UPLOAD_ALLOWED_MIME_TYPES: 'image/*',
      REDIS_PASSWORD: '  ',
    });
    expect(envs.PORT).toBe(8080);
    expect(envs.API_PREFIX).toBe('v-api');
    expect(envs.LOG_LEVEL).toBe('warn');
    expect(envs.LOG_HTTP_REQUESTS).toBe(false);
    expect(envs.CORS_ORIGINS).toEqual(['https://a.uz', 'https://b.uz']);
    expect(envs.UPLOAD_ALLOWED_MIME_TYPES).toEqual(['image/*']);
    expect(envs.REDIS_PASSWORD).toBeUndefined();
  });

  it('reports every invalid variable at once', () => {
    expect(() =>
      parseEnvs({ ...required, PORT: 'abc', LOG_LEVEL: 'loud', SWAGGER_ENABLED: 'maybe', REDIS_PORT: '70000' }),
    ).toThrow(
      /PORT must be an integer[\s\S]*LOG_LEVEL must be one of[\s\S]*SWAGGER_ENABLED must be a boolean[\s\S]*REDIS_PORT must be between/,
    );
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnvs(required))).toBe(true);
  });

  it('requires the database url and JWT secrets outside tests', () => {
    expect(() => parseEnvs({})).toThrow(
      /DATABASE_URL is required[\s\S]*JWT_ACCESS_SECRET is required[\s\S]*JWT_REFRESH_SECRET is required/,
    );
  });

  it('uses placeholders for required values when NODE_ENV=test', () => {
    const envs = parseEnvs({ NODE_ENV: 'test' });
    expect(envs.DATABASE_URL).toMatch(/^postgresql:/);
    expect(envs.JWT_ACCESS_SECRET).not.toBe(envs.JWT_REFRESH_SECRET);
  });

  it('parses JWT lifetimes into seconds', () => {
    expect(parseEnvs(required)).toMatchObject({ JWT_ACCESS_EXPIRES_IN: 900, JWT_REFRESH_EXPIRES_IN: 2592000 });
    expect(parseEnvs({ ...required, JWT_ACCESS_EXPIRES_IN: '30s', JWT_REFRESH_EXPIRES_IN: '7d' })).toMatchObject({
      JWT_ACCESS_EXPIRES_IN: 30,
      JWT_REFRESH_EXPIRES_IN: 604800,
    });
    expect(parseEnvs({ ...required, JWT_ACCESS_EXPIRES_IN: '120' }).JWT_ACCESS_EXPIRES_IN).toBe(120);
    expect(() => parseEnvs({ ...required, JWT_ACCESS_EXPIRES_IN: '15 minutes' })).toThrow(
      /JWT_ACCESS_EXPIRES_IN must be a positive duration/,
    );
  });

  it('rejects short or identical JWT secrets', () => {
    expect(() => parseEnvs({ ...required, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET must be at least 32 characters/,
    );
    expect(() => parseEnvs({ ...required, JWT_REFRESH_SECRET: required.JWT_ACCESS_SECRET })).toThrow(
      /must be different/,
    );
  });
});
