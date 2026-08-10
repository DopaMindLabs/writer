import { db } from '@/db/db';
import type { WriterNotebook } from '@/db/schema';
import { useKeyedEncryptedLiveQuery } from './useEncryptedLiveQuery';

export interface WriterNotebookSummary {
  readonly notebook: WriterNotebook;
  readonly pageCount: number;
}

export const useWriterNotebooks = (
  spaceId: string | null | undefined,
): WriterNotebook[] | undefined =>
  useKeyedEncryptedLiveQuery(
    spaceId,
    (id) => db.writerNotebooks.where('spaceId').equals(id).toArray(),
    [],
  );

export const useWriterNotebookSummaries = (
  spaceId: string | null | undefined,
): WriterNotebookSummary[] | undefined =>
  useKeyedEncryptedLiveQuery(
    spaceId,
    async (id) => {
      const [notebooks, pages] = await Promise.all([
        db.writerNotebooks.where('spaceId').equals(id).toArray(),
        db.writerNotebookPages.where('spaceId').equals(id).toArray(),
      ]);
      const counts = new Map<string, number>();
      for (const page of pages) counts.set(page.notebookId, (counts.get(page.notebookId) ?? 0) + 1);
      return notebooks.map((notebook) => ({ notebook, pageCount: counts.get(notebook.id) ?? 0 }));
    },
    [],
  );
