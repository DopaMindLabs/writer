import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type DeviceId,
} from 'writer-sync/core';
import {
  generateDeviceIdentity,
  publicJwkOf,
  signFrame,
} from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { createWriterFrameVerifier } from './writerFrameVerifier';

const PEER = asDeviceId('device-peer');

let db: LoremDB;

const frameOf = (deviceId: DeviceId): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId('op-1'),
  accessScopeId: 's1',
  entityTable: 'notes',
  entityId: 'n1',
  kind: 'put',
  deviceId,
  logicalAt: { millis: 1000, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'aGFzaA',
  payload: 'cGF5bG9hZA',
  signature: '',
});

const signedBy = async (
  privateKey: CryptoKey,
  deviceId: DeviceId,
): Promise<EncryptedSyncFrame> => {
  const frame = frameOf(deviceId);
  return { ...frame, signature: await signFrame(privateKey, frame) };
};

/** Record `keys` as a paired peer, the way a confirmed pairing would. */
const trustPeer = async (publicKey: CryptoKey): Promise<void> => {
  await createTrustedDeviceStore(db).trust({
    deviceId: PEER,
    publicIdentityJwk: await publicJwkOf(publicKey),
    principalId: asPrincipalId('me'),
    addedAt: 1_700_000_000_000,
    lastSessionAt: 1_700_000_000_000,
    displayName: 'Laptop',
    status: TrustedDeviceStatus.Active,
    acknowledgedOperations: {},
  });
};

beforeEach(async () => {
  db = new LoremDB('writer-frame-verifier');
  await db.open();
});

afterEach(async () => {
  await db.delete();
  await deviceIdentityStore.forget();
});

describe('createWriterFrameVerifier', () => {
  it('accepts a frame signed by a paired device', async () => {
    const peer = await generateDeviceIdentity();
    await trustPeer(peer.publicKey);

    const verify = createWriterFrameVerifier(db);

    expect(await verify(await signedBy(peer.privateKey, PEER))).toBe(true);
  });

  it('refuses a frame from a device this one has never paired with', async () => {
    const stranger = await generateDeviceIdentity();

    const verify = createWriterFrameVerifier(db);

    expect(await verify(await signedBy(stranger.privateKey, PEER))).toBe(false);
  });

  it('refuses a frame from a device whose trust was revoked', async () => {
    const peer = await generateDeviceIdentity();
    await trustPeer(peer.publicKey);
    await createTrustedDeviceStore(db).revoke({
      deviceId: PEER,
      at: 1_700_000_100_000,
    });

    const verify = createWriterFrameVerifier(db);

    expect(await verify(await signedBy(peer.privateKey, PEER))).toBe(false);
  });

  it('refuses a frame a trusted device did not actually sign', async () => {
    const peer = await generateDeviceIdentity();
    const impostor = await generateDeviceIdentity();
    await trustPeer(peer.publicKey);

    const verify = createWriterFrameVerifier(db);

    expect(await verify(await signedBy(impostor.privateKey, PEER))).toBe(false);
  });

  it('refuses an unsigned frame', async () => {
    const peer = await generateDeviceIdentity();
    await trustPeer(peer.publicKey);

    const verify = createWriterFrameVerifier(db);

    expect(await verify(frameOf(PEER))).toBe(false);
  });

  it('accepts this device’s own frame without a registry record', async () => {
    const own = await deviceIdentityStore.load();

    const verify = createWriterFrameVerifier(db);

    expect(await verify(await signedBy(own.keys.privateKey, own.deviceId))).toBe(true);
  });

  it('refuses a frame forged under this device’s own id', async () => {
    const own = await deviceIdentityStore.load();
    const impostor = await generateDeviceIdentity();

    const verify = createWriterFrameVerifier(db);

    expect(await verify(await signedBy(impostor.privateKey, own.deviceId))).toBe(false);
  });

  it('does not mint an identity for a device that has authored nothing', async () => {
    const peer = await generateDeviceIdentity();

    const verify = createWriterFrameVerifier(db);
    await verify(await signedBy(peer.privateKey, PEER));

    expect(await deviceIdentityStore.current()).toBeNull();
  });
});
