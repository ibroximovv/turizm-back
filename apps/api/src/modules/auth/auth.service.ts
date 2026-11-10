import { ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse, AuthTokens } from '@nestjs-template/types';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { envs } from '../../config/envs';
import { toUserResponse, type UserRecord, UsersService } from '../users/users.service';
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const INVALID_CREDENTIALS = 'Invalid phone or password';
const INVALID_REFRESH_TOKEN = 'Invalid or expired refresh token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Creates the account and signs the user in immediately (no SMS verification yet). */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (await this.usersService.findByPhone(dto.phone)) {
      throw new ConflictException('Phone number is already registered');
    }
    if (dto.email && (await this.usersService.findByEmail(dto.email))) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.usersService.createRecord({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email ?? null,
      passwordHash: await argon2.hash(dto.password),
    });
    this.logger.log(`User ${user.id} registered`);
    return this.signIn(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    this.assertActive(user);
    return this.signIn(user);
  }

  /** Rotates the pair: the presented refresh token stops working once a new one is issued. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findByIdOrNull(payload.sub);
    if (!user?.refreshTokenHash || !(await argon2.verify(user.refreshTokenHash, refreshToken))) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    this.assertActive(user);

    const tokens = await this.issueTokens(user);
    await this.usersService.updateRecord(user.id, { refreshTokenHash: await argon2.hash(tokens.refreshToken) });
    return tokens;
  }

  /** Revokes the user's refresh token. Access tokens stay valid until they expire. */
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRecord(userId, { refreshTokenHash: null });
  }

  private async signIn(user: UserRecord): Promise<AuthResponse> {
    const tokens = await this.issueTokens(user);
    const updated = await this.usersService.updateRecord(user.id, {
      refreshTokenHash: await argon2.hash(tokens.refreshToken),
      lastLoginAt: new Date(),
    });
    return { user: toUserResponse(updated), tokens };
  }

  private async issueTokens(user: UserRecord): Promise<AuthTokens> {
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role, type: 'access' };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti: randomUUID(), type: 'refresh' };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: envs.JWT_ACCESS_SECRET,
        expiresIn: envs.JWT_ACCESS_EXPIRES_IN,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: envs.JWT_REFRESH_SECRET,
        expiresIn: envs.JWT_REFRESH_EXPIRES_IN,
      }),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: envs.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: envs.JWT_REFRESH_EXPIRES_IN,
    };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, { secret: envs.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    if (payload.type !== 'refresh' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
    return payload;
  }

  private assertActive(user: UserRecord): void {
    if (!user.isActive) throw new ForbiddenException('Account is disabled');
  }
}
