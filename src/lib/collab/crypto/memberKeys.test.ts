import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateMemberKeys,
  memberPublicOf,
  signBytes,
  verifyBytes,
  deriveAgreementBits,
} from './memberKeys';

const bytes = (n: number): Uint8Array => new Uint8Array([n, n + 1, n + 2]);

describe('memberKeys', () => {
  afterEach(() => vi.restoreAllMocks());

  it('generates keys whose signature verifies through the public half', async () => {
    const keys = await generateMemberKeys('a');
    const data = bytes(1);
    const sig = new Uint8Array(await signBytes(keys, data));
    const pub = await memberPublicOf(keys, 'Alice');
    expect(await verifyBytes(pub, sig, data)).toBe(true);
    expect(await verifyBytes(pub, sig, bytes(9))).toBe(false); // tampered data
  });

  it('rejects a signature checked against a different member’s key', async () => {
    const a = await generateMemberKeys('a');
    const b = await generateMemberKeys('b');
    const data = bytes(2);
    const sig = new Uint8Array(await signBytes(a, data));
    expect(await verifyBytes(await memberPublicOf(b, 'B'), sig, data)).toBe(false);
    expect(await verifyBytes(await memberPublicOf(a, 'A'), sig, data)).toBe(true);
  });

  it('keeps private keys non-extractable', async () => {
    const keys = await generateMemberKeys('a');
    expect(keys.signPriv.extractable).toBe(false);
    expect(keys.agreePriv.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('pkcs8', keys.signPriv)).rejects.toThrow();
  });

  it('exposes an extractable public half for the roster', async () => {
    const keys = await generateMemberKeys('a');
    const pub = await memberPublicOf(keys, 'Alice');
    expect(pub.signPubRaw.byteLength).toBeGreaterThan(0);
    expect(pub.agreePubRaw.byteLength).toBeGreaterThan(0);
    expect(pub.authorId).toBe('a');
    expect(pub.displayName).toBe('Alice');
  });

  it('derives the same agreement secret from both sides', async () => {
    const a = await generateMemberKeys('a');
    const b = await generateMemberKeys('b');
    const pubA = await memberPublicOf(a, 'A');
    const pubB = await memberPublicOf(b, 'B');
    const secretAB = await deriveAgreementBits(a, pubB.agreePubRaw);
    const secretBA = await deriveAgreementBits(b, pubA.agreePubRaw);
    expect([...secretAB]).toEqual([...secretBA]);
  });

  it('rejects an empty authorId', async () => {
    await expect(generateMemberKeys('')).rejects.toThrow();
  });

  it('falls back to ECDSA/ECDH when Ed25519/X25519 are unavailable', async () => {
    vi.resetModules();
    const subtle = crypto.subtle;
    const real = subtle.generateKey.bind(subtle);
    const mock = ((
      algorithm: AlgorithmIdentifier,
      extractable: boolean,
      keyUsages: readonly KeyUsage[],
    ) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (name === 'Ed25519' || name === 'X25519') {
        return Promise.reject(new Error('unsupported'));
      }
      return real(
        algorithm as Parameters<typeof real>[0],
        extractable,
        keyUsages as KeyUsage[],
      );
    }) as unknown as SubtleCrypto['generateKey'];
    Object.defineProperty(subtle, 'generateKey', { configurable: true, value: mock });
    try {
      const fresh = await import('./memberKeys');
      const keys = await fresh.generateMemberKeys('probe');
      expect(keys.signAlg).toBe('ECDSA-P256');
      expect(keys.agreeAlg).toBe('ECDH-P256');
      const data = bytes(7);
      const sig = new Uint8Array(await fresh.signBytes(keys, data));
      const pub = await fresh.memberPublicOf(keys, 'P');
      expect(await fresh.verifyBytes(pub, sig, data)).toBe(true);
    } finally {
      Reflect.deleteProperty(subtle, 'generateKey');
    }
  });
});
