import { type ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(headers: Record<string, string> = {}) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    getHeader: jest.fn((name: string) => headers[name]),
  };
  const req = { method: 'GET', originalUrl: '/api/v1/tours/1' };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  afterEach(() => jest.restoreAllMocks());

  it('formats an HttpException', () => {
    const { host, res } = createHost({ 'x-request-id': 'req-1' });
    filter.catch(new NotFoundException('Tour #1 not found'), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'Tour #1 not found',
      path: '/api/v1/tours/1',
      timestamp: expect.any(String),
      requestId: 'req-1',
    });
  });

  it('keeps validation message arrays', () => {
    const { host, res } = createHost();
    filter.catch(new BadRequestException(['name must be a string']), host);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, error: 'Bad Request', message: ['name must be a string'] }),
    );
  });

  it('hides unknown errors behind a 500 and logs the stack', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, res } = createHost();

    filter.catch(new Error('connection refused at 10.0.0.5'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error' }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('connection refused'),
      expect.stringContaining('Error: connection refused'),
    );
  });
});
