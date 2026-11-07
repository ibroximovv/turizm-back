import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { envs, LOG_LEVELS, type Envs } from '../../config/envs';

/**
 * Returns every level that is enabled for the given threshold.
 * `resolveLogLevels('warn')` -> `['fatal', 'error', 'warn']`.
 */
export function resolveLogLevels(threshold: LogLevel): LogLevel[] {
  const index = LOG_LEVELS.indexOf(threshold as (typeof LOG_LEVELS)[number]);
  if (index === -1) {
    throw new Error(`Unknown log level "${threshold}"`);
  }
  return LOG_LEVELS.slice(0, index + 1);
}

type LoggerEnvs = Pick<Envs, 'LOG_LEVEL' | 'LOG_FORMAT' | 'LOG_COLORS'>;

/**
 * Application-wide logger. Level, format (pretty/json) and colors come from `envs`
 * (LOG_LEVEL, LOG_FORMAT, LOG_COLORS) so logging is controlled only from the environment.
 *
 * Feature code keeps using `new Logger(MyService.name)` from `@nestjs/common`;
 * Nest routes those calls through this instance once it is passed to `NestFactory.create`.
 */
export function createAppLogger(config: LoggerEnvs = envs): ConsoleLogger {
  const json = config.LOG_FORMAT === 'json';
  return new ConsoleLogger({
    prefix: 'Turizm',
    logLevels: resolveLogLevels(config.LOG_LEVEL),
    json,
    // Colors in JSON mode would corrupt the output for log collectors.
    colors: !json && config.LOG_COLORS,
    timestamp: !json,
  });
}
