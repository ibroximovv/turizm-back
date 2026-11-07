import { BullModule } from '@nestjs/bullmq';
import { type DynamicModule, Global, Module } from '@nestjs/common';
import { createBullOptions } from './jobs.config';
import type { QueueName } from './queues';

/**
 * Root BullMQ setup (Redis connection, prefix, retry defaults). Imported once in AppModule.
 * No Redis connection is opened until some feature registers a queue.
 */
@Global()
@Module({
  imports: [BullModule.forRootAsync({ useFactory: () => createBullOptions() })],
})
export class JobsModule {
  /** Use in a feature module: `imports: [JobsModule.registerQueues(QUEUES.MAIL)]`. */
  static registerQueues(...names: QueueName[]): DynamicModule {
    return BullModule.registerQueue(...names.map((name) => ({ name })));
  }
}
