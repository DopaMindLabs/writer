import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { Revision, RevisionKind } from '@/db/schema';
import { countWords, lexicalJsonToPlainText } from './lexicalJsonToPlainText';

// Cap on retained automatic revisions per document. Manual, baseline, and
// pinned revisions are never counted against this and never auto-pruned.
export const MAX_AUTO_REVISIONS_PER_DOC = 30;

// Minimum spacing between automatic captures for a single document.
export const AUTO_REVISION_MIN_INTERVAL_MS = 5 * 60_000;

export interface CreateRevisionOpts {
  kind: RevisionKind;
  label?: string;
  pinned?: boolean;
  now?: () => number;
}

// Drops the oldest automatic, unpinned revisions beyond the retention cap.
// Pinned/manual/baseline revisions are excluded from both the count and the
// deletion set, so they are kept indefinitely.
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

// Writes a full snapshot of `body` for `docId` and prunes stale autos in one
// transaction. Returns the stored row.
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
