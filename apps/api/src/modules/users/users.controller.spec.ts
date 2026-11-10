import { Test } from '@nestjs/testing';
import type { User } from '@nestjs-template/types';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  const usersService = { findOne: jest.fn() };
  let controller: UsersController;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = moduleRef.get(UsersController);
  });

  it('GET /me returns the signed-in user', async () => {
    const user = { id: 'u1', fullName: 'Aziz' } as User;
    usersService.findOne.mockResolvedValue(user);
    await expect(controller.me({ id: 'u1', role: 'USER' })).resolves.toBe(user);
    expect(usersService.findOne).toHaveBeenCalledWith('u1');
  });
});
