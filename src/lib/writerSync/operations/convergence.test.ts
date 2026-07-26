import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '@/lib/syncProviders/ids';
import type { SyncOperationHeader } from './operation.types';
import { compareOperations, supersedes } from './convergence';

const header = (overrides: Partial<SyncOperationHeader>): SyncOperationHeader => ({
  v: 1,
  operationId: asOperationId('op-a'),
  accessScopeId: 's1',
  entityTable: 'notes',
  entityId: 'n1',
  kind: 'put',
  deviceId: asDeviceId('dev-a'),
  logicalAt: { millis: 1000, counter: 0 },
  keyId: 'k',
  epoch: 1,
  payloadHash: '',
  ...overrides,
});

describe('compareOperations', () => {
  it('orders by hybrid logical time first', () => {
    const earlier = header({ logicalAt: { millis: 1000, counter: 0 } });
    const later = header({ logicalAt: { millis: 1000, counter: 1 } });
    expect(compareOperations(earlier, later)).toBeLessThan(0);
    expect(supersedes(later, earlier)).toBe(true);
  });

  it('breaks equal timestamps deterministically by device id', () => {
    const a = header({ deviceId: asDeviceId('dev-a') });
    const b = header({ deviceId: asDeviceId('dev-b') });
    expect(supersedes(b, a)).toBe(true);
    expect(supersedes(a, b)).toBe(false);
    // The same answer regardless of comparison direction — a total order.
    expect(compareOperations(a, b)).toBe(-compareOperations(b, a));
  });

  it('falls back to the operation id for a full total order', () => {
    const first = header({ operationId: asOperationId('op-a') });
    const second = header({ operationId: asOperationId('op-b') });
    expect(supersedes(second, first)).toBe(true);
  });

  it('never lets provider arrival order matter — comparison is pure data', () => {
    const x = header({ logicalAt: { millis: 2000, counter: 0 } });
    const y = header({ logicalAt: { millis: 1000, counter: 5 } });
    // Whichever arrives first, the same operation wins.
    expect(supersedes(x, y)).toBe(true);
    expect(supersedes(y, x)).toBe(false);
  });
});
