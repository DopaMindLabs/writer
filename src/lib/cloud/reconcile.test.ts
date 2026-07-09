import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncState } from 'dexie-cloud-addon';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { seedDocCrdt, EMPTY_LEXICAL_JSON } from '@/lib/docs';
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

/**
 * The canonical serialized body for `text` — the exact form the editor (and thus
 * every real docs.body) emits, so a seeded doc's CRDT snapshot equals it exactly.
 */
const canon = (text: string): string =>
  serializeDocSnapshot('c', [seedFromLexicalJson('c', serializedBody(text))]);

/** Add a doc whose local CRDT log was seeded from `localBody`. */
const seedLocalDoc = async (id: string, localBody: string): Promise<void> => {
  await db.docs.add(makeDoc(id, localBody));
  await seedDocCrdt(id, localBody);
};

/** Add a doc row with a body but no CRDT log — the state after a logout wipe. */
const addDocWithoutCrdt = async (id: string, body: string): Promise<void> => {
  await db.docs.add(makeDoc(id, body));
};

/** Simulate a cloud pull overwriting the row body (as the addon would). */
const simulatePull = async (id: string, pulledBody: string): Promise<void> => {
  await db.docs.update(id, { body: pulledBody });
};

const updateRows = (id: string): Promise<{ payload: Uint8Array }[]> =>
  db.docUpdates.where('docId').equals(id).toArray();

const crdtSnapshot = async (id: string): Promise<string> =>
  serializeDocSnapshot(id, (await updateRows(id)).map((r) => r.payload));

describe('reconcilePulledDocs', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('leaves a non-divergent doc untouched (no revision, no reseed)', async () => {
    await seedLocalDoc('d1', canon('local and remote agree'));
    const before = await updateRows('d1');

    const results = await reconcilePulledDocs();

    expect(results).toEqual([]);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    expect(await updateRows('d1')).toHaveLength(before.length);
  });

  it('treats a freshly seeded empty doc as non-divergent (the empty body is canonical)', async () => {
    await seedLocalDoc('d1', EMPTY_LEXICAL_JSON);
    const before = await updateRows('d1');

    const results = await reconcilePulledDocs();

    expect(results).toEqual([]);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    expect(await updateRows('d1')).toHaveLength(before.length);
  });

  it('reseeds a divergent unmounted doc so the next open shows the pulled content', async () => {
    await seedLocalDoc('d1', canon('the local version'));
    const pulled = canon('the pulled remote version');
    await simulatePull('d1', pulled);

    const results = await reconcilePulledDocs();

    expect(results).toEqual([{ docId: 'd1', action: 'reseeded' }]);
    expect(await crdtSnapshot('d1')).toBe(pulled);
  });

  it('keeps a safety revision of the local (losing) side for every reconciled doc', async () => {
    await seedLocalDoc('d1', canon('local one'));
    await seedLocalDoc('d2', canon('local two'));
    await simulatePull('d1', canon('remote one'));
    await simulatePull('d2', canon('remote two'));

    await reconcilePulledDocs();

    expect(await db.revisions.where('docId').equals('d1').count()).toBe(1);
    expect(await db.revisions.where('docId').equals('d2').count()).toBe(1);
    const rev = await db.revisions.where('docId').equals('d1').first();
    expect(rev?.text).toContain('local one');
  });

  it('updates a mounted divergent doc through its live editor handle when the editor is clean', async () => {
    await seedLocalDoc('d1', canon('local content'));
    const pulled = canon('remote content');
    await simulatePull('d1', pulled);
    const restoreBody = vi.fn();
    const flush = vi.fn(() => false);
    const unregister = registerEditorHandle('d1', { restoreBody, flush });
    const before = await updateRows('d1');

    const results = await reconcilePulledDocs();
    unregister();

    expect(results).toEqual([{ docId: 'd1', action: 'restored' }]);
    expect(flush).toHaveBeenCalled();
    expect(restoreBody).toHaveBeenCalledWith(pulled);
    // The mounted path does not clear/reseed the log directly.
    expect(await updateRows('d1')).toHaveLength(before.length);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(1);
  });

  it('leaves a mounted editor untouched when its autosave flush reports pending edits (same-device lag, not a pull)', async () => {
    await seedLocalDoc('d1', canon('local content'));
    // docs.body lags the CRDT during the debounce, so it reads as divergent…
    await simulatePull('d1', canon('newer local content'));
    const restoreBody = vi.fn();
    const flush = vi.fn(() => true); // …but the flush reports unsaved edits.
    const unregister = registerEditorHandle('d1', { restoreBody, flush });
    const before = await updateRows('d1');

    const results = await reconcilePulledDocs();
    unregister();

    expect(results).toEqual([]);
    expect(flush).toHaveBeenCalled();
    expect(restoreBody).not.toHaveBeenCalled(); // live text is never clobbered
    expect(await updateRows('d1')).toHaveLength(before.length);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
  });

  it('heals an empty CRDT log from the pulled body without a spurious revision', async () => {
    // A logout wipe leaves the docs row (with body) but no docUpdates log.
    const pulled = canon('recovered after sign-out');
    await addDocWithoutCrdt('d1', pulled);

    const results = await reconcilePulledDocs();

    expect(results).toEqual([{ docId: 'd1', action: 'reseeded' }]);
    // The empty local side is an artefact, not a losing edit — no revision kept.
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    // The log is healed from the body, and a second run is a no-op.
    expect(await crdtSnapshot('d1')).toBe(pulled);
    expect(await reconcilePulledDocs()).toEqual([]);
  });

  it('heals an empty log through a mounted editor handle (no revision)', async () => {
    const pulled = canon('recovered live');
    await addDocWithoutCrdt('d1', pulled);
    const restoreBody = vi.fn();
    const flush = vi.fn(() => false);
    const unregister = registerEditorHandle('d1', { restoreBody, flush });

    const results = await reconcilePulledDocs();
    unregister();

    expect(results).toEqual([{ docId: 'd1', action: 'restored' }]);
    // The empty-log path heals before the flush/revision logic.
    expect(flush).not.toHaveBeenCalled();
    expect(restoreBody).toHaveBeenCalledWith(pulled);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
  });

  it('isolates a per-doc failure so the rest of the sweep still reconciles', async () => {
    // A doc whose handle throws must not abort reconciliation of the others.
    await addDocWithoutCrdt('d1', canon('first'));
    await addDocWithoutCrdt('d2', canon('second'));
    const unregister = registerEditorHandle('d1', {
      restoreBody: () => {
        throw new Error('boom');
      },
      flush: () => false,
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const results = await reconcilePulledDocs();
    unregister();
    errorSpy.mockRestore();

    expect(results).toEqual([{ docId: 'd2', action: 'reseeded' }]);
    expect(await crdtSnapshot('d2')).toBe(canon('second'));
  });

  it('is idempotent — a second run reseeds nothing and adds no revision', async () => {
    await seedLocalDoc('d1', canon('local'));
    await simulatePull('d1', canon('remote'));

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
