import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import type { EncryptedSyncFrame } from '../operations/operation.types';
import { generateDeviceIdentity } from './deviceIdentity';
import { signPairingPayload } from './deviceSignature';
import {
  MissingFrameSignatureError,
  signFrame,
  verifyFrameSignature,
} from './frameSignature';

const frameOf = (overrides: Partial<EncryptedSyncFrame> = {}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId('op-1'),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: 'note-1',
  kind: 'put',
  deviceId: asDeviceId('device-a'),
  logicalAt: { millis: 10, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'aGFzaA',
  payload: 'cGF5bG9hZA',
  signature: '',
  ...overrides,
});

const signed = async (
  keys: { privateKey: CryptoKey },
  overrides: Partial<EncryptedSyncFrame> = {},
): Promise<EncryptedSyncFrame> => {
  const frame = frameOf(overrides);
  return { ...frame, signature: await signFrame(keys.privateKey, frame) };
};

describe('signFrame and verifyFrameSignature', () => {
  it('verifies a frame signed by the device that authored it', async () => {
    const keys = await generateDeviceIdentity();

    await expect(verifyFrameSignature(keys.publicKey, await signed(keys))).resolves.toBe(
      true,
    );
  });

  it('refuses a frame signed by a different device', async () => {
    const author = await generateDeviceIdentity();
    const impostor = await generateDeviceIdentity();

    await expect(
      verifyFrameSignature(impostor.publicKey, await signed(author)),
    ).resolves.toBe(false);
  });

  it('is insensitive to the order the header fields are written in', async () => {
    const keys = await generateDeviceIdentity();
    const frame = await signed(keys);
    const reordered = Object.fromEntries(
      Object.entries(frame).reverse(),
    ) as unknown as EncryptedSyncFrame;

    await expect(verifyFrameSignature(keys.publicKey, reordered)).resolves.toBe(true);
  });

  it('throws rather than returning false when the signature is absent', async () => {
    const keys = await generateDeviceIdentity();

    await expect(verifyFrameSignature(keys.publicKey, frameOf())).rejects.toThrow(
      MissingFrameSignatureError,
    );
  });

  it('refuses a malformed signature without throwing', async () => {
    const keys = await generateDeviceIdentity();

    await expect(
      verifyFrameSignature(keys.publicKey, frameOf({ signature: 'not-a-signature' })),
    ).resolves.toBe(false);
  });
});

describe('a signature covers every field that decides an outcome', () => {
  const tampering: Partial<EncryptedSyncFrame>[] = [
    { accessScopeId: 'scope-2' },
    { entityTable: 'docs' },
    { entityId: 'note-2' },
    { kind: 'delete' },
    { deviceId: asDeviceId('device-b') },
    { logicalAt: { millis: 9_999, counter: 0 } },
    { keyId: 'key-2' },
    { epoch: 2 },
    { payloadHash: 'b3RoZXI' },
    { payload: 'b3RoZXI' },
    { operationId: asOperationId('op-2') },
  ];

  it.each(tampering)('refuses a frame altered in %o', async (change) => {
    const keys = await generateDeviceIdentity();
    const frame = await signed(keys);

    await expect(
      verifyFrameSignature(keys.publicKey, { ...frame, ...change }),
    ).resolves.toBe(false);
  });
});

describe('domain separation from pairing', () => {
  it('refuses a pairing signature replayed over the same fields', async () => {
    const keys = await generateDeviceIdentity();
    const frame = frameOf();
    const asPairingPayload = {
      v: frame.v,
      operationId: String(frame.operationId),
      accessScopeId: frame.accessScopeId,
      entityTable: frame.entityTable,
      entityId: frame.entityId,
      kind: frame.kind,
      deviceId: String(frame.deviceId),
      logicalAt: { millis: frame.logicalAt.millis, counter: frame.logicalAt.counter },
      keyId: frame.keyId,
      epoch: frame.epoch,
      payloadHash: frame.payloadHash,
      payload: frame.payload,
    };

    const pairingSignature = await signPairingPayload(keys.privateKey, asPairingPayload);

    await expect(
      verifyFrameSignature(keys.publicKey, { ...frame, signature: pairingSignature }),
    ).resolves.toBe(false);
  });
});
