import type { LoremDB } from '@/db/LoremDB';
import { newId } from '@/lib/ids';
import { asOperationId, type DeviceId } from '@/lib/syncProviders/ids';
import type { SyncKeyRing } from '@/lib/writerSync/crypto/keyResolver';
import { sealOperationPayload } from '@/lib/writerSync/crypto/operationCrypto';
import { keyIdOf } from '@/lib/cloud/crypto/envelope';
import { createHybridLogicalClock } from '@/lib/writerSync/hybridLogicalClock';
import { hashPayload } from '@/lib/writerSync/operations/operationCodec';
import {
  SYNC_OPERATION_VERSION,
  type EncryptedSyncFrame,
  type SyncOperationHeader,
} from '@/lib/writerSync/operations/operation.types';

type FrameHeader = Omit<SyncOperationHeader, 'payloadHash' | 'logicalAt'>;
import type { ReplicatedEntityMetadata } from '@/lib/writerSync/entityMetadata';

/**
 * Builds Writer's encrypted operation frames and commits them atomically with
 * the domain mutation they describe. The frame is encrypted exactly once here;
 * every provider transports the identical immutable bytes.
 */

const clock = createHybridLogicalClock();

interface FrameInputs {
  db: LoremDB;
  ring: SyncKeyRing;
  deviceId: DeviceId;
  entityTable: string;
}

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
    keyId: keyIdOf(ring),
    epoch: ring.epoch,
  };
  const payload = await sealOperationPayload(ring, header, { ...row });
  return {
    ...header,
    logicalAt: row.logicalUpdatedAt,
    payload,
    payloadHash: await hashPayload(payload),
    signature: '',
  };
};

/** Build the delete frame (tombstone source) for an entity. */
export const makeDeleteFrame = async (
  options: FrameInputs & { entityId: string; accessScopeId: string },
): Promise<EncryptedSyncFrame> => {
  const { ring, deviceId, entityTable, entityId, accessScopeId } = options;
  const header: FrameHeader = {
    v: SYNC_OPERATION_VERSION,
    operationId: asOperationId(newId()),
    accessScopeId,
    entityTable,
    entityId,
    kind: 'delete' as const,
    deviceId,
    keyId: keyIdOf(ring),
    epoch: ring.epoch,
  };
  return {
    ...header,
    logicalAt: clock.now(),
    payload: '',
    payloadHash: await hashPayload(''),
    signature: '',
  };
};

/** Commit a domain put and its journal frame in one transaction. */
export const journalledPut = async (
  options: FrameInputs & { row: ReplicatedEntityMetadata & { id: string } },
): Promise<EncryptedSyncFrame> => {
  const frame = await makePutFrame(options);
  await options.db.transaction(
    'rw',
    [options.db.table(options.entityTable), options.db.syncOperations],
    async () => {
      await options.db.table(options.entityTable).put(options.row);
      await options.db.syncOperations.put(frame);
    },
  );
  return frame;
};

/** Commit a domain delete and its journal frame in one transaction. */
export const journalledDelete = async (
  options: FrameInputs & { entityId: string; accessScopeId: string },
): Promise<EncryptedSyncFrame> => {
  const frame = await makeDeleteFrame(options);
  await options.db.transaction(
    'rw',
    [options.db.table(options.entityTable), options.db.syncOperations],
    async () => {
      await options.db.table(options.entityTable).delete(options.entityId);
      await options.db.syncOperations.put(frame);
    },
  );
  return frame;
};
