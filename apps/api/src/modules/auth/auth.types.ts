import type { UserRole } from '@nestjs-template/types';

/** Claims inside an access token. */
export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

/** Claims inside a refresh token. `jti` makes every issued token unique. */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

/** What `JwtAuthGuard` puts on `request.user`. */
export interface AuthUser {
  id: string;
  role: UserRole;
}
