import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncState } from 'dexie-cloud-addon';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { seedDocCrdt } from '@/lib/docs';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { registerEditorHandle } from '@/lib/collab/editorRegistry';
import { serializedBody } from '@/test/fixtures';
import { reconcilePulledDocs, startCloudReconciler } from './reconcile';

const FIXED_TIME = 1_700_000_000_000;

const makeDoc = (id: string, body: string): Doc => ({
  id,
  spaceId: 's1',
  sectionId: 'sec1',
  name: id,
  body,
  meta: { wordCount: 0 },
  updatedAt: FIXED_TIME,
});

/** Add a doc whose local CRDT log was seeded from `localBody`. */
const seedLocalDoc = async (id: string, localBody: string): Promise<void> => {
  await db.docs.add(makeDoc(id, localBody));
  await seedDocCrdt(id, localBody);
};

/** Simulate a cloud pull overwriting the row body (as the addon would). */
const simulatePull = async (id: string, pulledBody: string): Promise<void> => {
  await db.docs.update(id, { body: pulledBody });
};

const canonical = (id: string, body: string): string =>
  serializeDocSnapshot(id, [seedFromLexicalJson(id, body)]);

const updateRows = (id: string): Promise<{ payload: Uint8Array }[]> =>
  db.docUpdates.where('docId').equals(id).toArray();

describe('reconcilePulledDocs', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('leaves a non-divergent doc untouched (no revision, no reseed)', async () => {
    const body = serializedBody('local and remote agree');
    await seedLocalDoc('d1', body);
    const before = await updateRows('d1');

    const results = await reconcilePulledDocs();

    expect(results).toEqual([]);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    expect(await updateRows('d1')).toHaveLength(before.length);
  });

  it('does not write docUpdates for a body that matches the local snapshot after canonicalisation', async () => {
    // A body seeded but never opened keeps its stale (non-canonical) row form,
    // yet must still count as locally produced — no reseed.
    const body = serializedBody('stale but mine');
    await seedLocalDoc('d1', body);
    const before = await updateRows('d1');

    await reconcilePulledDocs();

    expect(await updateRows('d1')).toHaveLength(before.length);
  });

  it('reseeds a divergent unmounted doc so the next open shows the pulled content', async () => {
    await seedLocalDoc('d1', serializedBody('the local version'));
    const pulled = serializedBody('the pulled remote version');
    await simulatePull('d1', pulled);

    const results = await reconcilePulledDocs();

    expect(results).toEqual([{ docId: 'd1', action: 'reseeded' }]);
    const snapshot = serializeDocSnapshot(
      'd1',
      (await updateRows('d1')).map((r) => r.payload),
    );
    expect(snapshot).toBe(canonical('d1', pulled));
  });

  it('keeps a safety revision of the local (losing) side for every reconciled doc', async () => {
    await seedLocalDoc('d1', serializedBody('local one'));
    await seedLocalDoc('d2', serializedBody('local two'));
    await simulatePull('d1', serializedBody('remote one'));
    await simulatePull('d2', serializedBody('remote two'));

    await reconcilePulledDocs();

    expect(await db.revisions.where('docId').equals('d1').count()).toBe(1);
    expect(await db.revisions.where('docId').equals('d2').count()).toBe(1);
    const rev = await db.revisions.where('docId').equals('d1').first();
    expect(rev?.text).toContain('local one');
  });

  it('updates a mounted divergent doc through its live editor handle, not by reseeding', async () => {
    await seedLocalDoc('d1', serializedBody('local content'));
    const pulled = serializedBody('remote content');
    await simulatePull('d1', pulled);
    const restoreBody = vi.fn();
    const unregister = registerEditorHandle('d1', { restoreBody });
    const before = await updateRows('d1');

    const results = await reconcilePulledDocs();
    unregister();

    expect(results).toEqual([{ docId: 'd1', action: 'restored' }]);
    expect(restoreBody).toHaveBeenCalledWith(pulled);
    // The mounted path does not clear/reseed the log directly.
    expect(await updateRows('d1')).toHaveLength(before.length);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(1);
  });

  it('is idempotent — a second run reseeds nothing and adds no revision', async () => {
    await seedLocalDoc('d1', serializedBody('local'));
    await simulatePull('d1', serializedBody('remote'));

    await reconcilePulledDocs();
    const afterFirst = await updateRows('d1');
    const revsAfterFirst = await db.revisions.where('docId').equals('d1').count();

    const second = await reconcilePulledDocs();

    expect(second).toEqual([]);
    expect(await updateRows('d1')).toHaveLength(afterFirst.length);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(
      revsAfterFirst,
    );
  });
});

interface StubObservable {
  observable: { subscribe: (next: (s: SyncState) => void) => { unsubscribe: () => void } };
  emit: (phase: SyncState['phase']) => void;
  hasListener: () => boolean;
}

const stubObservable = (): StubObservable => {
  let listener: ((s: SyncState) => void) | null = null;
  return {
    observable: {
      subscribe: (next) => {
        listener = next;
        return {
          unsubscribe: () => {
            listener = null;
          },
        };
      },
    },
    emit: (phase) => listener?.({ status: 'connected', phase }),
    hasListener: () => listener !== null,
  };
};

describe('startCloudReconciler', () => {
  it('runs reconcile on every transition out of the pulling phase', () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    startCloudReconciler(stub.observable, run);

    stub.emit('pulling');
    expect(run).not.toHaveBeenCalled();
    stub.emit('in-sync');
    expect(run).toHaveBeenCalledTimes(1);
    stub.emit('pulling');
    stub.emit('pushing');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs once when initial sync first reaches in-sync without a prior pull', () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    startCloudReconciler(stub.observable, run);

    stub.emit('in-sync');
    stub.emit('in-sync');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not run on unrelated phases and stops after unsubscribe', () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startCloudReconciler(stub.observable, run);

    stub.emit('initial');
    stub.emit('offline');
    expect(run).not.toHaveBeenCalled();

    stop();
    expect(stub.hasListener()).toBe(false);
    stub.emit('in-sync');
    expect(run).not.toHaveBeenCalled();
  });
});
