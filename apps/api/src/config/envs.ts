import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { LogLevel } from '@nestjs/common';

/**
 * Single source of truth for every environment variable the API reads.
 *
 * - Add new variables here (and to `.env.example`), never read `process.env` elsewhere.
 * - All values are parsed and validated once at startup; an invalid config fails fast
 *   with a list of every problem instead of crashing later at runtime.
 */

export const NODE_ENVS = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

/** Ordered from most to least severe. LOG_LEVEL enables its level and everything above it. */
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'] as const satisfies readonly LogLevel[];

export const LOG_FORMATS = ['pretty', 'json'] as const;
export type LogFormat = (typeof LOG_FORMATS)[number];

export interface Envs {
  NODE_ENV: NodeEnv;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;

  // HTTP
  HOST: string;
  PORT: number;
  API_PREFIX: string;
  /** `['*']` allows any origin. */
  CORS_ORIGINS: string[];

  // Logging
  LOG_LEVEL: LogLevel;
  LOG_FORMAT: LogFormat;
  LOG_COLORS: boolean;
  LOG_HTTP_REQUESTS: boolean;

  // Swagger
  SWAGGER_ENABLED: boolean;
  SWAGGER_PATH: string;
  SWAGGER_TITLE: string;
  SWAGGER_VERSION: string;

  // File uploads (multer)
  UPLOAD_DIR: string;
  UPLOAD_MAX_FILE_SIZE_MB: number;
  UPLOAD_MAX_FILES: number;
  /** Exact types (`image/png`) or wildcards (`image/*`). Empty list allows everything. */
  UPLOAD_ALLOWED_MIME_TYPES: string[];

  // Redis / background jobs (BullMQ)
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string | undefined;
  REDIS_DB: number;
  JOBS_PREFIX: string;
  /** When false this process only enqueues jobs; workers do not pick anything up. */
  JOBS_WORKER_ENABLED: boolean;
  JOBS_CONCURRENCY: number;
  JOBS_ATTEMPTS: number;
  JOBS_BACKOFF_MS: number;
}

type Source = Record<string, string | undefined>;

class EnvReader {
  readonly errors: string[] = [];

  constructor(private readonly source: Source) {}

  private raw(key: string): string | undefined {
    const value = this.source[key]?.trim();
    return value === undefined || value === '' ? undefined : value;
  }

  string(key: string, fallback?: string): string {
    const value = this.raw(key) ?? fallback;
    if (value === undefined) {
      this.errors.push(`${key} is required`);
      return '';
    }
    return value;
  }

  optionalString(key: string): string | undefined {
    return this.raw(key);
  }

  int(key: string, fallback: number, { min, max }: { min?: number; max?: number } = {}): number {
    const value = this.raw(key);
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      this.errors.push(`${key} must be an integer, got "${value}"`);
      return fallback;
    }
    if ((min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
      this.errors.push(`${key} must be between ${min ?? '-inf'} and ${max ?? 'inf'}, got ${parsed}`);
      return fallback;
    }
    return parsed;
  }

  bool(key: string, fallback: boolean): boolean {
    const value = this.raw(key)?.toLowerCase();
    if (value === undefined) return fallback;
    if (['true', '1', 'yes', 'on'].includes(value)) return true;
    if (['false', '0', 'no', 'off'].includes(value)) return false;
    this.errors.push(`${key} must be a boolean (true/false), got "${value}"`);
    return fallback;
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const value = this.raw(key);
    if (value === undefined) return fallback;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    this.errors.push(`${key} must be one of [${allowed.join(', ')}], got "${value}"`);
    return fallback;
  }

  list(key: string, fallback: string[]): string[] {
    const value = this.raw(key);
    if (value === undefined) return fallback;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }
}

/** Pure parser, exported for tests. Throws one error listing every invalid variable. */
export function parseEnvs(source: Source): Envs {
  const env = new EnvReader(source);
  const NODE_ENV = env.oneOf('NODE_ENV', NODE_ENVS, 'development');
  const isProduction = NODE_ENV === 'production';

  const envs: Envs = {
    NODE_ENV,
    isProduction,
    isDevelopment: NODE_ENV === 'development',
    isTest: NODE_ENV === 'test',

    HOST: env.string('HOST', '0.0.0.0'),
    PORT: env.int('PORT', 3000, { min: 1, max: 65535 }),
    API_PREFIX: env.string('API_PREFIX', 'api').replace(/^\/+|\/+$/g, ''),
    CORS_ORIGINS: env.list('CORS_ORIGINS', isProduction ? [] : ['*']),

    LOG_LEVEL: env.oneOf('LOG_LEVEL', LOG_LEVELS, isProduction ? 'log' : 'debug'),
    LOG_FORMAT: env.oneOf('LOG_FORMAT', LOG_FORMATS, isProduction ? 'json' : 'pretty'),
    LOG_COLORS: env.bool('LOG_COLORS', !isProduction),
    LOG_HTTP_REQUESTS: env.bool('LOG_HTTP_REQUESTS', true),

    SWAGGER_ENABLED: env.bool('SWAGGER_ENABLED', !isProduction),
    SWAGGER_PATH: env.string('SWAGGER_PATH', 'docs').replace(/^\/+|\/+$/g, ''),
    SWAGGER_TITLE: env.string('SWAGGER_TITLE', 'Turizm API'),
    SWAGGER_VERSION: env.string('SWAGGER_VERSION', '1.0.0'),

    UPLOAD_DIR: resolve(env.string('UPLOAD_DIR', 'uploads')),
    UPLOAD_MAX_FILE_SIZE_MB: env.int('UPLOAD_MAX_FILE_SIZE_MB', 10, { min: 1, max: 1024 }),
    UPLOAD_MAX_FILES: env.int('UPLOAD_MAX_FILES', 10, { min: 1, max: 100 }),
    UPLOAD_ALLOWED_MIME_TYPES: env.list('UPLOAD_ALLOWED_MIME_TYPES', [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]),

    REDIS_HOST: env.string('REDIS_HOST', 'localhost'),
    REDIS_PORT: env.int('REDIS_PORT', 6379, { min: 1, max: 65535 }),
    REDIS_PASSWORD: env.optionalString('REDIS_PASSWORD'),
    REDIS_DB: env.int('REDIS_DB', 0, { min: 0, max: 15 }),
    JOBS_PREFIX: env.string('JOBS_PREFIX', 'turizm'),
    JOBS_WORKER_ENABLED: env.bool('JOBS_WORKER_ENABLED', true),
    JOBS_CONCURRENCY: env.int('JOBS_CONCURRENCY', 5, { min: 1, max: 100 }),
    JOBS_ATTEMPTS: env.int('JOBS_ATTEMPTS', 3, { min: 1, max: 50 }),
    JOBS_BACKOFF_MS: env.int('JOBS_BACKOFF_MS', 5000, { min: 0 }),
  };

  if (env.errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${env.errors.join('\n  - ')}`);
  }
  return Object.freeze(envs);
}

/**
 * Loads the nearest `.env` (walking up from cwd, so it works both from the repo root
 * and from `apps/api` where `nx serve` runs). `ENV_FILE` overrides the lookup.
 * Variables already set in the real environment always win.
 */
function loadEnvFile(): void {
  const explicit = process.env.ENV_FILE;
  if (explicit) {
    process.loadEnvFile(resolve(explicit));
    return;
  }
  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

if (process.env.NODE_ENV !== 'test') {
  loadEnvFile();
}

export const envs: Envs = parseEnvs(process.env);
