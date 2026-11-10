import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { envs } from '../../../config/envs';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { extractBearerToken, JwtAuthGuard } from './jwt-auth.guard';

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const jwtService = { verifyAsync: jest.fn() };
  const guard = new JwtAuthGuard(reflector as unknown as Reflector, jwtService as unknown as JwtService);

  beforeEach(() => jest.resetAllMocks());

  it('lets @Public() routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('attaches the user for a valid access token', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', role: 'ADMIN', type: 'access' });
    const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer good' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('good', { secret: envs.JWT_ACCESS_SECRET });
    expect(request.user).toEqual({ id: 'u1', role: 'ADMIN' });
  });

  it('rejects a request without a bearer token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
  });

  it('rejects an invalid or expired token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(guard.canActivate(contextFor({ headers: { authorization: 'Bearer bad' } }))).rejects.toThrow(
      new UnauthorizedException('Invalid or expired access token'),
    );
  });

  it('rejects a refresh token used as an access token', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'j', type: 'refresh' });
    await expect(guard.canActivate(contextFor({ headers: { authorization: 'Bearer r' } }))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('extractBearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['Basic abc', null],
    ['Bearer', null],
    [undefined, null],
  ])('%s -> %s', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });
});
