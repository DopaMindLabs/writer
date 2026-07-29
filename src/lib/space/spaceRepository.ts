import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { updateReplicatedRow } from '@/lib/writerSyncIntegration/replicatedRowUpdate';

/**
 * Writes to the `spaces` table. Keeping them here rather than in the surfaces
 * that trigger them means one place decides what a space edit is — including
 * the convergence metadata every replicated write must advance.
 *
 * Both edits are no-ops for a blank value: the surfaces restore the stored text
 * instead, so a cleared field never wipes a space's name or tag.
 */

/** Rename a space. A blank name leaves the space untouched. */
export const renameSpace = async (spaceId: string, name: string): Promise<void> => {
  invariant(spaceId, 'renameSpace: spaceId is required');
  const next = name.trim();
  if (!next) return;
  await updateReplicatedRow(db.spaces, spaceId, { name: next, updatedAt: Date.now() });
};

/** Re-tag a space. A blank tag leaves the space untouched. */
export const retagSpace = async (spaceId: string, tag: string): Promise<void> => {
  invariant(spaceId, 'retagSpace: spaceId is required');
  const next = tag.trim();
  if (!next) return;
  await updateReplicatedRow(db.spaces, spaceId, { tag: next, updatedAt: Date.now() });
};
