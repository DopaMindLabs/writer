import type { LoremDB } from '@/db/LoremDB';
import { newId } from '@/lib/ids';
import { asOperationId, type DeviceId } from 'writer-sync/core';
import type { SyncKeyRing } from 'writer-sync/crypto';
import { sealOperationPayload, signFrame } from 'writer-sync/crypto';
import { keyIdOf } from '@/lib/cloud/crypto/envelope';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import {
  EMPTY_PAYLOAD_HASH,
  hashPayload,
} from 'writer-sync/operations';
import {
  SYNC_OPERATION_VERSION,
  type EncryptedSyncFrame,
  type SyncOperationHeader,
} from 'writer-sync/operations';
import { tombstoneOf } from './tombstone';

type FrameHeader = Omit<SyncOperationHeader, 'payloadHash'>;
import type { ReplicatedEntityMetadata } from 'writer-sync/core';

/**
 * Builds Writer's encrypted operation frames and commits them atomically with
 * the domain mutation they describe. The frame is encrypted exactly once here;
 * every provider transports the identical immutable bytes.
 */

interface FrameInputs {
  ring: SyncKeyRing;
  deviceId: DeviceId;
  entityTable: string;
}

/** Frame inputs plus the database a journalled commit writes to. */
type JournalInputs = FrameInputs & { db: LoremDB };

/** Build the put frame for a domain row (its content becomes the payload). */
export const makePutFrame = async (
  options: FrameInputs & { row: ReplicatedEntityMetadata & { id: string } },
): Promise<EncryptedSyncFrame> => {
  const { ring, deviceId, entityTable, row } = options;
  const header: FrameHeader = {
    v: SYNC_OPERATION_VERSION,
    operationId: row.mutationId,
    accessScopeId: row.accessScopeId,
    entityTable,
    entityId: row.id,
    kind: 'put' as const,
    deviceId,
    logicalAt: row.logicalUpdatedAt,
    keyId: keyIdOf(ring),
    epoch: ring.epoch,
  };
  const payload = await sealOperationPayload(ring, header, { ...row });
  return {
    ...header,
    payload,
    payloadHash: await hashPayload(payload),
    signature: '',
  };
};

/**
 * Build the delete frame (tombstone source) for an entity. Synchronous by
 * design: a delete carries no payload, so it needs no Web Crypto — and framing
 * a deletion therefore never suspends the IndexedDB transaction the deletion
 * commits in (see the operation-journal middleware).
 */
export const makeDeleteFrame = (
  options: FrameInputs & { entityId: string; accessScopeId: string },
): EncryptedSyncFrame => {
  const { ring, deviceId, entityTable, entityId, accessScopeId } = options;
  const header: FrameHeader = {
    v: SYNC_OPERATION_VERSION,
    operationId: asOperationId(newId()),
    accessScopeId,
    entityTable,
    entityId,
    kind: 'delete' as const,
    deviceId,
    logicalAt: writerClock.now(),
    keyId: keyIdOf(ring),
    epoch: ring.epoch,
  };
  return {
    ...header,
    payload: '',
    payloadHash: EMPTY_PAYLOAD_HASH,
    signature: '',
  };
};

/**
 * Attach this device's signature to frames it authored.
 *
 * Signing is a separate pass rather than part of frame construction so that
 * `makeDeleteFrame` can stay synchronous: a deletion is framed inside a live
 * IndexedDB transaction, and the signature — the only Web Crypto a delete needs
 * — is applied in the caller's own wrapped wait instead.
 *
 * `null` entries pass through untouched: they mark rows that produced no frame,
 * and inventing one for them would journal a write that never happened.
 */
export const signAuthoredFrames = <T extends EncryptedSyncFrame | null>(
  privateKey: CryptoKey,
  frames: readonly T[],
): Promise<T[]> =>
  Promise.all(
    frames.map(async (frame): Promise<T> => {
      if (frame === null) return frame;
      const signature = await signFrame(privateKey, frame);
      return { ...frame, signature };
    }),
  );

/** Commit a domain put and its journal frame in one transaction. */
export const journalledPut = async (
  options: JournalInputs & { row: ReplicatedEntityMetadata & { id: string } },
): Promise<EncryptedSyncFrame> => {
  const frame = await makePutFrame(options);
  await options.db.transaction(
    'rw',
    [
      options.db.table(options.entityTable),
      options.db.syncOperations,
      options.db.syncTombstones,
    ],
    async () => {
      await options.db.table(options.entityTable).put(options.row);
      await options.db.syncOperations.put(frame);
      // Writing the row again contradicts the deletion this device recorded for
      // it; leaving the tombstone would have the rebuild describe both.
      await options.db.syncTombstones.delete([options.entityTable, options.row.id]);
    },
  );
  return frame;
};

/**
 * Commit a domain delete, its journal frame and its tombstone in one
 * transaction. The tombstone is not bookkeeping for later: it is what a
 * full-state rebuild serves the deletion from once history has been compacted,
 * and what refuses an older edit arriving from a peer afterwards.
 */
export const journalledDelete = async (
  options: JournalInputs & { entityId: string; accessScopeId: string },
): Promise<EncryptedSyncFrame> => {
  const frame = makeDeleteFrame(options);
  await options.db.transaction(
    'rw',
    [
      options.db.table(options.entityTable),
      options.db.syncOperations,
      options.db.syncTombstones,
    ],
    async () => {
      await options.db.table(options.entityTable).delete(options.entityId);
      await options.db.syncOperations.put(frame);
      await options.db.syncTombstones.put(tombstoneOf(frame));
    },
  );
  return frame;
};
