import type { SortOrder } from '@nestjs-template/types';

export type EntityId = number | string;

export interface FindManyArgs {
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder: SortOrder;
  search?: string;
}

/**
 * Data-access contract used by `BaseService`. Each feature implements it on top of its
 * Prisma delegate (e.g. `prisma.tour`), keeping Prisma details out of the base layer:
 *
 * ```ts
 * const repo: CrudRepository<Tour, CreateTourDto, UpdateTourDto, number> = {
 *   findMany: ({ skip, take, sortBy, sortOrder }) =>
 *     prisma.tour.findMany({ skip, take, orderBy: sortBy ? { [sortBy]: sortOrder } : undefined }),
 *   count: () => prisma.tour.count(),
 *   findById: (id) => prisma.tour.findUnique({ where: { id } }),
 *   create: (data) => prisma.tour.create({ data }),
 *   update: (id, data) => prisma.tour.update({ where: { id }, data }),
 *   delete: async (id) => { await prisma.tour.delete({ where: { id } }); },
 * };
 * ```
 */
export interface CrudRepository<TEntity, TCreate, TUpdate, TId extends EntityId = number> {
  findMany(args: FindManyArgs): Promise<TEntity[]>;
  count(args: Pick<FindManyArgs, 'search'>): Promise<number>;
  findById(id: TId): Promise<TEntity | null>;
  create(data: TCreate): Promise<TEntity>;
  update(id: TId, data: TUpdate): Promise<TEntity>;
  delete(id: TId): Promise<void>;
}
