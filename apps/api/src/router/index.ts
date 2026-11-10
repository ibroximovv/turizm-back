import { Module, type Type } from '@nestjs/common';
import { RouterModule, type RouteTree, type Routes } from '@nestjs/core';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';

/**
 * Every feature route of the API is declared here, and only here.
 *
 * - Feature controllers use `@Controller()` (or a sub-path) without the module prefix;
 *   the prefix comes from this tree.
 * - A module listed here is imported automatically, so it is NOT added to AppModule.
 * - Final URL: `/<API_PREFIX>/<version>/<path>/...`, e.g. `GET /api/v1/tours/12`.
 *
 * Example:
 * ```ts
 * { path: 'v1', children: [
 *   { path: 'auth', module: AuthModule },
 *   { path: 'tours', module: ToursModule, children: [{ path: ':tourId/reviews', module: ReviewsModule }] },
 * ] }
 * ```
 */
export const appRoutes: Routes = [
  {
    path: 'v1',
    children: [
      { path: 'auth', module: AuthModule },
      { path: 'users', module: UsersModule },
    ],
  },
];

/** Collects every module referenced in the route tree (depth-first, de-duplicated). */
export function collectRouteModules(routes: Routes): Type<unknown>[] {
  const modules = new Set<Type<unknown>>();
  const visit = (nodes: (RouteTree | Type<unknown>)[]): void => {
    for (const node of nodes) {
      if (typeof node === 'function') {
        modules.add(node);
        continue;
      }
      if (node.module) modules.add(node.module);
      if (node.children) visit(node.children);
    }
  };
  visit(routes);
  return [...modules];
}

@Module({
  imports: [RouterModule.register(appRoutes), ...collectRouteModules(appRoutes)],
})
export class AppRouterModule {}
