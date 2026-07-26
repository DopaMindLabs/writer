import { describe, expect, it } from 'vitest';
import {
  DEVICE_IDENTITY_ALGORITHM,
  MalformedDeviceKeyError,
  deviceIdFor,
  generateDeviceIdentity,
  importDevicePublicKey,
  publicJwkOf,
} from './deviceIdentity';

describe('generateDeviceIdentity', () => {
  it('produces an ECDSA P-256 pair whose private half cannot be extracted', async () => {
    const identity = await generateDeviceIdentity();
    expect(identity.privateKey.algorithm).toMatchObject(DEVICE_IDENTITY_ALGORITHM);
    expect(identity.privateKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('jwk', identity.privateKey)).rejects.toThrow();
  });

  it('produces a public half that can be published', async () => {
    const identity = await generateDeviceIdentity();
    const jwk = await publicJwkOf(identity.publicKey);
    expect(jwk).toMatchObject({ kty: 'EC', crv: 'P-256' });
    expect(typeof jwk.x).toBe('string');
    expect(typeof jwk.y).toBe('string');
  });

  it('never exposes the private scalar in the published key', async () => {
    const identity = await generateDeviceIdentity();
    expect(await publicJwkOf(identity.publicKey)).not.toHaveProperty('d');
  });

  it('mints a different identity each time', async () => {
    const [a, b] = await Promise.all([generateDeviceIdentity(), generateDeviceIdentity()]);
    expect(await deviceIdFor(a.publicKey)).not.toBe(await deviceIdFor(b.publicKey));
  });
});

describe('deviceIdFor', () => {
  it('derives a stable 128-bit base64url id from the public key', async () => {
    const identity = await generateDeviceIdentity();
    const id = await deviceIdFor(identity.publicKey);
    // 16 bytes of base64url, unpadded.
    expect(String(id)).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('is deterministic for one key', async () => {
    const identity = await generateDeviceIdentity();
    expect(await deviceIdFor(identity.publicKey)).toBe(await deviceIdFor(identity.publicKey));
  });

  it('survives an export and re-import of the public key', async () => {
    const identity = await generateDeviceIdentity();
    const reimported = await importDevicePublicKey(await publicJwkOf(identity.publicKey));
    expect(await deviceIdFor(reimported)).toBe(await deviceIdFor(identity.publicKey));
  });
});

describe('importDevicePublicKey', () => {
  it('accepts a well-formed public JWK', async () => {
    const identity = await generateDeviceIdentity();
    const imported = await importDevicePublicKey(await publicJwkOf(identity.publicKey));
    expect(imported.type).toBe('public');
  });

  it('rejects a JWK carrying a private component rather than filtering it', async () => {
    const identity = await generateDeviceIdentity();
    const jwk = await publicJwkOf(identity.publicKey);
    await expect(importDevicePublicKey({ ...jwk, d: 'AQAB' })).rejects.toBeInstanceOf(
      MalformedDeviceKeyError,
    );
  });

  it('rejects a JWK on the wrong curve', async () => {
    const identity = await generateDeviceIdentity();
    const jwk = await publicJwkOf(identity.publicKey);
    await expect(importDevicePublicKey({ ...jwk, crv: 'P-384' })).rejects.toBeInstanceOf(
      MalformedDeviceKeyError,
    );
  });

  it('rejects a JWK of the wrong key type', async () => {
    const identity = await generateDeviceIdentity();
    const jwk = await publicJwkOf(identity.publicKey);
    await expect(importDevicePublicKey({ ...jwk, kty: 'RSA' })).rejects.toBeInstanceOf(
      MalformedDeviceKeyError,
    );
  });

  it('rejects a JWK missing a coordinate', async () => {
    const identity = await generateDeviceIdentity();
    const { kty, crv, x } = await publicJwkOf(identity.publicKey);
    await expect(importDevicePublicKey({ kty, crv, x })).rejects.toBeInstanceOf(
      MalformedDeviceKeyError,
    );
  });

  it('rejects a structurally valid JWK whose coordinates are not on the curve', async () => {
    const identity = await generateDeviceIdentity();
    const jwk = await publicJwkOf(identity.publicKey);
    await expect(
      importDevicePublicKey({ ...jwk, x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }),
    ).rejects.toBeInstanceOf(MalformedDeviceKeyError);
  });
});
