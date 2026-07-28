import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import {
  ephemeralPublicJwkOf,
  generatePairingEphemeral,
  type PairingEphemeralKeys,
} from 'writer-sync/crypto';
import type { AuthenticatedPeerParameters } from 'writer-sync/pairing';
import { deviceKeyVault } from '@/lib/cloud/crypto/deviceKeyVault';
import {
  deviceKeyProvider,
  forgetDeviceKeyRing,
  saveDeviceKeyRing,
} from '@/lib/cloud/crypto/keyStore';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import { currentPrincipal } from './writerEntityMetadata';
import { accountRootTransferPorts } from './accountRootTransfer';

/**
 * Writer's half of the account-root handover, against real Web Crypto.
 *
 * What matters here is that a device which receives a root ends up exactly where
 * one that unlocked by passphrase does — same vault, same ring — and that a
 * wrapper only opens for the session it was sealed in.
 */

const EPOCH = 4;
const HERE = asDeviceId('this-device');

let ephemeral: PairingEphemeralKeys;
let root: Uint8Array;

const peerFor = async (transcript: Uint8Array): Promise<AuthenticatedPeerParameters> => ({
  deviceId: asDeviceId('peer-device'),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  peerEphemeralPublicJwk: await ephemeralPublicJwkOf(ephemeral.publicKey),
  transcript,
  verificationCode: '048213',
});

beforeEach(async () => {
  ephemeral = await generatePairingEphemeral();
  root = generateMasterSecret();
  await deviceKeyVault.storeAccountRoot(root, await currentPrincipal());
  await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(root, EPOCH) });
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await deviceKeyVault.forget();
});

describe('accountRootTransferPorts', () => {
  it('holds a root exactly when this device can seal a row', async () => {
    const transcript = new Uint8Array([1, 2, 3, 4]);
    const ports = accountRootTransferPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    expect(ports.holdsRoot()).toBe(true);

    await forgetDeviceKeyRing();

    // Stored bytes are not the question — whether a row can be sealed right now
    // is, and that is what the peer is being told.
    expect(ports.holdsRoot()).toBe(false);
  });

  it('seals the root at the epoch its ring derives with', async () => {
    const transcript = new Uint8Array([1, 2, 3, 4]);
    const ports = accountRootTransferPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    const sealed = await ports.wrapForPeer();

    // Guessing the epoch on the far side would derive a key that decrypts
    // nothing, which reads as a peer with no writing rather than as a fault.
    expect(sealed.epoch).toBe(EPOCH);
    expect(sealed.wrapper.wrapped.length).toBeGreaterThan(0);
  });

  it('installs a root it receives, leaving the device able to seal', async () => {
    const transcript = new Uint8Array([9, 9, 9]);
    const ports = accountRootTransferPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });
    const sealed = await ports.wrapForPeer();
    await forgetDeviceKeyRing();
    await deviceKeyVault.forget();

    await ports.acceptWrapper(sealed);

    expect(deviceKeyProvider.hasAnyKey()).toBe(true);
    expect(deviceKeyProvider.current()?.epoch).toBe(EPOCH);
    expect(await deviceKeyVault.hasAccountRoot()).toBe(true);
  });

  it('creates an account when this device is the one to do it', async () => {
    // Two devices that have never been used: one has to mint, and the ids they
    // exchanged decide which without another round trip.
    await forgetDeviceKeyRing();
    await deviceKeyVault.forget();
    const ports = accountRootTransferPorts({
      peer: await peerFor(new Uint8Array([7])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    expect(ports.holdsRoot()).toBe(false);

    await ports.createRoot();

    expect(ports.holdsRoot()).toBe(true);
    expect(await deviceKeyVault.hasAccountRoot()).toBe(true);
  });

  it('defers to the peer that sorts above it', async () => {
    const ports = accountRootTransferPorts({
      peer: await peerFor(new Uint8Array([7])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: asDeviceId('aaa-below-the-peer'),
    });

    // The peer's id is 'peer-device'; this one sorts below it, so the peer mints.
    expect(ports.mintsFirst()).toBe(false);
  });

  it('refuses a wrapper sealed in a different session', async () => {
    const sealed = await accountRootTransferPorts({
      peer: await peerFor(new Uint8Array([1, 1, 1])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    }).wrapForPeer();

    // The key and the AAD are both bound to the transcript, so a wrapper lifted
    // from another exchange simply fails to open.
    const elsewhere = accountRootTransferPorts({
      peer: await peerFor(new Uint8Array([2, 2, 2])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    await expect(elsewhere.acceptWrapper(sealed)).rejects.toThrow();
  });

  it('refuses to open anything when this session minted no ephemeral key', async () => {
    const transcript = new Uint8Array([5, 5]);
    const ports = accountRootTransferPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });
    const sealed = await ports.wrapForPeer();

    const keyless = accountRootTransferPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: null,
      deviceId: HERE,
    });

    await expect(keyless.acceptWrapper(sealed)).rejects.toThrow();
  });
});
