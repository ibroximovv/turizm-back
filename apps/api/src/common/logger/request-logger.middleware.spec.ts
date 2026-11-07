import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, RequestLoggerMiddleware } from './request-logger.middleware';

function run(statusCode: number, headers: Record<string, string> = {}) {
  const middleware = new RequestLoggerMiddleware();
  const res = Object.assign(new EventEmitter(), { statusCode, setHeader: jest.fn() });
  const req = { method: 'POST', originalUrl: '/api/v1/tours', ip: '127.0.0.1', headers };
  const next = jest.fn();
  middleware.use(req as unknown as Request, res as unknown as Response, next);
  res.emit('finish');
  return { res, next };
}

describe('RequestLoggerMiddleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [200, 'log'],
    [404, 'warn'],
    [503, 'error'],
  ] as const)('logs status %i at %s level', (status, level) => {
    const spy = jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
    const { next } = run(status);
    expect(next).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^POST /api/v1/tours ${status} [\\d.]+ms`)));
  });

  it('reuses an incoming request id', () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { res } = run(200, { [REQUEST_ID_HEADER]: 'abc' });
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'abc');
  });

  it('generates a request id when none is sent', () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const { res } = run(200);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, expect.stringMatching(/^[0-9a-f-]{36}$/));
  });
});
