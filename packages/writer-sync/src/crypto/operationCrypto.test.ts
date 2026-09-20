import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import {
  SYNC_OPERATION_VERSION,
  type SyncOperationHeader,
} from '../operations/operation.types';
import {
  OperationPayloadIntegrityError,
  openOperationPayload,
  sealOperationPayload,
} from './operationCrypto';
import type { SyncKeyRing } from './keyResolver';

/**
 * The payload is sealed against its routing header, so this suite is about what
 * a hostile transport can and cannot change: every bound field must break
 * authentication when it is altered between sealing and opening.
 */

const ring = async (): Promise<SyncKeyRing> => ({
  epoch: 1,
  contentKey: await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]),
  fingerprint: new Uint8Array([9, 9, 9]),
});

const header = (): Omit<SyncOperationHeader, 'payloadHash'> => ({
  v: SYNC_OPERATION_VERSION,
  operationId: asOperationId('op-1'),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: 'n1',
  kind: 'put',
  deviceId: asDeviceId('device-a'),
  logicalAt: { millis: 2000, counter: 3 },
  keyId: 'fp-1',
  epoch: 1,
});

describe('operation payload crypto', () => {
  it('round-trips content under the header it was sealed against', async () => {
    const keyRing = await ring();
    const payload = await sealOperationPayload(keyRing, header(), { body: 'hello' });

    expect(await openOperationPayload(keyRing, header(), payload)).toEqual({
      body: 'hello',
    });
  });

  it('rejects a payload whose logical time was altered in transit', async () => {
    const keyRing = await ring();
    const payload = await sealOperationPayload(keyRing, header(), { body: 'hello' });
    // A transport rewinding the timestamp would otherwise force this stale
    // content over newer content on every receiver.
    const retimed = { ...header(), logicalAt: { millis: 1, counter: 0 } };

    await expect(
      openOperationPayload(keyRing, retimed, payload),
    ).rejects.toBeInstanceOf(OperationPayloadIntegrityError);
  });

  it('rejects a payload whose counter alone was altered in transit', async () => {
    const keyRing = await ring();
    const payload = await sealOperationPayload(keyRing, header(), { body: 'hello' });
    const retimed = { ...header(), logicalAt: { millis: 2000, counter: 4 } };

    await expect(
      openOperationPayload(keyRing, retimed, payload),
    ).rejects.toBeInstanceOf(OperationPayloadIntegrityError);
  });

  it('rejects a payload relabelled into another access scope', async () => {
    const keyRing = await ring();
    const payload = await sealOperationPayload(keyRing, header(), { body: 'hello' });
    const relabelled = { ...header(), accessScopeId: 'scope-2' };

    await expect(
      openOperationPayload(keyRing, relabelled, payload),
    ).rejects.toBeInstanceOf(OperationPayloadIntegrityError);
  });

  it('rejects a payload re-attributed to another device', async () => {
    const keyRing = await ring();
    const payload = await sealOperationPayload(keyRing, header(), { body: 'hello' });
    const reattributed = { ...header(), deviceId: asDeviceId('device-b') };

    await expect(
      openOperationPayload(keyRing, reattributed, payload),
    ).rejects.toBeInstanceOf(OperationPayloadIntegrityError);
  });
});
