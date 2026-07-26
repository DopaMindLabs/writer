import type { LoremDB } from '@/db/LoremDB';
import type { AccessScopeId } from '@/lib/syncProviders/types';
import type {
  ScopeKeyResolver,
  SyncKeyRing,
} from '@/lib/writerSync/crypto/keyResolver';
import {
  openOperationPayload,
  sealOperationPayload,
} from '@/lib/writerSync/crypto/operationCrypto';
import { keyIdOf } from '@/lib/cloud/crypto/envelope';
import { invariant } from '@/lib/invariant';
import {
  EMPTY_PAYLOAD_HASH,
  hashPayload,
} from '@/lib/writerSync/operations/operationCodec';
import type { EncryptedSyncFrame } from '@/lib/writerSync/operations/operation.types';

/**
 * Move every enqueued operation for one access scope into another.
 *
 * A frame's ciphertext is bound to its scope: the scope id is part of the
 * additional authenticated data, so a frame cannot simply be relabelled — doing
 * so would produce a frame no receiver can open, silently losing the operation.
 * Each frame is therefore opened under the source scope's key and resealed under
 * the destination's, keeping its operation id (so cross-provider deduplication
 * still recognises it) and its logical time (so convergence is unchanged).
 *
 * All-or-nothing: every frame is resealed before anything is written, and the
 * writes commit in one transaction. A scope transition that fails halfway would
 * leave operations split across two scopes, where a device holding either key
 * could read only part of the history.
 */

/** The key rings either side of a scope transition. */
interface ScopeKeyRings {
  source: SyncKeyRing;
  destination: SyncKeyRing;
}

/** Reseal one frame under `accessScopeId`, preserving identity and ordering. */
const rescopeFrame = async (options: {
  frame: EncryptedSyncFrame;
  rings: ScopeKeyRings;
  accessScopeId: AccessScopeId;
}): Promise<EncryptedSyncFrame> => {
  const { frame, rings, accessScopeId } = options;
  const header = {
    ...frame,
    accessScopeId,
    keyId: keyIdOf(rings.destination),
    epoch: rings.destination.epoch,
  };
  if (frame.kind === 'delete') {
    // A deletion carries no payload, so there is nothing to reseal — only the
    // routing header moves.
    return { ...header, payload: '', payloadHash: EMPTY_PAYLOAD_HASH };
  }
  const content = await openOperationPayload(rings.source, frame, frame.payload);
  const payload = await sealOperationPayload(rings.destination, header, content);
  return { ...header, payload, payloadHash: await hashPayload(payload) };
};

/**
 * Resolve the source and destination rings for a transition. Both must be
 * available: resealing needs to read the old payload and write the new one, so a
 * keyless (or partially keyed) device must refuse rather than move a frame it
 * cannot re-encrypt.
 */
const ringsFor = (options: {
  resolver: ScopeKeyResolver;
  from: AccessScopeId;
  to: AccessScopeId;
}): ScopeKeyRings => {
  const context = { table: 'syncOperations', primaryKey: '', operation: 'write' } as const;
  const source = options.resolver.keyFor({
    ...context,
    accessScopeId: options.from,
  });
  const destination = options.resolver.keyFor({
    ...context,
    accessScopeId: options.to,
  });
  invariant(
    source && destination,
    'rescopeFrames: both the source and destination scope keys must be available',
  );
  return { source, destination };
};

/**
 * Re-encrypt every enqueued frame of `from` into `to`. Returns how many frames
 * moved. Frames already in the destination scope are left alone.
 */
export const rescopeFrames = async (options: {
  db: LoremDB;
  resolver: ScopeKeyResolver;
  scopes: { from: AccessScopeId; to: AccessScopeId };
}): Promise<number> => {
  const { db, resolver, scopes } = options;
  if (scopes.from === scopes.to) return 0;
  const enqueued = await db.syncOperations
    .where({ accessScopeId: scopes.from })
    .toArray();
  if (enqueued.length === 0) return 0;
  const rings = ringsFor({ resolver, from: scopes.from, to: scopes.to });
  // Every reseal completes before the transaction opens: Web Crypto cannot run
  // inside a live IndexedDB transaction, and a failure here must abort the whole
  // transition rather than commit a partial one.
  const rescoped = await Promise.all(
    enqueued.map((frame) =>
      rescopeFrame({ frame, rings, accessScopeId: scopes.to }),
    ),
  );
  await db.transaction('rw', db.syncOperations, async () => {
    await db.syncOperations.bulkPut(rescoped);
  });
  return rescoped.length;
};
