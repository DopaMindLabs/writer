import type { DBCoreTransaction } from 'dexie';

/**
 * Predicates over the flags the Dexie Cloud addon stamps on its own internal
 * transactions. Both DBCore middlewares (row encryption and the operation
 * journal) must stay inert inside those transactions, so the predicates live
 * here rather than privately in either middleware.
 */

/**
 * Whether a mutation is the cloud addon applying rows it just pulled from the
 * server, rather than an app write. The addon runs `applyServerChanges` (and its
 * WebSocket equivalent) inside a transaction it marks `disableChangeTracking` —
 * the same flag it reads back off `req.trans` to skip its own change queue. A
 * safe read of an addon-set flag, not a validation bypass.
 */
export const isSyncApplied = (trans: DBCoreTransaction): boolean =>
  (trans as { disableChangeTracking?: boolean }).disableChangeTracking === true;

/**
 * Whether a request runs inside the addon's internal blob-plumbing transaction,
 * which it marks `disableBlobResolve` (the same flag the addon's blob-resolve
 * middleware reads to skip itself). Inside it the addon reads a row back to
 * patch a downloaded blob into place and writes it out again — pure ciphertext
 * plumbing that must never be reinterpreted as an app mutation.
 */
export const isInternalBlobTx = (trans: DBCoreTransaction): boolean =>
  (trans as { disableBlobResolve?: boolean }).disableBlobResolve === true;
