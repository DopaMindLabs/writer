import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import {
  generateRootSecret,
  deriveKeyRing,
  type CloudKeyRing,
} from '@/lib/cloud/crypto/keys';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import type { ScopeKeyResolver } from 'writer-sync/crypto';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type DeviceId,
} from 'writer-sync/core';
import {
  deviceIdFor,
  generateDeviceIdentity,
  publicJwkOf,
  signFrame,
  type DeviceIdentityKeys,
} from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import {
  ACCOUNT_IDENTITY_SCOPE,
  accountDeviceIdentityId,
} from '@/lib/writerSyncIntegration/accountDeviceIdentity.types';
import { createAccountDeviceIdentityStore } from '@/lib/writerSyncIntegration/accountDeviceIdentityStore';
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

/**
 * Account trust: a never-paired device on the same cloud account is believed
 * only through an authenticated registry record — sealed under the account
 * key, its id re-derived from its own public key. These use real derived
 * device ids throughout: an account identity cannot exist for a minted id.
 */
describe('createWriterFrameVerifier — same-account trust', () => {
  let cloudDb: LoremDB;
  let ring: CloudKeyRing | null = null;
  const resolver: ScopeKeyResolver = {
    keyFor: () => ring,
    hasAnyKey: () => ring !== null,
  };

  /** A device with a real cryptographic identity: keys plus derived id. */
  const mintDevice = async (): Promise<{ keys: DeviceIdentityKeys; deviceId: DeviceId; jwk: JsonWebKey }> => {
    const keys = await generateDeviceIdentity();
    return {
      keys,
      deviceId: await deviceIdFor(keys.publicKey),
      jwk: await publicJwkOf(keys.publicKey),
    };
  };

  const publishIdentity = (device: { deviceId: DeviceId; jwk: JsonWebKey }): Promise<void> =>
    createAccountDeviceIdentityStore(cloudDb).put({
      id: accountDeviceIdentityId(device.deviceId),
      accessScopeId: ACCOUNT_IDENTITY_SCOPE,
      deviceId: device.deviceId,
      publicIdentityJwk: device.jwk,
      authorisedAt: 1723000000000,
    });

  const pairAs = (deviceId: DeviceId, jwk: JsonWebKey): Promise<void> =>
    createTrustedDeviceStore(cloudDb).trust({
      deviceId,
      publicIdentityJwk: jwk,
      principalId: asPrincipalId('me'),
      addedAt: 1_700_000_000_000,
      lastSessionAt: 1_700_000_000_000,
      displayName: 'Other device',
      status: TrustedDeviceStatus.Active,
      acknowledgedOperations: {},
    });

  beforeEach(async () => {
    cloudDb = new LoremDB(`writer-frame-verifier-cloud-${crypto.randomUUID()}`, {
      cloud: true,
    });
    cloudDb.use(createEncryptionMiddleware(resolver));
    await cloudDb.open();
    ring = await deriveKeyRing(generateRootSecret(), 1);
  });

  afterEach(async () => {
    ring = null;
    await cloudDb.delete();
    await deviceIdentityStore.forget();
  });

  it('accepts a never-paired same-account device through its identity record', async () => {
    const device = await mintDevice();
    await publishIdentity(device);

    const verify = createWriterFrameVerifier(cloudDb);

    expect(await verify(await signedBy(device.keys.privateKey, device.deviceId))).toBe(true);
  });

  it('refuses an invalid signature even with a valid account record', async () => {
    const device = await mintDevice();
    const impostor = await generateDeviceIdentity();
    await publishIdentity(device);

    const verify = createWriterFrameVerifier(cloudDb);

    expect(await verify(await signedBy(impostor.privateKey, device.deviceId))).toBe(false);
  });

  it('refuses a registry record whose key derives a different device id', async () => {
    const claimed = await mintDevice();
    const other = await mintDevice();
    // Planted through the raw table: id claims one device, key names another.
    await cloudDb.table('accountDeviceIdentities').put({
      id: accountDeviceIdentityId(claimed.deviceId),
      accessScopeId: ACCOUNT_IDENTITY_SCOPE,
      deviceId: String(claimed.deviceId),
      publicIdentityJwk: other.jwk,
      authorisedAt: 1,
    });

    const verify = createWriterFrameVerifier(cloudDb);

    // Neither key may authorise the claimed id through this record.
    expect(await verify(await signedBy(other.keys.privateKey, claimed.deviceId))).toBe(false);
    expect(await verify(await signedBy(claimed.keys.privateKey, claimed.deviceId))).toBe(false);
  });

  it('authorises nothing while keyless — an unreadable registry is no registry', async () => {
    const device = await mintDevice();
    await publishIdentity(device);
    ring = null;

    const verify = createWriterFrameVerifier(cloudDb);

    expect(await verify(await signedBy(device.keys.privateKey, device.deviceId))).toBe(false);
  });

  it('fails closed when the paired and account identities for one id disagree', async () => {
    const accountDevice = await mintDevice();
    await publishIdentity(accountDevice);
    // A pairing (whose ids are established by the pairing checkpoint, not
    // derived here) recorded a different key under the same device id.
    const pairedKeys = await generateDeviceIdentity();
    await pairAs(accountDevice.deviceId, await publicJwkOf(pairedKeys.publicKey));

    const verify = createWriterFrameVerifier(cloudDb);

    // Two sources, two identities: an integrity failure. Neither signature may
    // pass — "try both until one works" would make the disagreement invisible.
    expect(await verify(await signedBy(pairedKeys.privateKey, accountDevice.deviceId))).toBe(false);
    expect(
      await verify(await signedBy(accountDevice.keys.privateKey, accountDevice.deviceId)),
    ).toBe(false);
  });

  it('accepts a device both paired and account-registered under one identity', async () => {
    const device = await mintDevice();
    await publishIdentity(device);
    await pairAs(device.deviceId, device.jwk);

    const verify = createWriterFrameVerifier(cloudDb);

    expect(await verify(await signedBy(device.keys.privateKey, device.deviceId))).toBe(true);
  });

  it('resolves each device once per verifier and never keeps a negative across sweeps', async () => {
    const device = await mintDevice();
    const pairedGet = vi.spyOn(cloudDb.trustedDevices, 'get');
    const accountGet = vi.spyOn(cloudDb.accountDeviceIdentities, 'get');

    // Sweep 1: unknown device, two frames — one lookup, memoised negative.
    const first = createWriterFrameVerifier(cloudDb);
    expect(await first(await signedBy(device.keys.privateKey, device.deviceId))).toBe(false);
    expect(await first(await signedBy(device.keys.privateKey, device.deviceId))).toBe(false);
    expect(pairedGet).toHaveBeenCalledTimes(1);
    expect(accountGet).toHaveBeenCalledTimes(1);

    // The identity replicates between sweeps; a fresh verifier must see it —
    // the negative memo dies with the sweep that recorded it.
    await publishIdentity(device);
    const second = createWriterFrameVerifier(cloudDb);
    expect(await second(await signedBy(device.keys.privateKey, device.deviceId))).toBe(true);
  });
});
