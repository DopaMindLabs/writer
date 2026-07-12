import { db } from '@/db/db';
import type { Doc, Section } from '@/db/schema';
import {
  useEncryptedLiveQuery,
  useKeyedEncryptedLiveQuery,
} from './useEncryptedLiveQuery';

export const useSections = (
  spaceId: string | null | undefined,
): Section[] | undefined =>
  useKeyedEncryptedLiveQuery(
    spaceId,
    // Read through the wrapped query path and sort in memory: a cursor read
    // (`sortBy`) bypasses the encryption middleware and would leak rows sealed
    // under a key this device does not hold, raw, into the section tree.
    async (id) =>
      (await db.sections.where('spaceId').equals(id).toArray()).sort(
        (a, b) => a.order - b.order,
      ),
    [],
  );

export const useDocuments = (
  spaceId: string | null | undefined,
): Doc[] | undefined =>
  useKeyedEncryptedLiveQuery(
    spaceId,
    (id) => db.docs.where('spaceId').equals(id).toArray(),
    [],
  );

export const useDocument = (docId: string | null | undefined) =>
  useEncryptedLiveQuery(
    () => (docId ? db.docs.get(docId) : undefined),
    [docId],
    undefined,
  );
