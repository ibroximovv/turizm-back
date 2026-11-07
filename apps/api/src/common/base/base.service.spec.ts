import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { BaseService, buildPaginationMeta } from './base.service';
import type { CrudRepository } from './crud-repository.interface';

interface ItemRecord {
  id: number;
  name: string;
  secret: string;
}
interface Item {
  id: number;
  name: string;
}
type CreateItem = { name: string };
type UpdateItem = Partial<CreateItem>;

class ItemsService extends BaseService<ItemRecord, CreateItem, UpdateItem, Item> {
  protected readonly entityName = 'Item';
  protected readonly sortableFields = ['name'];

  constructor(repository: CrudRepository<ItemRecord, CreateItem, UpdateItem>) {
    super(repository);
  }

  protected toResponse({ id, name }: ItemRecord): Item {
    return { id, name };
  }
}

const record: ItemRecord = { id: 1, name: 'Samarkand', secret: 'x' };

function query(overrides: Partial<PaginationQueryDto> = {}): PaginationQueryDto {
  return Object.assign(new PaginationQueryDto(), overrides);
}

describe('BaseService', () => {
  let repo: jest.Mocked<CrudRepository<ItemRecord, CreateItem, UpdateItem>>;
  let service: ItemsService;

  beforeEach(() => {
    repo = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new ItemsService(repo);
  });

  describe('findAll', () => {
    it('returns mapped items with pagination meta', async () => {
      repo.findMany.mockResolvedValue([record]);
      repo.count.mockResolvedValue(21);

      const result = await service.findAll(query({ page: 2, limit: 10, sortBy: 'name', search: 'sam' }));

      expect(repo.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        sortBy: 'name',
        sortOrder: 'desc',
        search: 'sam',
      });
      expect(repo.count).toHaveBeenCalledWith({ search: 'sam' });
      expect(result).toEqual({
        data: [{ id: 1, name: 'Samarkand' }],
        meta: { page: 2, limit: 10, total: 21, totalPages: 3, hasNext: true, hasPrev: true },
      });
    });

    it('rejects a sortBy field that is not allowed', async () => {
      await expect(service.findAll(query({ sortBy: 'secret' }))).rejects.toThrow(
        new BadRequestException('Cannot sort Item by "secret". Allowed: name'),
      );
      expect(repo.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the mapped entity', async () => {
      repo.findById.mockResolvedValue(record);
      await expect(service.findOne(1)).resolves.toEqual({ id: 1, name: 'Samarkand' });
    });

    it('throws NotFoundException when missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne(7)).rejects.toThrow(new NotFoundException('Item #7 not found'));
    });
  });

  describe('create', () => {
    it('creates and maps the entity', async () => {
      repo.create.mockResolvedValue(record);
      await expect(service.create({ name: 'Samarkand' })).resolves.toEqual({ id: 1, name: 'Samarkand' });
      expect(repo.create).toHaveBeenCalledWith({ name: 'Samarkand' });
    });

    it('maps a unique constraint error (P2002) to ConflictException', async () => {
      repo.create.mockRejectedValue({ code: 'P2002', meta: { target: ['name'] } });
      await expect(service.create({ name: 'Samarkand' })).rejects.toThrow(
        new ConflictException('Item already exists (name)'),
      );
    });

    it('rethrows unknown errors unchanged', async () => {
      const error = new Error('db down');
      repo.create.mockRejectedValue(error);
      await expect(service.create({ name: 'x' })).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('updates an existing entity', async () => {
      repo.findById.mockResolvedValue(record);
      repo.update.mockResolvedValue({ ...record, name: 'Bukhara' });
      await expect(service.update(1, { name: 'Bukhara' })).resolves.toEqual({ id: 1, name: 'Bukhara' });
      expect(repo.update).toHaveBeenCalledWith(1, { name: 'Bukhara' });
    });

    it('throws NotFoundException when missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(3, { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('maps a record-not-found race (P2025) to NotFoundException', async () => {
      repo.findById.mockResolvedValue(record);
      repo.update.mockRejectedValue({ code: 'P2025' });
      await expect(service.update(1, { name: 'x' })).rejects.toThrow(new NotFoundException('Item #1 not found'));
    });
  });

  describe('remove', () => {
    it('deletes an existing entity', async () => {
      repo.findById.mockResolvedValue(record);
      repo.delete.mockResolvedValue(undefined);
      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('maps a foreign key error (P2003) to BadRequestException', async () => {
      repo.findById.mockResolvedValue(record);
      repo.delete.mockRejectedValue({ code: 'P2003' });
      await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('buildPaginationMeta', () => {
  it('handles an empty result', () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });
});
