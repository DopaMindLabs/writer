import type { LoremDB } from '@/db/LoremDB';
import type {
  OperationInbox,
  OperationStore,
} from '@/lib/writerSync/operations/operationStore.types';

/**
 * Writer's persistence of the operation protocol over its Dexie tables. Thin by
 * design: contracts live in `operations/`, and providers depend on those
 * contracts — never on this database.
 */

export const createWriterOperationStore = (db: LoremDB): OperationStore => ({
  append: async (frame) => {
    await db.syncOperations.put(frame);
  },
  byId: (operationId) => db.syncOperations.get(String(operationId)),
  forScope: (accessScopeId) =>
    db.syncOperations.where('accessScopeId').equals(accessScopeId).toArray(),
});

export const createWriterOperationInbox = (db: LoremDB): OperationInbox => ({
  has: async (operationId) =>
    (await db.syncInbox.get(String(operationId))) !== undefined,
  record: async (entry) => {
    await db.syncInbox.put(entry);
  },
  tombstoneFor: (entityTable, entityId) =>
    db.syncTombstones.get([entityTable, entityId]),
  putTombstone: async (tombstone) => {
    await db.syncTombstones.put(tombstone);
  },
});
