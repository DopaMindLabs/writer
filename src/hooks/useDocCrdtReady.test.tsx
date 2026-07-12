import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { db } from '@/db/db';
import { serializedBody } from '@/test/fixtures';
import { seedDocCrdt } from '@/lib/docs';
import { collabStore } from '@/lib/collab/collabStore';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { useDocCrdtReady } from './useDocCrdtReady';

const DOC = 'd1';
const BODY = serializedBody('recovered content');

const logSnapshot = async (docId: string): Promise<string> => {
  const rows = await db.docUpdates.where('docId').equals(docId).toArray();
  return serializeDocSnapshot(docId, rows.map((row) => row.payload));
};

/** The canonical snapshot a body round-trips to once seeded through the editor. */
const canonicalSeed = (docId: string, body: string): string =>
  serializeDocSnapshot(docId, [seedFromLexicalJson(docId, body)]);

describe('useDocCrdtReady', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('seeds an empty CRDT log from the body, then reports ready', async () => {
    const { result } = renderHook(() => useDocCrdtReady(DOC, BODY));
    expect(result.current).toBe(false);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    // The wiped log is healed to the pulled body (canonical serialised form).
    expect(await logSnapshot(DOC)).toBe(canonicalSeed(DOC, BODY));
  });

  it('leaves an already-seeded log untouched and reports ready', async () => {
    await seedDocCrdt(DOC, BODY);
    const before = await logSnapshot(DOC);

    const { result } = renderHook(() => useDocCrdtReady(DOC, BODY));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(await logSnapshot(DOC)).toBe(before);
  });

  it('reseeds a populated log that diverged from a body pulled while closed', async () => {
    // The local CRDT holds stale content; the row body was pulled from another
    // device. The editor must mount over the pulled body, not the stale CRDT.
    const stale = serializedBody('stale local');
    const pulled = serializedBody('newer pulled');
    await seedDocCrdt(DOC, stale);

    const { result } = renderHook(() => useDocCrdtReady(DOC, pulled));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(await logSnapshot(DOC)).toBe(canonicalSeed(DOC, pulled));
  });

  it('does not re-run reconciliation (or remount) when only the body changes', async () => {
    await seedDocCrdt(DOC, BODY);
    const { result, rerender } = renderHook(
      ({ body }: { body: string }) => useDocCrdtReady(DOC, body),
      { initialProps: { body: BODY } },
    );
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    const deleteSpy = vi.spyOn(collabStore, 'deleteDoc');

    // An ordinary autosave changes the body; the hook is keyed on docId, so it
    // must neither reset readiness nor touch the log.
    rerender({ body: serializedBody('locally edited body') });

    expect(result.current).toBe(true);
    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
  });
});
