import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@nestjs-template/types';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../logger/request-logger.middleware';

/**
 * Turns every thrown error into the shared `ApiErrorResponse` shape.
 * Unknown (non-HTTP) errors become 500 with a generic message; their stack goes to the log only.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const body = this.buildBody(exception, req, res);

    if (body.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${req.method} ${req.originalUrl} -> ${body.statusCode}: ${this.describe(exception)}`, stack);
    }

    res.status(body.statusCode).json(body);
  }

  buildBody(exception: unknown, req: Request, res: Response): ApiErrorResponse {
    const requestId = res.getHeader(REQUEST_ID_HEADER);
    const base = {
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      ...(typeof requestId === 'string' ? { requestId } : {}),
    };

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const { message, error } = this.extractHttpMessage(response, exception);
      return { statusCode, error, message, ...base };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
      ...base,
    };
  }

  private extractHttpMessage(
    response: string | object,
    exception: HttpException,
  ): { message: string | string[]; error: string } {
    const fallbackError = HttpStatus[exception.getStatus()]?.replace(/_/g, ' ') ?? 'Error';
    if (typeof response === 'string') {
      return { message: response, error: fallbackError };
    }
    const record = response as { message?: unknown; error?: unknown };
    const message =
      typeof record.message === 'string' || Array.isArray(record.message)
        ? (record.message as string | string[])
        : exception.message;
    const error = typeof record.error === 'string' ? record.error : fallbackError;
    return { message, error };
  }

  private describe(exception: unknown): string {
    return exception instanceof Error ? exception.message : String(exception);
  }
}
