import { newId } from '@/lib/ids';
import { getProfile } from '@/lib/profile/profile';
import {
  asOperationId,
  asPrincipalId,
  createEntityMetadata,
  updateEntityMetadata,
  type AccessScopeId,
  type PrincipalId,
  type ReplicatedEntityMetadata,
} from 'writer-sync/core';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';


/**
 * Writer's stamping facade for provider-neutral entity metadata. It resolves the
 * current principal from the local profile, mints an operation id per mutation
 * and ticks {@link writerClock}, then applies the pure metadata constructors.
 * Every synced write stamps through here rather than hand-rolling the five
 * metadata fields, so attribution and convergence stay consistent.
 *
 * The clock is shared with the materialiser, which merges the logical time of
 * every accepted inbound frame into it — so a stamp minted here always follows
 * the operations this device has already seen.
 */

/** The current principal — the local profile's stable author id. */
export const currentPrincipal = async (): Promise<PrincipalId> =>
  asPrincipalId((await getProfile()).authorId);

/** Metadata for a newly created entity in `accessScopeId`, authored by `principal`. */
export const newEntityMetadata = (
  accessScopeId: AccessScopeId,
  principal: PrincipalId,
): ReplicatedEntityMetadata =>
  createEntityMetadata({
    accessScopeId,
    principal,
    mutationId: asOperationId(newId()),
    at: writerClock.now(),
  });

/** Metadata after a material change to `previous`, edited by `principal`. */
export const touchedEntityMetadata = (
  previous: ReplicatedEntityMetadata,
  principal: PrincipalId,
): ReplicatedEntityMetadata =>
  updateEntityMetadata(previous, {
    principal,
    mutationId: asOperationId(newId()),
    at: writerClock.now(),
  });

/**
 * Metadata for a row this device writes back wholesale — an archive import or
 * restore. Attribution and scope survive (the archive records who wrote the
 * row), but the mutation identity does not: replaying a stored `mutationId`
 * would journal an operation every other device has already accepted, so the
 * write would be discarded as a replay and the restored content would never
 * reach them.
 */
export const remintedMetadata = <T extends ReplicatedEntityMetadata>(row: T): T => ({
  ...row,
  mutationId: asOperationId(newId()),
  logicalUpdatedAt: writerClock.now(),
});

/** The metadata fields a material change refreshes — for a partial row update. */
export type TouchedMetadataFields = Pick<
  ReplicatedEntityMetadata,
  'updatedBy' | 'mutationId' | 'logicalUpdatedAt'
>;

/**
 * The subset of metadata a `db.<table>.update(id, changes)` must refresh:
 * `createdBy` and `accessScopeId` are preserved on the stored row, so a partial
 * update touches only the editor, mutation id and logical time.
 */
export const touchedMetadataFields = (principal: PrincipalId): TouchedMetadataFields => ({
  updatedBy: principal,
  mutationId: asOperationId(newId()),
  logicalUpdatedAt: writerClock.now(),
});
