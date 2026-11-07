import {
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponse, PaginationMeta } from '@nestjs-template/types';
import type { PaginationQueryDto } from '../dto/pagination-query.dto';
import type { CrudRepository, EntityId } from './crud-repository.interface';

interface PrismaLikeError {
  code: string;
  meta?: { target?: unknown };
}

function isPrismaLikeError(error: unknown): error is PrismaLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

/**
 * Generic CRUD service. A feature service extends it and only adds its own business rules:
 *
 * ```ts
 * @Injectable()
 * export class ToursService extends BaseService<TourRecord, CreateTourDto, UpdateTourDto, Tour> {
 *   protected readonly entityName = 'Tour';
 *   protected readonly sortableFields = ['createdAt', 'price'] as const;
 *   constructor(prisma: PrismaService) { super(createTourRepository(prisma)); }
 *   protected toResponse(record: TourRecord): Tour { ... }  // strip private fields
 * }
 * ```
 *
 * @typeParam TEntity   what the repository returns (e.g. Prisma model)
 * @typeParam TCreate   create DTO
 * @typeParam TUpdate   update DTO
 * @typeParam TResponse shared response type from `@nestjs-template/types` (defaults to TEntity)
 * @typeParam TId       primary key type
 */
export abstract class BaseService<
  TEntity,
  TCreate,
  TUpdate,
  TResponse = TEntity,
  TId extends EntityId = number,
> {
  /** Human-readable name used in error messages: `Tour #12 not found`. */
  protected abstract readonly entityName: string;
  /** Fields a client may pass as `sortBy`. Empty means sorting by a field is not allowed. */
  protected readonly sortableFields: readonly string[] = [];
  protected readonly logger: Logger;

  protected constructor(protected readonly repository: CrudRepository<TEntity, TCreate, TUpdate, TId>) {
    this.logger = new Logger(this.constructor.name);
  }

  /** Maps a stored entity to the public response shape. Override to hide internal fields. */
  protected toResponse(entity: TEntity): TResponse {
    return entity as unknown as TResponse;
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<TResponse>> {
    const { page, limit, sortBy, sortOrder, search } = query;
    if (sortBy !== undefined && !this.sortableFields.includes(sortBy)) {
      const allowed = this.sortableFields.length > 0 ? this.sortableFields.join(', ') : 'none';
      throw new BadRequestException(`Cannot sort ${this.entityName} by "${sortBy}". Allowed: ${allowed}`);
    }

    const [items, total] = await Promise.all([
      this.repository.findMany({ skip: (page - 1) * limit, take: limit, sortBy, sortOrder, search }),
      this.repository.count({ search }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: TId): Promise<TResponse> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  async create(dto: TCreate): Promise<TResponse> {
    try {
      return this.toResponse(await this.repository.create(dto));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: TId, dto: TUpdate): Promise<TResponse> {
    await this.findEntityOrFail(id);
    try {
      return this.toResponse(await this.repository.update(id, dto));
    } catch (error) {
      throw this.mapError(error, id);
    }
  }

  async remove(id: TId): Promise<void> {
    await this.findEntityOrFail(id);
    try {
      await this.repository.delete(id);
    } catch (error) {
      throw this.mapError(error, id);
    }
  }

  /** Loads the raw entity or throws `NotFoundException`. Use it in custom methods too. */
  protected async findEntityOrFail(id: TId): Promise<TEntity> {
    const entity = await this.repository.findById(id);
    if (entity === null || entity === undefined) {
      throw this.notFound(id);
    }
    return entity;
  }

  protected notFound(id: TId): NotFoundException {
    return new NotFoundException(`${this.entityName} #${id} not found`);
  }

  /** Converts known persistence errors (Prisma codes) into HTTP exceptions; rethrows the rest. */
  protected mapError(error: unknown, id?: TId): unknown {
    if (error instanceof HttpException) return error;
    if (isPrismaLikeError(error)) {
      switch (error.code) {
        case 'P2002': {
          const target = Array.isArray(error.meta?.target) ? ` (${error.meta.target.join(', ')})` : '';
          return new ConflictException(`${this.entityName} already exists${target}`);
        }
        case 'P2025':
          return id !== undefined ? this.notFound(id) : new NotFoundException(`${this.entityName} not found`);
        case 'P2003':
          return new BadRequestException(`${this.entityName} references a record that does not exist`);
      }
    }
    return error;
  }
}
