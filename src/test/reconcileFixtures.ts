import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import { seedDocCrdt } from '@/lib/docs';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { sampleMetadata, serializedBody } from './fixtures';

/**
 * Fixtures shared by the two reconciliation suites — the local mount gate
 * (`src/lib/reconcile`) and the cloud-driven sweep (`src/lib/cloud/reconcile.ts`).
 * Both drive the same `docs` + `docUpdates` shapes, so the helpers live here
 * rather than being duplicated either side of the module boundary.
 */

export const RECONCILE_FIXED_TIME = 1_700_000_000_000;

export const makeDoc = (id: string, body: string): Doc => ({
  ...sampleMetadata(),
  id,
  spaceId: 's1',
  sectionId: 'sec1',
  name: id,
  body,
  meta: { wordCount: 0 },
  updatedAt: RECONCILE_FIXED_TIME,
});

/**
 * The canonical serialized body for `text` — the exact form the editor (and thus
 * every real docs.body) emits, so a seeded doc's CRDT snapshot equals it exactly.
 */
export const canon = (text: string): string =>
  serializeDocSnapshot('c', [seedFromLexicalJson('c', serializedBody(text))]);

/** Add a doc whose local CRDT log was seeded from `localBody`. */
export const seedLocalDoc = async (id: string, localBody: string): Promise<void> => {
  await db.docs.add(makeDoc(id, localBody));
  await seedDocCrdt(id, localBody);
};

/** Add a doc row with a body but no CRDT log — the state after a logout wipe. */
export const addDocWithoutCrdt = async (id: string, body: string): Promise<void> => {
  await db.docs.add(makeDoc(id, body));
};

export const updateRows = (id: string): Promise<{ payload: Uint8Array }[]> =>
  db.docUpdates.where('docId').equals(id).toArray();

export const crdtSnapshot = async (id: string): Promise<string> =>
  serializeDocSnapshot(id, (await updateRows(id)).map((r) => r.payload));
