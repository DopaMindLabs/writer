import { beforeEach, describe, expect, it } from 'vitest';
import { InvariantError } from '@/lib/invariant';
import { asPrincipalId } from '@/lib/syncProviders/ids';
import { deviceKeyVault, unwrapPairingRoot } from './deviceKeyVault';
import { generateMasterSecret, deriveKeyRing, fingerprintsEqual } from './keys';

const PRINCIPAL = asPrincipalId('person-1');

beforeEach(async () => {
  await deviceKeyVault.forget();
});

describe('device identity', () => {
  it('mints a stable device id on first use', async () => {
    const first = await deviceKeyVault.deviceId();
    const second = await deviceKeyVault.deviceId();
    expect(first).toBe(second);
    expect(String(first).length).toBeGreaterThan(0);
  });
});

describe('account root storage', () => {
  it('reports no root before one is stored', async () => {
    await expect(deviceKeyVault.hasAccountRoot()).resolves.toBe(false);
    await expect(
      deviceKeyVault.deriveScopeKey({ accessScopeId: 's1', epoch: 1, principalId: PRINCIPAL }),
    ).resolves.toBeNull();
  });

  it('derives the same key ring the direct derivation produces', async () => {
    const root = generateMasterSecret();
    const direct = await deriveKeyRing(root, 1);
    await deviceKeyVault.storeAccountRoot(root, PRINCIPAL);

    const derived = await deviceKeyVault.deriveScopeKey({
      accessScopeId: 's1',
      epoch: 1,
      principalId: PRINCIPAL,
    });

    expect(derived).not.toBeNull();
    expect(fingerprintsEqual(derived!.fingerprint, direct.fingerprint)).toBe(true);
    expect(derived!.epoch).toBe(1);
  });

  it('resolves every scope to the account key during Stage 1', async () => {
    await deviceKeyVault.storeAccountRoot(generateMasterSecret(), PRINCIPAL);
    const a = await deviceKeyVault.deriveScopeKey({ accessScopeId: 'scope-a', epoch: 1, principalId: PRINCIPAL });
    const b = await deviceKeyVault.deriveScopeKey({ accessScopeId: 'scope-b', epoch: 1, principalId: PRINCIPAL });
    expect(fingerprintsEqual(a!.fingerprint, b!.fingerprint)).toBe(true);
  });

  it('refuses a record bound to a different principal', async () => {
    await deviceKeyVault.storeAccountRoot(generateMasterSecret(), PRINCIPAL);
    await expect(
      deviceKeyVault.deriveScopeKey({
        accessScopeId: 's1',
        epoch: 1,
        principalId: asPrincipalId('intruder'),
      }),
    ).rejects.toBeInstanceOf(InvariantError);
  });
});

describe('pairing wrapper', () => {
  it('round-trips the root to a peer without exposing it through the API', async () => {
    const root = generateMasterSecret();
    await deviceKeyVault.storeAccountRoot(root, PRINCIPAL);

    // The joining peer mints its own ephemeral ECDH pair and sends the public half.
    const peer = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey'],
    );
    const wrapper = await deviceKeyVault.wrapAccountRootForPairing({
      peerEphemeralPublicJwk: await crypto.subtle.exportKey('jwk', peer.publicKey),
      principalId: PRINCIPAL,
    });

    // The wrapper carries only ciphertext and public material — never the root.
    expect(wrapper.wrapped).not.toContain(btoa(String.fromCharCode(...root)));
    expect(wrapper.ephemeralPublicJwk.kty).toBe('EC');
    expect(wrapper.ephemeralPublicJwk.d).toBeUndefined();

    const unwrapped = await unwrapPairingRoot(wrapper, peer.privateKey);
    expect(Array.from(unwrapped)).toEqual(Array.from(root));
  });

  it('refuses to wrap for the wrong principal', async () => {
    await deviceKeyVault.storeAccountRoot(generateMasterSecret(), PRINCIPAL);
    const peer = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey'],
    );
    await expect(
      deviceKeyVault.wrapAccountRootForPairing({
        peerEphemeralPublicJwk: await crypto.subtle.exportKey('jwk', peer.publicKey),
        principalId: asPrincipalId('intruder'),
      }),
    ).rejects.toBeInstanceOf(InvariantError);
  });

  it('refuses to wrap when no root is stored', async () => {
    const peer = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey'],
    );
    await expect(
      deviceKeyVault.wrapAccountRootForPairing({
        peerEphemeralPublicJwk: await crypto.subtle.exportKey('jwk', peer.publicKey),
        principalId: PRINCIPAL,
      }),
    ).rejects.toBeInstanceOf(InvariantError);
  });
});
