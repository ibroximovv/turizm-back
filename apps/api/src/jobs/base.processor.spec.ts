import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { createBullOptions } from './jobs.config';

class EchoProcessor extends BaseProcessor<{ value: string }, string> {
  handleMock = jest.fn<Promise<string>, [Job<{ value: string }, string>]>();
  protected handle(job: Job<{ value: string }, string>): Promise<string> {
    return this.handleMock(job);
  }
}

const job = {
  id: '42',
  name: 'echo',
  queueName: 'default',
  attemptsMade: 1,
  data: { value: 'hi' },
} as Job<{ value: string }, string>;

describe('BaseProcessor', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns the handler result and logs completion', async () => {
    const processor = new EchoProcessor();
    processor.handleMock.mockResolvedValue('hi');

    await expect(processor.process(job)).resolves.toBe('hi');
    expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Job default/echo#42 completed'));
  });

  it('logs and rethrows failures so BullMQ can retry', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const processor = new EchoProcessor();
    const error = new Error('smtp timeout');
    processor.handleMock.mockRejectedValue(error);

    await expect(processor.process(job)).rejects.toBe(error);
    expect(errorSpy).toHaveBeenCalledWith(
      'Job default/echo#42 failed on attempt 2: smtp timeout',
      expect.any(String),
    );
  });
});

describe('createBullOptions', () => {
  it('builds connection and retry defaults from envs', () => {
    const options = createBullOptions({
      REDIS_HOST: 'redis',
      REDIS_PORT: 6380,
      REDIS_PASSWORD: 'pw',
      REDIS_DB: 2,
      JOBS_PREFIX: 'tz',
      JOBS_ATTEMPTS: 4,
      JOBS_BACKOFF_MS: 1000,
    });
    expect(options.connection).toMatchObject({ host: 'redis', port: 6380, password: 'pw', db: 2 });
    expect(options.prefix).toBe('tz');
    expect(options.defaultJobOptions).toMatchObject({
      attempts: 4,
      backoff: { type: 'exponential', delay: 1000 },
    });
  });
});
