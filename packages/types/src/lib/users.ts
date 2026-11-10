// User shapes returned by the API. Never contains password or token hashes.

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  /** E.164, e.g. +998901234567 */
  phone: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
