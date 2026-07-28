import { describe, expect, it, vi } from 'vitest';
import { asDeviceId, asOperationId, asPrincipalId } from '../core/ids';
import {
  TrustedDeviceStatus,
  type TrustedDeviceRecord,
} from '../core/trustedDevice.types';
import type { TrustedDeviceRegistry } from '../core/trustedDeviceRegistry.types';
import type { EncryptedSyncFrame } from '../operations/operation.types';
import { generateDeviceIdentity, publicJwkOf } from './deviceIdentity';
import { signFrame } from './frameSignature';
import { createTrustedFrameVerifier } from './trustedFrameVerifier';

const DEVICE = asDeviceId('device-a');

const frameOf = (overrides: Partial<EncryptedSyncFrame> = {}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId('op-1'),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: 'note-1',
  kind: 'put',
  deviceId: DEVICE,
  logicalAt: { millis: 10, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'aGFzaA',
  payload: 'cGF5bG9hZA',
  signature: '',
  ...overrides,
});

const registryOf = (record: TrustedDeviceRecord | null): TrustedDeviceRegistry => ({
  list: async () => (record ? [record] : []),
  find: async () => record,
  trust: async () => undefined,
  recordSession: async () => undefined,
  revoke: async () => undefined,
  acknowledge: async () => undefined,
});

const recordFor = async (options: {
  publicKey: CryptoKey;
  status?: TrustedDeviceStatus;
}): Promise<TrustedDeviceRecord> => ({
  deviceId: DEVICE,
  publicIdentityJwk: await publicJwkOf(options.publicKey),
  principalId: asPrincipalId('author-1'),
  addedAt: 1_700_000_000_000,
  displayName: 'Laptop',
  status: options.status ?? TrustedDeviceStatus.Active,
  acknowledgedOperations: {},
});

const signedFrame = async (privateKey: CryptoKey): Promise<EncryptedSyncFrame> => {
  const frame = frameOf();
  return { ...frame, signature: await signFrame(privateKey, frame) };
};

describe('createTrustedFrameVerifier', () => {
  it('accepts a frame signed by an active trusted device', async () => {
    const keys = await generateDeviceIdentity();
    const verify = createTrustedFrameVerifier(
      registryOf(await recordFor({ publicKey: keys.publicKey })),
    );

    await expect(verify(await signedFrame(keys.privateKey))).resolves.toBe(true);
  });

  it('refuses a frame from a device it has never paired with', async () => {
    const keys = await generateDeviceIdentity();
    const verify = createTrustedFrameVerifier(registryOf(null));

    await expect(verify(await signedFrame(keys.privateKey))).resolves.toBe(false);
  });

  it('refuses a frame from a revoked device, however valid the signature', async () => {
    const keys = await generateDeviceIdentity();
    const verify = createTrustedFrameVerifier(
      registryOf(
        await recordFor({
          publicKey: keys.publicKey,
          status: TrustedDeviceStatus.Revoked,
        }),
      ),
    );

    await expect(verify(await signedFrame(keys.privateKey))).resolves.toBe(false);
  });

  it('refuses a frame signed by a key the registry does not hold', async () => {
    const trusted = await generateDeviceIdentity();
    const impostor = await generateDeviceIdentity();
    const verify = createTrustedFrameVerifier(
      registryOf(await recordFor({ publicKey: trusted.publicKey })),
    );

    await expect(verify(await signedFrame(impostor.privateKey))).resolves.toBe(false);
  });

  it('refuses an unsigned frame rather than throwing', async () => {
    const keys = await generateDeviceIdentity();
    const verify = createTrustedFrameVerifier(
      registryOf(await recordFor({ publicKey: keys.publicKey })),
    );

    await expect(verify(frameOf())).resolves.toBe(false);
  });

  it('refuses when the stored identity key is malformed', async () => {
    const keys = await generateDeviceIdentity();
    const record = await recordFor({ publicKey: keys.publicKey });
    const verify = createTrustedFrameVerifier(
      registryOf({ ...record, publicIdentityJwk: { kty: 'oops' } }),
    );

    await expect(verify(await signedFrame(keys.privateKey))).resolves.toBe(false);
  });

  it('imports a device’s key once however many frames it verifies', async () => {
    const keys = await generateDeviceIdentity();
    const record = await recordFor({ publicKey: keys.publicKey });
    const find = vi.fn().mockResolvedValue(record);
    const verify = createTrustedFrameVerifier({ ...registryOf(record), find });

    const frame = await signedFrame(keys.privateKey);
    await verify(frame);
    await verify(frame);
    await verify(frame);

    expect(find).toHaveBeenCalledTimes(1);
  });
});
