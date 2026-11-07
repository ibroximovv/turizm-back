import type { BullRootModuleOptions } from '@nestjs/bullmq';
import { envs, type Envs } from '../config/envs';

type JobsEnvs = Pick<
  Envs,
  'REDIS_HOST' | 'REDIS_PORT' | 'REDIS_PASSWORD' | 'REDIS_DB' | 'JOBS_PREFIX' | 'JOBS_ATTEMPTS' | 'JOBS_BACKOFF_MS'
>;

/** BullMQ root options built from REDIS_* and JOBS_* envs. */
export function createBullOptions(config: JobsEnvs = envs): BullRootModuleOptions {
  return {
    connection: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      db: config.REDIS_DB,
      // Required by BullMQ workers: blocking commands must not be retried per request.
      maxRetriesPerRequest: null,
    },
    prefix: config.JOBS_PREFIX,
    defaultJobOptions: {
      attempts: config.JOBS_ATTEMPTS,
      backoff: { type: 'exponential', delay: config.JOBS_BACKOFF_MS },
      removeOnComplete: { count: 1000, age: 24 * 3600 },
      removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
    },
  };
}
