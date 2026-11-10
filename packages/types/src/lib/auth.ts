import type { User } from './users';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
  /** Refresh token lifetime in seconds. */
  refreshExpiresIn: number;
}

/** Returned by register and login: the signed-in user plus a fresh token pair. */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
