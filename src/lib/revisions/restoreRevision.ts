import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { useUI } from '@/store/ui';
import { createRevision } from './createRevision';
import { isParseableBody } from './lexicalJsonToPlainText';

export interface RestoreRevisionOpts {
  label?: string;
  now?: () => number;
}

export const restoreRevision = async (
  docId: string,
  revisionId: string,
  opts: RestoreRevisionOpts = {},
): Promise<void> => {
  const now = opts.now ?? Date.now;

  await db.transaction('rw', db.revisions, db.docs, async () => {
    const target = await db.revisions.get(revisionId);
    invariant(target, () => `revision ${revisionId} not found`);
    invariant(
      target.docId === docId,
      () => `revision ${revisionId} does not belong to doc ${docId}`,
    );
    invariant(
      isParseableBody(target.body),
      () => `revision ${revisionId} body is corrupt and cannot be restored`,
    );

    const doc = await db.docs.get(docId);
    invariant(doc, () => `doc ${docId} not found`);

    await createRevision(docId, doc.body, {
      kind: 'manual',
      label: opts.label ?? 'pre-restore',
      now,
    });

    await db.docs.update(docId, {
      body: target.body,
      updatedAt: now(),
      meta: { ...doc.meta, wordCount: target.wordCount },
    });
  });

  useUI.getState().bumpRestoreNonce(docId);
};
