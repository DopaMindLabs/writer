import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { Revision, RevisionKind } from '@/db/schema';
import { countWords, lexicalJsonToPlainText } from './lexicalJsonToPlainText';

export const MAX_AUTO_REVISIONS_PER_DOC = 30;

export const AUTO_REVISION_MIN_INTERVAL_MS = 5 * 60_000;

export interface CreateRevisionOpts {
  kind: RevisionKind;
  label?: string;
  pinned?: boolean;
  now?: () => number;
}

const pruneAutoRevisions = async (docId: string): Promise<void> => {
  const autos = await db.revisions
    .where('docId')
    .equals(docId)
    .filter((r) => r.kind === 'auto' && !r.pinned)
    .toArray();

  const staleIds = autos
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(MAX_AUTO_REVISIONS_PER_DOC)
    .map((r) => r.id);

  if (staleIds.length > 0) {
    await db.revisions.bulkDelete(staleIds);
  }
};

export const createRevision = async (
  docId: string,
  body: string,
  opts: CreateRevisionOpts,
): Promise<Revision> => {
  const now = opts.now ?? Date.now;
  const text = lexicalJsonToPlainText(body);
  const revision: Revision = {
    id: newId(),
    docId,
    body,
    text,
    wordCount: countWords(text),
    kind: opts.kind,
    label: opts.label,
    pinned: opts.pinned,
    createdAt: now(),
  };

  await db.transaction('rw', db.revisions, async () => {
    await db.revisions.put(revision);
    if (revision.kind === 'auto') {
      await pruneAutoRevisions(docId);
    }
  });
  return revision;
};
