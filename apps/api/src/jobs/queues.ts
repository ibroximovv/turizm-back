/**
 * Every BullMQ queue name lives here so producers and processors never disagree on a string.
 * Add a queue: put it here, register it with `JobsModule.registerQueues(QUEUES.X)` in the feature
 * module, inject it with `@InjectQueue(QUEUES.X)` and process it with `@JobProcessor(QUEUES.X)`.
 */
export const QUEUES = {
  DEFAULT: 'default',
  // MAIL: 'mail',
  // MEDIA: 'media',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
