import type { Table, UpdateSpec } from 'dexie';
import type { ReplicatedEntityMetadata } from 'writer-sync/core';
import {
  currentPrincipal,
  touchedMetadataFields,
} from '@/lib/writerSyncIntegration/writerEntityMetadata';

/**
 * Update one row of a replicated table and advance its convergence metadata in
 * the same write.
 *
 * A partial `table.update(id, changes)` that leaves `mutationId` and
 * `logicalUpdatedAt` alone is not a silent no-op: the operation journal frames
 * the stored row, so the frame reuses an operation id every other device has
 * already accepted. Receivers discard it as a replay and the change never
 * lands. Routing an update through here makes that impossible to forget — the
 * editor, a fresh operation id and a fresh logical time always travel with the
 * change.
 *
 * Use it for every partial update of a synced-content row. A write that
 * replaces the whole row keeps stamping through `newEntityMetadata` /
 * `touchedEntityMetadata` instead.
 */
export const updateReplicatedRow = async <T extends ReplicatedEntityMetadata>(
  table: Table<T, string>,
  id: string,
  changes: UpdateSpec<T>,
): Promise<number> =>
  table.update(id, {
    ...changes,
    ...touchedMetadataFields(await currentPrincipal()),
  });
