import { describe, expect, it } from 'vitest';
import { KeyEscrowPresence, type SyncObservable } from 'writer-sync/core';
import type { CloudObservable } from '@/lib/cloud/cloudObservable';

/**
 * The integration-side half of the observable contract: Writer's cloud
 * subsystem must satisfy the engine's `SyncObservable` structurally, with no
 * cast and without either module importing the other. The engine cannot assert
 * this itself — it must not know that a cloud observable exists.
 */
describe('the cloud observable against the engine contract', () => {
  it('is assignable to SyncObservable with no cast', () => {
    const cloudEscrow: CloudObservable<KeyEscrowPresence> = {
      subscribe: (next) => {
        next(KeyEscrowPresence.Present);
        return { unsubscribe: () => undefined };
      },
    };
    const asSyncObservable: SyncObservable<KeyEscrowPresence> = cloudEscrow;

    const seen: KeyEscrowPresence[] = [];
    asSyncObservable.subscribe((value) => seen.push(value)).unsubscribe();

    expect(seen).toEqual([KeyEscrowPresence.Present]);
  });
});
