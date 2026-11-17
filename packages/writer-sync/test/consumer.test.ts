import { describe, expect, it } from 'vitest';
import {
  asDeviceId,
  asOperationId,
  asPrincipalId,
  compareTimestamps,
  createEntityMetadata,
  createHybridLogicalClock,
  createSyncCoordinator,
  hasCapability,
  type SyncProvider,
} from '../src/core/index';
import {
  EMPTY_PAYLOAD_HASH,
  SYNC_OPERATION_VERSION,
  compareOperations,
  hashPayload,
  verifyFrame,
  type EncryptedSyncFrame,
  type SyncOperationHeader,
} from '../src/operations/index';
import {
  openOperationPayload,
  sealOperationPayload,
  type SyncKeyRing,
} from '../src/crypto/index';

/**
 * The fixture consumer: a caller outside Writer, importing only the public
 * subpaths. It exists to prove the ports are sufficient without the application
 * — if this file ever needs an internal path, a Writer type, or a database, the
 * package boundary has leaked and the extraction is no longer honest.
 *
 * It composes what a second consumer would actually do: configure a provider,
 * seal an operation, and verify it round-trips.
 */

const ring = async (): Promise<SyncKeyRing> => ({
  epoch: 1,
  contentKey: await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]),
  fingerprint: new Uint8Array([1, 2, 3, 4]),
});

/** A provider with nothing but durable sync — the minimum the contract allows. */
const durableOnly = (): SyncProvider => ({
  id: 'fixture',
  kind: 'fixture',
  durableSync: {
    start: () => Promise.resolve(() => undefined),
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

describe('a consumer outside Writer', () => {
  it('configures a coordinator and resolves capabilities by configuration', () => {
    const provider = durableOnly();
    const coordinator = createSyncCoordinator({
      providers: [provider],
      defaultProviderInstanceId: 'fixture',
    });

    expect(coordinator.defaultProvider()?.id).toBe('fixture');
    expect(coordinator.capabilities('durableSync')).toHaveLength(1);
    expect(hasCapability(provider, 'realtime')).toBe(false);
  });

  it('stamps replication metadata and orders it by logical time', () => {
    const clock = createHybridLogicalClock();
    const first = createEntityMetadata({
      accessScopeId: 'scope-1',
      principal: asPrincipalId('someone'),
      mutationId: asOperationId('op-1'),
      at: clock.now(),
    });
    const second = clock.now();

    expect(first.accessScopeId).toBe('scope-1');
    expect(first.createdBy).toBe(first.updatedBy);
    expect(compareTimestamps(first.logicalUpdatedAt, second)).toBeLessThan(0);
  });

  it('seals an operation and verifies the frame it produces', async () => {
    const keyRing = await ring();
    const header: Omit<SyncOperationHeader, 'payloadHash'> = {
      v: SYNC_OPERATION_VERSION,
      operationId: asOperationId('op-1'),
      accessScopeId: 'scope-1',
      entityTable: 'things',
      entityId: 'thing-1',
      kind: 'put' as const,
      deviceId: asDeviceId('device-1'),
      logicalAt: { millis: 1000, counter: 0 },
      keyId: 'fp-consumer',
      epoch: keyRing.epoch,
    };
    const payload = await sealOperationPayload(keyRing, header, { hello: 'world' });
    const frame: EncryptedSyncFrame = {
      ...header,
      payload,
      payloadHash: await hashPayload(payload),
      signature: '',
    };

    const verified = await verifyFrame(frame, { expectedScope: 'scope-1' });
    expect(await openOperationPayload(keyRing, verified, verified.payload)).toEqual({
      hello: 'world',
    });
  });

  it('converges two operations deterministically and knows the empty hash', async () => {
    const earlier: EncryptedSyncFrame = {
      v: SYNC_OPERATION_VERSION,
      operationId: asOperationId('op-a'),
      accessScopeId: 'scope-1',
      entityTable: 'things',
      entityId: 'thing-1',
      kind: 'delete',
      deviceId: asDeviceId('device-a'),
      logicalAt: { millis: 1000, counter: 0 },
      keyId: 'k',
      epoch: 1,
      payload: '',
      payloadHash: EMPTY_PAYLOAD_HASH,
      signature: '',
    };
    const later: EncryptedSyncFrame = {
      ...earlier,
      operationId: asOperationId('op-b'),
      logicalAt: { millis: 2000, counter: 0 },
    };

    expect(compareOperations(earlier, later)).toBeLessThan(0);
    expect(await hashPayload('')).toBe(EMPTY_PAYLOAD_HASH);
  });
});
