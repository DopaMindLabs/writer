import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { serializedBody } from '@/test/fixtures';
import { seedDocCrdt } from '@/lib/docs';
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
});
