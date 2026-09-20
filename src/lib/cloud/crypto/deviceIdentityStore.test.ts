import { beforeEach, describe, expect, it } from 'vitest';
import { deviceIdFor } from 'writer-sync/crypto';
import { deviceIdentityStore } from './deviceIdentityStore';

beforeEach(async () => {
  await deviceIdentityStore.forget();
});

describe('deviceIdentityStore', () => {
  it('creates an identity on first use', async () => {
    const identity = await deviceIdentityStore.load();

    expect(String(identity.deviceId).length).toBeGreaterThan(0);
    expect(identity.keys.privateKey.type).toBe('private');
    expect(identity.keys.publicKey.type).toBe('public');
  });

  it('returns the same device id on later calls', async () => {
    const first = await deviceIdentityStore.load();
    const second = await deviceIdentityStore.load();

    expect(second.deviceId).toBe(first.deviceId);
  });

  it('derives the device id from the public key rather than minting it', async () => {
    const identity = await deviceIdentityStore.load();

    await expect(deviceIdFor(identity.keys.publicKey)).resolves.toBe(identity.deviceId);
  });

  it('keeps the signing key non-extractable', async () => {
    const identity = await deviceIdentityStore.load();

    expect(identity.keys.privateKey.extractable).toBe(false);
    await expect(
      crypto.subtle.exportKey('pkcs8', identity.keys.privateKey),
    ).rejects.toBeInstanceOf(Error);
  });

  it('signs with a key the stored public half verifies', async () => {
    const { keys } = await deviceIdentityStore.load();
    const message = new TextEncoder().encode('pairing payload');
    const algorithm = { name: 'ECDSA', hash: 'SHA-256' } as const;

    const signature = await crypto.subtle.sign(algorithm, keys.privateKey, message);

    await expect(
      crypto.subtle.verify(algorithm, keys.publicKey, signature, message),
    ).resolves.toBe(true);
  });

  it('produces a different identity once forgotten', async () => {
    const before = await deviceIdentityStore.load();

    await deviceIdentityStore.forget();

    expect((await deviceIdentityStore.load()).deviceId).not.toBe(before.deviceId);
  });
});
