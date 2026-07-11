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
    (id) => db.sections.where('spaceId').equals(id).sortBy('order'),
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
