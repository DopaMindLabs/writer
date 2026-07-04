import { describe, it, expect } from 'vitest';
import {
  generateMasterSecret,
  deriveKeyRing,
  calibrateIterations,
  wrapMasterSecret,
  unwrapMasterSecret,
  WrongPassphraseError,
} from './keys';

// Correctness is independent of the iteration count; use a small one so the
// PBKDF2 in these tests stays fast.
const FAST = 1000;

describe('cloud keys', () => {
  it('wrap then unwrap round-trips the master secret', async () => {
    const master = generateMasterSecret();
    expect(master).toHaveLength(32);
    const escrow = await wrapMasterSecret(master, 'correct horse battery', FAST);
    const recovered = await unwrapMasterSecret(escrow, 'correct horse battery');
    expect(Array.from(recovered)).toEqual(Array.from(master));
  });

  it('throws WrongPassphraseError on a bad passphrase (GCM auth failure)', async () => {
    const escrow = await wrapMasterSecret(generateMasterSecret(), 'right', FAST);
    await expect(unwrapMasterSecret(escrow, 'wrong')).rejects.toBeInstanceOf(
      WrongPassphraseError,
    );
  });

  it('calibrated iterations never fall below the 800000 floor', async () => {
    expect(await calibrateIterations()).toBeGreaterThanOrEqual(800_000);
  });

  it('derives a non-extractable AES-GCM-256 content key', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    expect(ring.epoch).toBe(1);
    expect(ring.contentKey.extractable).toBe(false);
    expect(ring.contentKey.algorithm.name).toBe('AES-GCM');
    expect((ring.contentKey.algorithm as AesKeyAlgorithm).length).toBe(256);
  });

  it('produces a fresh salt and iv for each escrow of the same secret', async () => {
    const master = generateMasterSecret();
    const a = await wrapMasterSecret(master, 'pw', FAST);
    const b = await wrapMasterSecret(master, 'pw', FAST);
    expect(Array.from(a.salt)).not.toEqual(Array.from(b.salt));
    expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
    expect(Array.from(a.wrapped)).not.toEqual(Array.from(b.wrapped));
  });
});
