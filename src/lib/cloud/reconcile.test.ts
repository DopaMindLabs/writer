import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { createElement as h, createRef, type RefObject } from 'react';
import type { SyncState, UserLogin } from 'dexie-cloud-addon';
import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { seedDocCrdt, EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { registerEditorHandle } from '@/lib/collab/editorRegistry';
import { collabStore } from '@/lib/collab/collabStore';
import { NO_FLUSH, type FlushResult } from '@/lib/collab/flush.types';
import { serializedBody } from '@/test/fixtures';
import { AutosavePlugin } from '@/editor/plugins/AutosavePlugin';
import { EDITOR_NODES } from '@/editor/nodes';
import { serializeState } from '@/editor/serialize';
import {
  reconcileDocForMount,
  reconcilePulledDocs,
  reconcileWithStatus,
  resetReconcileState,
  startCloudReconciler,
} from './reconcile';
import { reconcileStatus } from './reconcileStatus';

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
    resetReconcileState();
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
    const flush = vi.fn(async () => NO_FLUSH);
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

  it('keeps live local edits but preserves the pulled remote body as a recoverable revision', async () => {
    // The conflict: local unsaved keystrokes (already in the CRDT) vs a body
    // pulled from another device that overwrote the row.
    const localBody = canon('LOCAL unsaved edits');
    const remoteBody = canon('REMOTE pulled body');
    await seedLocalDoc('d1', localBody);
    await simulatePull('d1', remoteBody); // the pulled row body
    const restoreBody = vi.fn();
    // A real flush serialises the editor's CRDT state (localBody) back to the row.
    const flush = vi.fn(async () => {
      await db.docs.update('d1', { body: localBody });
      return { persisted: true as const, body: localBody };
    });
    const unregister = registerEditorHandle('d1', { restoreBody, flush });
    const before = await updateRows('d1');
    // A running reconciler captures the follow-up trigger the kept-local path queues.
    const run = vi.fn().mockResolvedValue(undefined);
    const stopReconciler = startCloudReconciler({
      syncState: stubObservable().observable,
      run,
    });

    const results = await reconcilePulledDocs();

    expect(results).toEqual([{ docId: 'd1', action: 'kept-local' }]);
    expect(flush).toHaveBeenCalled();
    // The same-device-lag follow-up is reported under its own trigger, not 'manual'.
    await settle();
    expect(run).toHaveBeenCalledWith('kept-local');
    stopReconciler();
    expect(restoreBody).not.toHaveBeenCalled(); // live local text is never clobbered
    expect(await updateRows('d1')).toHaveLength(before.length);
    // Local won in the row, and the remote body is not lost — it is recoverable.
    expect((await db.docs.get('d1'))?.body).toBe(localBody);
    const revisions = await db.revisions.where('docId').equals('d1').toArray();
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.body).toBe(remoteBody);

    // Idempotent: with the row now matching the CRDT, a second run is a no-op and
    // adds no further revision.
    expect(await reconcilePulledDocs()).toEqual([]);
    unregister();
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(1);
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
    const flush = vi.fn(async () => NO_FLUSH);
    const unregister = registerEditorHandle('d1', { restoreBody, flush });

    const results = await reconcilePulledDocs();
    unregister();

    expect(results).toEqual([{ docId: 'd1', action: 'restored' }]);
    // The empty-log path heals before the flush/revision logic.
    expect(flush).not.toHaveBeenCalled();
    expect(restoreBody).toHaveBeenCalledWith(pulled);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
  });

  it('does not cache a doc whose restore rejected — it retries on the next sweep', async () => {
    // A mounted restore whose CRDT write fails must leave the doc unreconciled,
    // not stamp a false success that skips it forever.
    await addDocWithoutCrdt('d1', canon('pulled body'));
    const restoreBody = vi
      .fn<(serialized: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('append failed'))
      .mockResolvedValue(undefined);
    const unregister = registerEditorHandle('d1', {
      restoreBody,
      flush: async () => NO_FLUSH,
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // First sweep: the restore rejects, so the doc is a failure, not a result.
    expect(await reconcilePulledDocs()).toEqual([]);
    expect(restoreBody).toHaveBeenCalledTimes(1);

    // Not cached as success: the next sweep retries the same doc and succeeds.
    expect(await reconcilePulledDocs()).toEqual([
      { docId: 'd1', action: 'restored' },
    ]);
    expect(restoreBody).toHaveBeenCalledTimes(2);
    unregister();
    errorSpy.mockRestore();
  });

  it('isolates a per-doc failure so the rest of the sweep still reconciles', async () => {
    // A doc whose handle throws must not abort reconciliation of the others.
    await addDocWithoutCrdt('d1', canon('first'));
    await addDocWithoutCrdt('d2', canon('second'));
    const unregister = registerEditorHandle('d1', {
      restoreBody: () => {
        throw new Error('boom');
      },
      flush: async () => NO_FLUSH,
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

  it('reconciles the mounted (active) document before unmounted ones', async () => {
    // d3 is added last (so it sorts last in the DB scan) but is the mounted doc.
    await addDocWithoutCrdt('d1', canon('one'));
    await addDocWithoutCrdt('d2', canon('two'));
    await addDocWithoutCrdt('d3', canon('three'));
    const unregister = registerEditorHandle('d3', {
      restoreBody: vi.fn(),
      flush: async () => NO_FLUSH,
    });

    const results = await reconcilePulledDocs();
    unregister();

    expect(results[0]?.docId).toBe('d3'); // active doc processed first
    expect(results.map((r) => r.docId).sort()).toEqual(['d1', 'd2', 'd3']);
  });

  it('skips the CRDT load for a doc unchanged since its last reconcile', async () => {
    await addDocWithoutCrdt('d1', canon('stable'));
    expect(await reconcilePulledDocs()).toEqual([{ docId: 'd1', action: 'reseeded' }]);

    // Second sweep: body unchanged → skip the expensive load + snapshot entirely.
    const loadAll = vi.spyOn(collabStore, 'loadAll');
    expect(await reconcilePulledDocs()).toEqual([]);
    expect(loadAll).not.toHaveBeenCalled();

    // Correctness is independent of the cache: clearing it costs the work again
    // but yields the same (already-converged) result.
    resetReconcileState();
    expect(await reconcilePulledDocs()).toEqual([]);
    expect(loadAll).toHaveBeenCalled();
    loadAll.mockRestore();
  });

  it('skips a doc after a metadata-only change — a rename is not a body reconcile', async () => {
    // Reconciliation only ever reconciles the body (the CRDT). A rename bumps
    // name and updatedAt but leaves the body untouched, so it must be skipped
    // rather than forcing a spurious CRDT load and snapshot.
    await seedLocalDoc('d1', canon('stable body'));
    expect(await reconcilePulledDocs()).toEqual([]); // clean; stamps the cache
    const loadAll = vi.spyOn(collabStore, 'loadAll');

    await db.docs.update('d1', { name: 'Renamed', updatedAt: FIXED_TIME + 1000 });

    expect(await reconcilePulledDocs()).toEqual([]);
    expect(loadAll).not.toHaveBeenCalled();
    loadAll.mockRestore();
  });
});

/**
 * These drive reconciliation against the *real* {@link AutosavePlugin} flush
 * rather than a hand-written `() => NO_FLUSH`. That distinction is the whole
 * point: the reported regression was a clean mounted editor reporting a
 * persisted flush (its save baseline started at `null`), which reconciliation
 * read as unsaved local work and used to keep the stale local body over the
 * pulled remote one. A fake NO_FLUSH can never reproduce that; the live plugin
 * can, so this suite would fail if the baseline regressed.
 */
describe('reconcilePulledDocs — with the real autosave flush', () => {
  const EditorProbe = ({ onReady }: { onReady: (e: LexicalEditor) => void }) => {
    const [editor] = useLexicalComposerContext();
    onReady(editor);
    return null;
  };

  const writeText = (text: string): void => {
    const root = $getRoot();
    root.clear();
    const p = $createParagraphNode();
    p.append($createTextNode(text));
    root.append(p);
  };

  /** The body the mounted editor emits for `text` — used as both the seed and
   *  the persisted baseline, so the two match by construction. */
  const composerConfig = {
    namespace: 'lorem-editor',
    nodes: [...EDITOR_NODES],
    onError: (error: Error) => {
      throw error;
    },
  };

  const editorBodyFor = (text: string): string => {
    let editor!: LexicalEditor;
    const { unmount } = render(
      h(
        LexicalComposer,
        { initialConfig: composerConfig },
        h(EditorProbe, { onReady: (e: LexicalEditor) => (editor = e) }),
      ),
    );
    act(() => {
      editor.update(() => writeText(text), { discrete: true });
    });
    const out = serializeState(editor.getEditorState());
    act(() => {
      unmount();
    });
    return out;
  };

  interface MountedEditor {
    editor: LexicalEditor;
    restoreBody: ReturnType<typeof vi.fn>;
    unmount: () => void;
  }

  /** Mount a real AutosavePlugin editor seeded to `body`, registering it as the
   *  handle the reconciler drives — so `flush` is the plugin's true flush. */
  const mountEditor = (body: string, bootstrapText: string): MountedEditor => {
    const flushRef = createRef<() => Promise<FlushResult>>() as RefObject<
      () => Promise<FlushResult>
    >;
    let editor!: LexicalEditor;
    const { unmount } = render(
      h(
        LexicalComposer,
        { initialConfig: composerConfig },
        h(EditorProbe, { onReady: (e: LexicalEditor) => (editor = e) }),
        h(AutosavePlugin, {
          onChange: async () => {},
          debounceMs: 600,
          flushRef,
          persistedBody: body,
        }),
      ),
    );
    // The collaboration bootstrap loads the seed into the live editor.
    act(() => {
      editor.update(() => writeText(bootstrapText), {
        discrete: true,
        tag: 'collaboration',
      });
    });
    const restoreBody = vi.fn();
    const unregister = registerEditorHandle('d1', {
      restoreBody,
      flush: () => flushRef.current(),
    });
    return {
      editor,
      restoreBody,
      unmount: () => {
        unregister();
        act(() => {
          unmount();
        });
      },
    };
  };

  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetReconcileState();
  });

  it('applies the pulled body to a clean mounted editor (does not keep the stale local body)', async () => {
    const localBody = editorBodyFor('device B local content');
    const remoteBody = editorBodyFor('device A pulled content');
    await seedLocalDoc('d1', localBody);
    await simulatePull('d1', remoteBody);
    const mounted = mountEditor(localBody, 'device B local content');

    const results = await reconcilePulledDocs();
    mounted.unmount();

    // The clean editor's real flush reports NO_FLUSH, so the remote body wins.
    expect(results).toEqual([{ docId: 'd1', action: 'restored' }]);
    expect(mounted.restoreBody).toHaveBeenCalledWith(remoteBody);
    // The losing local side is kept recoverable, never silently dropped.
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(1);
  });

  it('keeps genuine unsaved local edits and preserves the pulled body as a revision', async () => {
    const localBody = editorBodyFor('device B local content');
    const remoteBody = editorBodyFor('device A pulled content');
    await seedLocalDoc('d1', localBody);
    await simulatePull('d1', remoteBody);
    const mounted = mountEditor(localBody, 'device B local content');
    // The user types past the baseline — a genuine pending local edit, untagged.
    act(() => {
      mounted.editor.update(() => writeText('device B unsaved keystrokes'), {
        discrete: true,
      });
    });
    // The stale-local-vs-newer-pull follow-up the kept-local path queues needs a
    // running reconciler to absorb it.
    const stopReconciler = startCloudReconciler({
      syncState: stubObservable().observable,
      run: vi.fn().mockResolvedValue(undefined),
    });

    const results = await reconcilePulledDocs();
    await settle();
    stopReconciler();
    mounted.unmount();

    expect(results).toEqual([{ docId: 'd1', action: 'kept-local' }]);
    expect(mounted.restoreBody).not.toHaveBeenCalled();
    const revisions = await db.revisions.where('docId').equals('d1').toArray();
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.body).toBe(remoteBody);
  });
});

describe('reconcileDocForMount', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetReconcileState();
  });

  it('seeds an empty log from the body without a spurious revision', async () => {
    const body = canon('pulled while the doc was closed');
    await addDocWithoutCrdt('d1', body);

    await reconcileDocForMount('d1', body);

    expect(await crdtSnapshot('d1')).toBe(body);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
  });

  it('reseeds a populated log that diverged from the pulled body, keeping the local side', async () => {
    // The CRDT holds stale local content; the body was pulled while closed.
    await seedLocalDoc('d1', canon('stale local content'));

    await reconcileDocForMount('d1', canon('newer pulled content'));

    expect(await crdtSnapshot('d1')).toBe(canon('newer pulled content'));
    const revisions = await db.revisions.where('docId').equals('d1').toArray();
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.text).toContain('stale local content');
  });

  it('leaves a log that already matches the body untouched', async () => {
    await seedLocalDoc('d1', canon('already in sync'));
    const before = await updateRows('d1');

    await reconcileDocForMount('d1', canon('already in sync'));

    expect(await updateRows('d1')).toHaveLength(before.length);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
  });
});

describe('reconcileWithStatus', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    resetReconcileState();
    reconcileStatus.set({ state: 'idle' });
  });

  it('records a succeeded run with counts and no document content', async () => {
    await addDocWithoutCrdt('d1', canon('confidential body text'));

    await reconcileWithStatus('sync-complete');

    const status = reconcileStatus.current();
    expect(status.state).toBe('succeeded');
    if (status.state !== 'succeeded') throw new Error('unreachable');
    expect(status.trigger).toBe('sync-complete');
    expect(status.scanned).toBe(1);
    expect(status.reconciled).toBe(1);
    expect(status.failed).toBe(0);
    // Diagnostics must never carry the decrypted body.
    expect(JSON.stringify(status)).not.toContain('confidential body text');
  });

  it('records a failed run when a document reconcile throws, without leaking content', async () => {
    await addDocWithoutCrdt('d1', canon('confidential body text'));
    const unregister = registerEditorHandle('d1', {
      restoreBody: () => {
        throw new Error('restore boom');
      },
      flush: async () => NO_FLUSH,
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await reconcileWithStatus('key-acquired');
    unregister();
    errorSpy.mockRestore();

    const status = reconcileStatus.current();
    expect(status.state).toBe('failed');
    if (status.state !== 'failed') throw new Error('unreachable');
    expect(status.failed).toBeGreaterThan(0);
    expect(status.error).toContain('restore boom'); // sanitised message surfaced
    expect(JSON.stringify(status)).not.toContain('confidential body text');
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

interface VoidEmitter {
  observable: { subscribe: (next: () => void) => { unsubscribe: () => void } };
  emit: () => void;
  hasListener: () => boolean;
}

/** A `CloudObservable<void>` stub for syncComplete. */
const voidEmitter = (): VoidEmitter => {
  let listener: (() => void) | null = null;
  return {
    observable: {
      subscribe: (next) => {
        listener = next;
        return { unsubscribe: () => { listener = null; } };
      },
    },
    emit: () => listener?.(),
    hasListener: () => listener !== null,
  };
};

interface KeyChangeStub {
  onKeyChange: (listener: () => void) => () => void;
  emit: () => void;
  hasListener: () => boolean;
}

/** A stub for `onDeviceKeyRingChange`. */
const keyChangeStub = (): KeyChangeStub => {
  let listener: (() => void) | null = null;
  return {
    onKeyChange: (l) => {
      listener = l;
      return () => { listener = null; };
    },
    emit: () => listener?.(),
    hasListener: () => listener !== null,
  };
};

interface UserStub {
  observable: {
    subscribe: (next: (u: UserLogin | undefined) => void) => { unsubscribe: () => void };
  };
  emit: (signedIn: boolean) => void;
}

/** A `CloudObservable<UserLogin | undefined>` stub for the current-user signal. */
const userStub = (): UserStub => {
  let listener: ((u: UserLogin | undefined) => void) | null = null;
  return {
    observable: {
      subscribe: (next) => {
        listener = next;
        return { unsubscribe: () => { listener = null; } };
      },
    },
    emit: (signedIn) =>
      listener?.(signedIn ? ({ isLoggedIn: true } as unknown as UserLogin) : undefined),
  };
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('startCloudReconciler', () => {
  it('runs reconcile on every transition out of the pulling phase', async () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startCloudReconciler({ syncState: stub.observable, run });

    stub.emit('pulling');
    expect(run).not.toHaveBeenCalled();
    stub.emit('in-sync'); // leftPulling → run #1
    await settle();
    expect(run).toHaveBeenCalledTimes(1);
    stub.emit('pulling');
    stub.emit('pushing'); // leftPulling → run #2 (previous run has settled)
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('clears the unchanged-skip cache when the user signs out', async () => {
    const user = userStub();
    const stop = startCloudReconciler({
      syncState: stubObservable().observable,
      currentUser: user.observable,
      run: vi.fn().mockResolvedValue(undefined),
    });

    // Populate the skip cache: reconcile a doc, then a repeat sweep skips its load.
    await addDocWithoutCrdt('d1', canon('stable'));
    expect(await reconcilePulledDocs()).toEqual([{ docId: 'd1', action: 'reseeded' }]);
    const loadAll = vi.spyOn(collabStore, 'loadAll');
    expect(await reconcilePulledDocs()).toEqual([]);
    expect(loadAll).not.toHaveBeenCalled();

    // A logout wipes the CRDT log but keeps the body; without clearing the cache
    // the unchanged body would be skipped and never reseeded. Sign-out must clear it.
    user.emit(true);
    user.emit(false);
    expect(await reconcilePulledDocs()).toEqual([]);
    expect(loadAll).toHaveBeenCalled();

    loadAll.mockRestore();
    stop();
  });

  it('runs once when initial sync first reaches in-sync without a prior pull', () => {
    const stub = stubObservable();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startCloudReconciler({ syncState: stub.observable, run });

    stub.emit('in-sync');
    stub.emit('in-sync');
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it('reconciles on a settled syncComplete even without a phase transition', async () => {
    const sc = voidEmitter();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startCloudReconciler({
      syncState: stubObservable().observable,
      syncComplete: sc.observable,
      run,
    });

    sc.emit();
    await settle();
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it('reconciles when a device key is acquired', () => {
    const kc = keyChangeStub();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startCloudReconciler({
      syncState: stubObservable().observable,
      onKeyChange: kc.onKeyChange,
      run,
    });

    kc.emit();
    expect(run).toHaveBeenCalledTimes(1);
    stop();
  });

  it('never overlaps runs; triggers during a run coalesce into one rerun', async () => {
    const stub = stubObservable();
    let resolveFirst: (() => void) | undefined;
    const run = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => { resolveFirst = () => resolve(); }),
      )
      .mockResolvedValue(undefined);
    const stop = startCloudReconciler({ syncState: stub.observable, run });

    stub.emit('in-sync'); // starts run #1, held unresolved
    expect(run).toHaveBeenCalledTimes(1);
    // Three more qualifying triggers while run #1 is in flight.
    stub.emit('pulling');
    stub.emit('in-sync');
    stub.emit('pulling');
    stub.emit('pushing');
    expect(run).toHaveBeenCalledTimes(1); // no overlap

    resolveFirst?.();
    await settle();
    expect(run).toHaveBeenCalledTimes(2); // exactly one coalesced rerun
    stop();
  });

  it('does not run on unrelated phases and unsubscribes every source on stop', () => {
    const stub = stubObservable();
    const sc = voidEmitter();
    const kc = keyChangeStub();
    const run = vi.fn().mockResolvedValue(undefined);
    const stop = startCloudReconciler({
      syncState: stub.observable,
      syncComplete: sc.observable,
      onKeyChange: kc.onKeyChange,
      run,
    });

    stub.emit('initial');
    stub.emit('offline');
    expect(run).not.toHaveBeenCalled();

    stop();
    expect(stub.hasListener()).toBe(false);
    expect(sc.hasListener()).toBe(false);
    expect(kc.hasListener()).toBe(false);
    stub.emit('in-sync');
    sc.emit();
    kc.emit();
    expect(run).not.toHaveBeenCalled();
  });
});
