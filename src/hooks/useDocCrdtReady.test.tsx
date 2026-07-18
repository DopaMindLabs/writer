import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { db } from '@/db/db';
import { serializedBody } from '@/test/fixtures';
import { seedDocCrdt, writeDocBodyBaseline } from '@/lib/docs';
import { collabStore } from '@/lib/collab/collabStore';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { reconcileDocForMount as realReconcile } from '@/lib/cloud/reconcile';

const reconcileMock = vi.fn(realReconcile);
vi.mock('@/lib/cloud/cloudClient', () => ({
  reconcileDocForMount: (docId: string, body: string) => reconcileMock(docId, body),
}));

const { useDocCrdtReady } = await import('./useDocCrdtReady');

const DOC = 'd1';
const BODY = serializedBody('recovered content');

const logSnapshot = async (docId: string): Promise<string> => {
  const rows = await db.docUpdates.where('docId').equals(docId).toArray();
  return serializeDocSnapshot(docId, rows.map((row) => row.payload));
};

const canonicalSeed = (docId: string, body: string): string =>
  serializeDocSnapshot(docId, [seedFromLexicalJson(docId, body)]);

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}
const deferred = (): Deferred => {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useDocCrdtReady', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    reconcileMock.mockReset();
    reconcileMock.mockImplementation(realReconcile);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('heals a wiped log from the row body and reports ready', async () => {
    await db.docs.add({
      id: DOC, spaceId: 's', sectionId: 'x', name: 'd', body: BODY,
      meta: { wordCount: 0 }, updatedAt: 0,
    });

    const { result } = renderHook(() => useDocCrdtReady(DOC, BODY));

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(await logSnapshot(DOC)).toBe(canonicalSeed(DOC, BODY));
  });

  it('reseeds a populated log that diverged from a body pulled while closed', async () => {
    const stale = serializedBody('stale local');
    const pulled = serializedBody('newer pulled');
    await seedDocCrdt(DOC, stale);
    await writeDocBodyBaseline(DOC, stale);

    const { result } = renderHook(() => useDocCrdtReady(DOC, pulled));

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(await logSnapshot(DOC)).toBe(canonicalSeed(DOC, pulled));
  });

  it('keeps unsaved keystrokes when the row still equals the local baseline', async () => {
    const typed = serializedBody('typed but not yet autosaved');
    const staleRow = serializedBody('stale body');
    await seedDocCrdt(DOC, typed);
    await writeDocBodyBaseline(DOC, staleRow);

    const { result } = renderHook(() => useDocCrdtReady(DOC, staleRow));

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(await logSnapshot(DOC)).toBe(canonicalSeed(DOC, typed));
  });

  it('does not re-run reconciliation (or remount) when only the body changes', async () => {
    await seedDocCrdt(DOC, BODY);
    await writeDocBodyBaseline(DOC, BODY);
    const { result, rerender } = renderHook(
      ({ body }: { body: string }) => useDocCrdtReady(DOC, body),
      { initialProps: { body: BODY } },
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    const deleteSpy = vi.spyOn(collabStore, 'deleteDoc');

    rerender({ body: serializedBody('locally edited body') });

    expect(result.current.state).toBe('ready');
    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
  });

  it('keeps the editor gate closed (failed, never ready) when reconciliation rejects', async () => {
    reconcileMock.mockReset();
    reconcileMock.mockRejectedValue(new Error('reconcile boom'));

    const { result } = renderHook(() => useDocCrdtReady(DOC, BODY));

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    // It never reported ready.
    expect(result.current.state).not.toBe('ready');
  });

  it('retries from failed through pending to ready once reconciliation succeeds', async () => {
    reconcileMock.mockReset();
    reconcileMock
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDocCrdtReady(DOC, BODY));
    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    const failed = result.current;
    if (failed.state !== 'failed') throw new Error('expected failed');
    act(() => {
      failed.retry();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(reconcileMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates the previous request when the document changes', async () => {
    reconcileMock.mockReset();
    reconcileMock.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useDocCrdtReady(id, BODY),
      { initialProps: { id: 'a' } },
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    rerender({ id: 'b' });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(reconcileMock).toHaveBeenLastCalledWith('b', BODY);
  });

  it('does not update state after unmount', async () => {
    const gate = deferred();
    reconcileMock.mockReset();
    reconcileMock.mockReturnValue(gate.promise);

    const { result, unmount } = renderHook(() => useDocCrdtReady(DOC, BODY));
    expect(result.current.state).toBe('pending');
    unmount();

    gate.resolve();
    await gate.promise;
    // The resolution after unmount was ignored — no ready transition, no warning.
    expect(result.current.state).toBe('pending');
  });
});
