import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserResponse, type UserRecord, UsersService } from './users.service';

export function makeUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: '7f1c2b4e-1d2a-4c3b-9a8e-0f1e2d3c4b5a',
    fullName: 'Aziz Karimov',
    phone: '+998901234567',
    email: 'aziz@example.com',
    passwordHash: 'hashed-password',
    role: 'USER',
    isActive: true,
    refreshTokenHash: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('UsersService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: UsersService;
  const record = makeUserRecord();

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('toUserResponse', () => {
    it('drops hashes and serializes dates', () => {
      const user = toUserResponse(makeUserRecord({ lastLoginAt: new Date('2026-01-03T00:00:00.000Z') }));
      expect(user).toEqual({
        id: record.id,
        fullName: 'Aziz Karimov',
        phone: '+998901234567',
        email: 'aziz@example.com',
        role: 'USER',
        isActive: true,
        lastLoginAt: '2026-01-03T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('refreshTokenHash');
    });
  });

  describe('findOne', () => {
    it('returns the public user', async () => {
      prisma.user.findUnique.mockResolvedValue(record);
      await expect(service.findOne(record.id)).resolves.toEqual(toUserResponse(record));
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: record.id } });
    });

    it('throws NotFoundException when missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(new NotFoundException('User #missing not found'));
    });
  });

  describe('findByPhone / findByEmail / findByIdOrNull', () => {
    it('looks the user up by the unique field', async () => {
      prisma.user.findUnique.mockResolvedValue(record);
      await expect(service.findByPhone(record.phone)).resolves.toBe(record);
      await expect(service.findByEmail('aziz@example.com')).resolves.toBe(record);
      await expect(service.findByIdOrNull(record.id)).resolves.toBe(record);
      expect(prisma.user.findUnique.mock.calls).toEqual([
        [{ where: { phone: record.phone } }],
        [{ where: { email: 'aziz@example.com' } }],
        [{ where: { id: record.id } }],
      ]);
    });

    it('returns null when nothing matches', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByPhone('+998900000000')).resolves.toBeNull();
      await expect(service.findByEmail('none@example.com')).resolves.toBeNull();
      await expect(service.findByIdOrNull('missing')).resolves.toBeNull();
    });
  });

  describe('findRecordById', () => {
    it('returns the raw record', async () => {
      prisma.user.findUnique.mockResolvedValue(record);
      await expect(service.findRecordById(record.id)).resolves.toBe(record);
    });

    it('throws NotFoundException when missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findRecordById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRecord', () => {
    const data = { fullName: 'Aziz Karimov', phone: '+998901234567', email: null, passwordHash: 'hash' };

    it('creates the user', async () => {
      prisma.user.create.mockResolvedValue(record);
      await expect(service.createRecord(data)).resolves.toBe(record);
      expect(prisma.user.create).toHaveBeenCalledWith({ data });
    });

    it('maps a unique violation (P2002) to ConflictException', async () => {
      prisma.user.create.mockRejectedValue({ code: 'P2002', meta: {} });
      await expect(service.createRecord(data)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRecord', () => {
    it('updates the user', async () => {
      prisma.user.update.mockResolvedValue(record);
      await expect(service.updateRecord(record.id, { refreshTokenHash: null })).resolves.toBe(record);
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { refreshTokenHash: null } });
    });

    it('maps a missing record (P2025) to NotFoundException', async () => {
      prisma.user.update.mockRejectedValue({ code: 'P2025' });
      await expect(service.updateRecord('missing', { fullName: 'X' })).rejects.toThrow(
        new NotFoundException('User #missing not found'),
      );
    });
  });
});
