import { Module } from '@nestjs/common';
import { collectRouteModules } from './index';

@Module({})
class AModule {}
@Module({})
class BModule {}
@Module({})
class CModule {}

describe('collectRouteModules', () => {
  it('collects nested modules once, in declaration order', () => {
    const modules = collectRouteModules([
      {
        path: 'v1',
        children: [
          { path: 'a', module: AModule, children: [{ path: ':id/b', module: BModule }] },
          CModule,
          { path: 'a-again', module: AModule },
        ],
      },
    ]);
    expect(modules).toEqual([AModule, BModule, CModule]);
  });

  it('returns an empty list for an empty tree', () => {
    expect(collectRouteModules([{ path: 'v1', children: [] }])).toEqual([]);
  });
});
