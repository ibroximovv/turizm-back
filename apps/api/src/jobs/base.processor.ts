import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { envs } from '../config/envs';
import type { QueueName } from './queues';

/**
 * `@Processor` with worker settings from envs: JOBS_WORKER_ENABLED (autorun) and JOBS_CONCURRENCY.
 * Run API instances with JOBS_WORKER_ENABLED=false and dedicated workers with true.
 */
export function JobProcessor(queue: QueueName, options: { concurrency?: number } = {}): ClassDecorator {
  return Processor(queue, {
    autorun: envs.JOBS_WORKER_ENABLED,
    concurrency: options.concurrency ?? envs.JOBS_CONCURRENCY,
  });
}

/**
 * Base worker: logs start / finish / failure with timing and the attempt number,
 * so feature processors only implement `handle`.
 *
 * ```ts
 * @JobProcessor(QUEUES.MAIL)
 * export class MailProcessor extends BaseProcessor<SendMailJob> {
 *   protected async handle(job: Job<SendMailJob>) {
 *     switch (job.name) { case 'welcome': ...; default: throw new Error(`Unknown job ${job.name}`); }
 *   }
 * }
 * ```
 */
export abstract class BaseProcessor<TData = unknown, TResult = unknown> extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  protected abstract handle(job: Job<TData, TResult>): Promise<TResult>;

  async process(job: Job<TData, TResult>): Promise<TResult> {
    const label = `${job.queueName}/${job.name}#${job.id ?? '?'}`;
    const attempt = job.attemptsMade + 1;
    const startedAt = Date.now();
    this.logger.debug(`Job ${label} started (attempt ${attempt})`);

    try {
      const result = await this.handle(job);
      this.logger.log(`Job ${label} completed in ${Date.now() - startedAt}ms`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Job ${label} failed on attempt ${attempt}: ${message}`, stack);
      throw error;
    }
  }
}
