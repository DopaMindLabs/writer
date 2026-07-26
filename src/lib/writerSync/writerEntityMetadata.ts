import { newId } from '@/lib/ids';
import { getProfile } from '@/lib/account/profile';
import type { AccessScopeId } from '@/lib/syncProviders/types';
import { asOperationId, asPrincipalId, type PrincipalId } from '@/lib/syncProviders/ids';
import {
  createEntityMetadata,
  updateEntityMetadata,
  type ReplicatedEntityMetadata,
} from './entityMetadata';
import { createHybridLogicalClock } from './hybridLogicalClock';

/**
 * Writer's stamping facade for provider-neutral entity metadata. It resolves the
 * current principal from the local profile, mints an operation id per mutation
 * and ticks one shared hybrid logical clock, then applies the pure metadata
 * constructors. Every synced write stamps through here rather than hand-rolling
 * the five metadata fields, so attribution and convergence stay consistent.
 *
 * The clock is process-local and its state is fully encapsulated; the operation
 * protocol (slice 1E) takes over convergence and cross-device merge.
 */
const clock = createHybridLogicalClock();

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
    at: clock.now(),
  });

/** Metadata after a material change to `previous`, edited by `principal`. */
export const touchedEntityMetadata = (
  previous: ReplicatedEntityMetadata,
  principal: PrincipalId,
): ReplicatedEntityMetadata =>
  updateEntityMetadata(previous, {
    principal,
    mutationId: asOperationId(newId()),
    at: clock.now(),
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
  logicalUpdatedAt: clock.now(),
});
