import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import { hasAccountIdentityTable } from '@/lib/writerSyncIntegration/accountDeviceIdentityStore';
import { journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { decodeFrame } from 'writer-sync/operations';
import { requireJournalledTable } from './frameAdmission';
import { isJournalledRow } from './journalledRow';
import type { RebindingSnapshot, ScopeEntityState, ScopeTransition } from './scopeRebinding.types';

export const scopeEntityKey = (entity: Pick<ScopeEntityState, 'entityTable' | 'entityId'>): string =>
  JSON.stringify([entity.entityTable, entity.entityId]);

/** Lock every content table: a new source row is also a change to the move. */
export const scopeRebindingTables = (db: LoremDB): string[] => [
  ...journalledTables(), 'syncOperations', 'syncTombstones', 'syncInbox',
  'syncScopeRebindings', 'syncAttachmentChunks', 'trustedDevices',
  ...(hasAccountIdentityTable(db) ? ['accountDeviceIdentities'] : []),
];

/** Domain rows are the authority for content even after their frames are compacted. */
const readRows = async (options: {
  transition: ScopeTransition;
  keys: ReadonlyMap<string, [string, string]>;
}): Promise<ScopeEntityState[]> => {
  const { transition: { db, scopes }, keys } = options;
  const rows: ScopeEntityState[] = [];
  for (const entityTable of journalledTables()) {
    for (const row of await requireJournalledTable(db, entityTable).toArray()) {
      const key = JSON.stringify([entityTable, row.id]);
      if (row.accessScopeId !== scopes.from && !keys.has(key)) continue;
      invariant(isJournalledRow(row), () => `${entityTable} has invalid scope-move metadata`);
      invariant(row.id.length > 0 && row.mutationId.length > 0, 'Invalid scope-move identity');
      rows.push({ entityTable, entityId: row.id, row, tombstone: undefined });
    }
  }
  return rows;
};

/** Read only inside a transaction covering scopeRebindingTables. */
export const readRebindingSnapshot = async (
  transition: ScopeTransition,
): Promise<RebindingSnapshot> => {
  const { db, scopes, requestId } = transition;
  const source = (await db.syncOperations.where({ accessScopeId: scopes.from }).toArray())
    .map(decodeFrame);
  const tombstones = await db.syncTombstones.toArray();
  const keys = new Map<string, [string, string]>();
  for (const entity of [...source, ...tombstones.filter((t) => t.accessScopeId === scopes.from)]) {
    requireJournalledTable(db, entity.entityTable);
    keys.set(scopeEntityKey(entity), [entity.entityTable, entity.entityId]);
  }
  const saved = await readRows({ transition, keys });
  for (const state of saved) keys.set(scopeEntityKey(state), [state.entityTable, state.entityId]);
  const rows = new Map(saved.map((state) => [scopeEntityKey(state), state.row]));
  const deleted = new Map(tombstones.map((t) => [scopeEntityKey(t), t]));
  const entities = [...keys.entries()].sort(([a], [b]) => a.localeCompare(b)).map(
    ([key, [entityTable, entityId]]): ScopeEntityState => ({
      entityTable, entityId, row: rows.get(key), tombstone: deleted.get(key),
    }),
  );
  const entityKeys = [...keys.values()];
  const history = (await db.syncOperations.where('[entityTable+entityId]').anyOf(entityKeys)
    .toArray()).map(decodeFrame);
  const inbox = await db.syncInbox.where('[entityTable+entityId]').anyOf(entityKeys).toArray();
  // Trust can change while crypto is running too. Compare its persisted inputs
  // again at commit, without awaiting signature verification inside IndexedDB.
  const trust = JSON.stringify([
    await db.trustedDevices.toArray(),
    hasAccountIdentityTable(db) ? await db.accountDeviceIdentities.toArray() : [],
  ]);
  return { entities, history, inbox, trust, receipt: await db.syncScopeRebindings.get(requestId) };
};
