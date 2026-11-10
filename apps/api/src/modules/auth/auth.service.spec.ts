import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { envs } from '../../config/envs';
import { makeUserRecord } from '../users/users.service.spec';
import { toUserResponse, UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }));
const hash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
const verify = argon2.verify as jest.MockedFunction<typeof argon2.verify>;

describe('AuthService', () => {
  const usersService = {
    findByPhone: jest.fn(),
    findByEmail: jest.fn(),
    findByIdOrNull: jest.fn(),
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  let service: AuthService;
  const user = makeUserRecord();

  beforeEach(async () => {
    jest.resetAllMocks();
    hash.mockImplementation(async (value) => `hash(${String(value)})`);
    jwtService.signAsync.mockImplementation(async (payload: { type: string }) => `${payload.type}-token`);
    usersService.updateRecord.mockImplementation(async (_id: string, data: object) => ({ ...user, ...data }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  const expectedTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    expiresIn: envs.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: envs.JWT_REFRESH_EXPIRES_IN,
  };

  describe('register', () => {
    const dto = { fullName: 'Aziz Karimov', phone: '+998901234567', email: 'aziz@example.com', password: 'Secret123' };

    it('creates the user with a hashed password and signs them in', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.createRecord.mockResolvedValue(user);

      const result = await service.register(dto);

      expect(usersService.createRecord).toHaveBeenCalledWith({
        fullName: 'Aziz Karimov',
        phone: '+998901234567',
        email: 'aziz@example.com',
        passwordHash: 'hash(Secret123)',
      });
      expect(usersService.updateRecord).toHaveBeenCalledWith(user.id, {
        refreshTokenHash: 'hash(refresh-token)',
        lastLoginAt: expect.any(Date),
      });
      expect(result.tokens).toEqual(expectedTokens);
      expect(result.user).toEqual({ ...toUserResponse(user), lastLoginAt: expect.any(String) });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('signs access and refresh tokens with their own secrets and lifetimes', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      usersService.createRecord.mockResolvedValue(user);

      await service.register({ ...dto, email: undefined });

      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(usersService.createRecord).toHaveBeenCalledWith(expect.objectContaining({ email: null }));
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id, role: 'USER', type: 'access' },
        { secret: envs.JWT_ACCESS_SECRET, expiresIn: envs.JWT_ACCESS_EXPIRES_IN },
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id, jti: expect.any(String), type: 'refresh' },
        { secret: envs.JWT_REFRESH_SECRET, expiresIn: envs.JWT_REFRESH_EXPIRES_IN },
      );
    });

    it('rejects an already registered phone', async () => {
      usersService.findByPhone.mockResolvedValue(user);
      await expect(service.register(dto)).rejects.toThrow(new ConflictException('Phone number is already registered'));
      expect(usersService.createRecord).not.toHaveBeenCalled();
    });

    it('rejects an already registered email', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(user);
      await expect(service.register(dto)).rejects.toThrow(new ConflictException('Email is already registered'));
      expect(usersService.createRecord).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { phone: user.phone, password: 'Secret123' };

    it('returns the user and tokens for valid credentials', async () => {
      usersService.findByPhone.mockResolvedValue(user);
      verify.mockResolvedValue(true);

      const result = await service.login(dto);

      expect(verify).toHaveBeenCalledWith(user.passwordHash, 'Secret123');
      expect(result.tokens).toEqual(expectedTokens);
      expect(result.user.id).toBe(user.id);
    });

    it('rejects an unknown phone', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(new UnauthorizedException('Invalid phone or password'));
    });

    it('rejects a wrong password', async () => {
      usersService.findByPhone.mockResolvedValue(user);
      verify.mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(new UnauthorizedException('Invalid phone or password'));
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects a disabled account', async () => {
      usersService.findByPhone.mockResolvedValue(makeUserRecord({ isActive: false }));
      verify.mockResolvedValue(true);
      await expect(service.login(dto)).rejects.toThrow(new ForbiddenException('Account is disabled'));
    });
  });

  describe('refresh', () => {
    const stored = makeUserRecord({ refreshTokenHash: 'hash(old-refresh)' });

    it('rotates the token pair', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, jti: 'j', type: 'refresh' });
      usersService.findByIdOrNull.mockResolvedValue(stored);
      verify.mockResolvedValue(true);

      await expect(service.refresh('old-refresh')).resolves.toEqual(expectedTokens);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('old-refresh', { secret: envs.JWT_REFRESH_SECRET });
      expect(verify).toHaveBeenCalledWith('hash(old-refresh)', 'old-refresh');
      expect(usersService.updateRecord).toHaveBeenCalledWith(user.id, { refreshTokenHash: 'hash(refresh-token)' });
    });

    it('rejects an invalid or expired token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(service.refresh('bad')).rejects.toThrow(new UnauthorizedException('Invalid or expired refresh token'));
    });

    it('rejects a token of the wrong type', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, role: 'USER', type: 'access' });
      await expect(service.refresh('access')).rejects.toThrow(UnauthorizedException);
      expect(usersService.findByIdOrNull).not.toHaveBeenCalled();
    });

    it('rejects a token that was revoked or already rotated', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, jti: 'j', type: 'refresh' });
      usersService.findByIdOrNull.mockResolvedValue(stored);
      verify.mockResolvedValue(false);
      await expect(service.refresh('old-refresh')).rejects.toThrow(UnauthorizedException);
      expect(usersService.updateRecord).not.toHaveBeenCalled();
    });

    it('rejects when the user logged out or no longer exists', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, jti: 'j', type: 'refresh' });
      usersService.findByIdOrNull.mockResolvedValueOnce(makeUserRecord({ refreshTokenHash: null }));
      await expect(service.refresh('t')).rejects.toThrow(UnauthorizedException);
      usersService.findByIdOrNull.mockResolvedValueOnce(null);
      await expect(service.refresh('t')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a disabled account', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: user.id, jti: 'j', type: 'refresh' });
      usersService.findByIdOrNull.mockResolvedValue(makeUserRecord({ refreshTokenHash: 'h', isActive: false }));
      verify.mockResolvedValue(true);
      await expect(service.refresh('t')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      await service.logout(user.id);
      expect(usersService.updateRecord).toHaveBeenCalledWith(user.id, { refreshTokenHash: null });
    });

    it('propagates NotFoundException for an unknown user', async () => {
      const error = new Error('User #x not found');
      usersService.updateRecord.mockRejectedValue(error);
      await expect(service.logout('x')).rejects.toBe(error);
    });
  });
});
