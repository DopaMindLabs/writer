import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';

/**
 * The deletion state one delete frame leaves behind on this device.
 *
 * Written wherever a deletion is journalled, whichever device authored it. A
 * deletion this device made itself is not a lesser fact than one it received:
 * it is what stops an older edit from a peer putting the row back, and it is
 * what a full-state rebuild is served from once the scope's history has been
 * compacted. Deriving it here rather than at each call site is what keeps the
 * two paths recording the same thing.
 *
 * `acknowledgedBy` starts empty: no peer has been told about this deletion yet,
 * and that emptiness is what holds both the tombstone and its frame in place
 * until every trusted peer has.
 */
export const tombstoneOf = (frame: EncryptedSyncFrame): SyncTombstone => ({
  entityId: frame.entityId,
  entityTable: frame.entityTable,
  accessScopeId: frame.accessScopeId,
  operationId: frame.operationId,
  deviceId: frame.deviceId,
  logicalAt: frame.logicalAt,
  acknowledgedBy: [],
});
