import { db } from '@/db/db';
import type { WriterNotebookAsset, WriterNotebookPage } from '@/db/schema';
import { useKeyedEncryptedLiveQuery } from './useEncryptedLiveQuery';

const notebookKey = (
  spaceId: string | null | undefined,
  notebookId: string | null | undefined,
): string | null => (spaceId && notebookId ? `${spaceId}\u0000${notebookId}` : null);

export const useWriterNotebookPages = (
  spaceId: string | null | undefined,
  notebookId: string | null | undefined,
): WriterNotebookPage[] | undefined =>
  useKeyedEncryptedLiveQuery(
    notebookKey(spaceId, notebookId),
    async () => {
      if (!spaceId || !notebookId) return [];
      const notebook = await db.writerNotebooks.get(notebookId);
      if (notebook?.spaceId !== spaceId) return [];
      const rows = await db.writerNotebookPages.where('notebookId').equals(notebookId).toArray();
      return rows
        .filter((row) => row.spaceId === spaceId)
        .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
    },
    [],
  );

export const useWriterNotebookAssets = (
  spaceId: string | null | undefined,
  notebookId: string | null | undefined,
): WriterNotebookAsset[] | undefined =>
  useKeyedEncryptedLiveQuery(
    notebookKey(spaceId, notebookId),
    async () => {
      if (!spaceId || !notebookId) return [];
      const notebook = await db.writerNotebooks.get(notebookId);
      if (notebook?.spaceId !== spaceId) return [];
      const rows = await db.writerNotebookAssets.where('notebookId').equals(notebookId).toArray();
      return rows.filter((row) => row.spaceId === spaceId);
    },
    [],
  );
