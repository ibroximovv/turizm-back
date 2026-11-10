import { Test } from '@nestjs/testing';
import type { AuthResponse, AuthTokens } from '@nestjs-template/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authService = { register: jest.fn(), login: jest.fn(), refresh: jest.fn(), logout: jest.fn() };
  let controller: AuthController;
  const response = { user: { id: 'u1' }, tokens: { accessToken: 'a' } } as AuthResponse;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = moduleRef.get(AuthController);
  });

  it('register delegates to the service', async () => {
    const dto = { fullName: 'Aziz', phone: '+998901234567', password: 'Secret123' };
    authService.register.mockResolvedValue(response);
    await expect(controller.register(dto)).resolves.toBe(response);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login delegates to the service', async () => {
    const dto = { phone: '+998901234567', password: 'Secret123' };
    authService.login.mockResolvedValue(response);
    await expect(controller.login(dto)).resolves.toBe(response);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('refresh passes the refresh token', async () => {
    const tokens = { accessToken: 'a2' } as AuthTokens;
    authService.refresh.mockResolvedValue(tokens);
    await expect(controller.refresh({ refreshToken: 'r' })).resolves.toBe(tokens);
    expect(authService.refresh).toHaveBeenCalledWith('r');
  });

  it('logout revokes the current user', async () => {
    authService.logout.mockResolvedValue(undefined);
    await controller.logout({ id: 'u1', role: 'USER' });
    expect(authService.logout).toHaveBeenCalledWith('u1');
  });
});
