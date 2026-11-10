import { Injectable } from '@nestjs/common';
import type { User } from '@nestjs-template/types';
import { BaseService } from '../../common/base/base.service';
import type { CrudRepository } from '../../common/base/crud-repository.interface';
import type { User as UserRecord } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type { UserRecord };

/** Data needed to create a user. The password is already hashed by the caller (AuthService). */
export interface CreateUserData {
  fullName: string;
  phone: string;
  email?: string | null;
  passwordHash: string;
}

export type UpdateUserData = Partial<
  Pick<UserRecord, 'fullName' | 'email' | 'isActive' | 'refreshTokenHash' | 'lastLoginAt'>
>;

export function toUserResponse(record: UserRecord): User {
  return {
    id: record.id,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    role: record.role,
    isActive: record.isActive,
    lastLoginAt: record.lastLoginAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function createUserRepository(prisma: PrismaService): CrudRepository<UserRecord, CreateUserData, UpdateUserData, string> {
  return {
    findMany: ({ skip, take, sortBy, sortOrder }) =>
      prisma.user.findMany({ skip, take, orderBy: { [sortBy ?? 'createdAt']: sortOrder } }),
    count: () => prisma.user.count(),
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    create: (data) => prisma.user.create({ data }),
    update: (id, data) => prisma.user.update({ where: { id }, data }),
    delete: async (id) => {
      await prisma.user.delete({ where: { id } });
    },
  };
}

@Injectable()
export class UsersService extends BaseService<UserRecord, CreateUserData, UpdateUserData, User, string> {
  protected readonly entityName = 'User';
  protected readonly sortableFields = ['createdAt', 'fullName'];

  constructor(private readonly prisma: PrismaService) {
    super(createUserRepository(prisma));
  }

  protected toResponse(record: UserRecord): User {
    return toUserResponse(record);
  }

  /** Raw record (with hashes) for authentication. Returns null so the caller decides the error. */
  findByPhone(phone: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByIdOrNull(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Raw record (with hashes) or NotFoundException. */
  findRecordById(id: string): Promise<UserRecord> {
    return this.findEntityOrFail(id);
  }

  /** Creates a user and returns the raw record (AuthService signs tokens for it right away). */
  async createRecord(data: CreateUserData): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async updateRecord(id: string, data: UpdateUserData): Promise<UserRecord> {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      throw this.mapError(error, id);
    }
  }
}
