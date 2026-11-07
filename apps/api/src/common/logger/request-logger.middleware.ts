import { randomUUID } from 'node:crypto';
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Logs one line per HTTP request once the response is finished.
 * 5xx -> error, 4xx -> warn, everything else -> log. Enabled with LOG_HTTP_REQUESTS.
 * Also guarantees every response carries an `x-request-id` header for tracing.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    const incomingId = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incomingId === 'string' && incomingId !== '' ? incomingId : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms [${requestId}] ${req.ip ?? '-'}`;

      if (res.statusCode >= 500) this.logger.error(message);
      else if (res.statusCode >= 400) this.logger.warn(message);
      else this.logger.log(message);
    });

    next();
  }
}
