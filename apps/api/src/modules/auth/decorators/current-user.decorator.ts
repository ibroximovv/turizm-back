import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types';

export type AuthenticatedRequest = Request & { user?: AuthUser };

/** The user `JwtAuthGuard` attached to the request. Use only on protected routes. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new UnauthorizedException('Authentication required');
  return user;
});
