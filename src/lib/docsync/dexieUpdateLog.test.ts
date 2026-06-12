import { describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { InvariantError } from '@/lib/invariant';
import { describeUpdateLogContract } from '@/test/docsync/updateLogContract';
import { dexieUpdateLog } from './dexieUpdateLog';

// The shared port contract (also run against the in-memory fake).
describeUpdateLogContract(() => dexieUpdateLog);

describe('dexieUpdateLog (Dexie specifics)', () => {
  it('persists the bumped epoch so stale appends stay invisible across loads', async () => {
    await dexieUpdateLog.append('doc-a', 0, Uint8Array.from([1]));
    await dexieUpdateLog.invalidate('doc-a');
    await dexieUpdateLog.append('doc-a', 0, Uint8Array.from([2]));
    expect(await db.docSyncMeta.get('doc-a')).toEqual({
      docId: 'doc-a',
      epoch: 1,
    });
    const state = await dexieUpdateLog.load('doc-a');
    expect(state.updates).toEqual([]);
    // The stale row was garbage-collected by the load, not just filtered.
    expect(await db.docSyncUpdates.where('docId').equals('doc-a').count()).toBe(
      0,
    );
  });

  it('rejects a stored row holding an invalid payload', async () => {
    await db.docSyncUpdates.add({
      docId: 'doc-a',
      epoch: 0,
      update: new Uint8Array(0),
      createdAt: Date.now(),
    });
    await expect(dexieUpdateLog.load('doc-a')).rejects.toThrow(InvariantError);
  });

  it('deleteAll clears meta rows alongside updates', async () => {
    await dexieUpdateLog.append('doc-a', 0, Uint8Array.from([1]));
    await dexieUpdateLog.invalidate('doc-a');
    await dexieUpdateLog.deleteAll(['doc-a']);
    expect(await db.docSyncMeta.get('doc-a')).toBeUndefined();
  });
});
