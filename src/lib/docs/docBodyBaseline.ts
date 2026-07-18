import { db } from '@/db/db';

/**
 * The local-only record of the exact `docs.body` this device last wrote, kept in
 * the `meta` table. Reconciliation uses it as body provenance: a row that still
 * equals its baseline was written here (any CRDT divergence is unsaved local
 * keystrokes), while a row that differs was changed under us — Dexie Cloud writes
 * `docs.body` directly and never touches this marker, so a mismatch means a pull.
 * This replaces comparing wall clocks from different devices, which clock skew
 * could invert. Written transactionally with the row it describes.
 */
export const docBodyBaselineKey = (docId: string): string =>
  `doc-body-baseline:${docId}`;

export const readDocBodyBaseline = async (
  docId: string,
): Promise<string | null> => {
  const row = await db.meta.get(docBodyBaselineKey(docId));
  return typeof row?.value === 'string' ? row.value : null;
};

export const writeDocBodyBaseline = async (
  docId: string,
  body: string,
): Promise<void> => {
  await db.meta.put({ key: docBodyBaselineKey(docId), value: body });
};

export const deleteDocBodyBaseline = async (docId: string): Promise<void> => {
  await db.meta.delete(docBodyBaselineKey(docId));
};
