/**
 * The relay wire protocol — deliberately tiny and content-blind. Every payload is
 * an opaque, client-encrypted string the relay stores and forwards but can never
 * read. The relay assigns each stored blob a monotonic sequence number so clients
 * can resume ("everything since seq N"); awareness frames are forwarded live and
 * never stored.
 */

/** Blob classes the relay persists in a room's append log. */
export type StoredBlobType = 'update' | 'snapshot' | 'roster' | 'wrappedKey' | 'join';

/** Every blob class, including the ephemeral (never-stored) awareness frame. */
export type BlobType = StoredBlobType | 'awareness';

/** The persisted blob classes, as a runtime list for validation. */
export const STORED_BLOB_TYPES: readonly StoredBlobType[] = [
  'update',
  'snapshot',
  'roster',
  'wrappedKey',
  'join',
];

/** A blob as a client posts it — the payload is opaque ciphertext to the relay. */
export interface RelayBlob {
  type: BlobType;
  payload: string;
}

/** A persisted blob, tagged with the relay-assigned monotonic sequence number. */
export interface StoredBlob {
  seq: number;
  type: StoredBlobType;
  payload: string;
}
