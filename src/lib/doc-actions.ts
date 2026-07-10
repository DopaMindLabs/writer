import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';

export const renameDoc = async (docId: string, name: string): Promise<void> => {
  invariant(docId, 'renameDoc: docId is required');
  const next = name.trim();
  if (!next) return;
  await db.docs.update(docId, { name: next, updatedAt: Date.now() });
};
