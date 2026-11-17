import { describe, it, expect } from 'vitest';
import {
  generateRootSecret,
  deriveKeyRing,
  calibrateIterations,
  wrapRootSecret,
  unwrapRootSecret,
  fingerprintsEqual,
  canonicalisePassphrase,
  WrongPassphraseError,
  ESCROW_ID,
} from './keys';

// Correctness is independent of the iteration count; use a small one so the
// PBKDF2 in these tests stays fast.
const FAST = 1000;

describe('cloud keys', () => {
  it('keeps the escrow id in Dexie Cloud private-singleton form', async () => {
    // The literal `#` prefix is the contract with Dexie Cloud: without it the
    // escrow row is one GLOBAL object shared by every account in the database —
    // the first account claims it and every other account's escrow silently
    // never syncs, so a second device can never be joined with the passphrase.
    // Regression guard: assert the literal, not the constant against itself.
    expect(ESCROW_ID).toBe('#v1');
    const escrow = await wrapRootSecret(generateRootSecret(), 'pw', FAST);
    expect(escrow.id).toBe('#v1');
  });

  it('wrap then unwrap round-trips the root secret', async () => {
    const master = generateRootSecret();
    expect(master).toHaveLength(32);
    const escrow = await wrapRootSecret(master, 'correct horse battery', FAST);
    const recovered = await unwrapRootSecret(escrow, 'correct horse battery');
    expect(Array.from(recovered)).toEqual(Array.from(master));
  });

  it('unwraps across Unicode normal forms of the same passphrase', async () => {
    // "café" composed (NFC, as a desktop keyboard emits it) versus decomposed
    // (NFD, as an iOS keyboard emits it): same visible passphrase, different
    // byte sequences. Canonicalisation must make them derive the same KEK.
    const master = generateRootSecret();
    const escrow = await wrapRootSecret(master, 'caf\u00e9', FAST);
    const recovered = await unwrapRootSecret(escrow, 'cafe\u0301');
    expect(Array.from(recovered)).toEqual(Array.from(master));
  });

  it('throws WrongPassphraseError on a bad passphrase (GCM auth failure)', async () => {
    const escrow = await wrapRootSecret(generateRootSecret(), 'right', FAST);
    await expect(unwrapRootSecret(escrow, 'wrong')).rejects.toBeInstanceOf(
      WrongPassphraseError,
    );
  });

  it('calibrated iterations never fall below the 800000 floor', async () => {
    expect(await calibrateIterations()).toBeGreaterThanOrEqual(800_000);
  });

  it('derives a non-extractable AES-GCM-256 content key', async () => {
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    expect(ring.epoch).toBe(1);
    expect(ring.contentKey.extractable).toBe(false);
    expect(ring.contentKey.algorithm.name).toBe('AES-GCM');
    expect((ring.contentKey.algorithm as AesKeyAlgorithm).length).toBe(256);
  });

  it('produces a fresh salt and iv for each escrow of the same secret', async () => {
    const master = generateRootSecret();
    const a = await wrapRootSecret(master, 'pw', FAST);
    const b = await wrapRootSecret(master, 'pw', FAST);
    expect(Array.from(a.salt)).not.toEqual(Array.from(b.salt));
    expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
    expect(Array.from(a.wrapped)).not.toEqual(Array.from(b.wrapped));
  });
});

describe('canonicalisePassphrase', () => {
  it('is the identity on ASCII', () => {
    expect(canonicalisePassphrase('longenoughphrase')).toBe('longenoughphrase');
  });

  it('collapses NFC and NFD forms of the same text to one value', () => {
    // é composed (U+00E9) versus decomposed (e + U+0301): equal after NFKC, so a
    // dialog validating the canonical value cannot reject them as a mismatch.
    expect(canonicalisePassphrase('café')).toBe(canonicalisePassphrase('café'));
  });

  it('folds compatibility characters (full-width to ASCII)', () => {
    // Full-width digits/letters normalise to ASCII under NFKC.
    expect(canonicalisePassphrase('ＡＢＣ')).toBe('ABC');
  });

  it('does not trim, lowercase, or alter whitespace', () => {
    expect(canonicalisePassphrase('  Pass Phrase  ')).toBe('  Pass Phrase  ');
  });
});

describe('cloud key fingerprints', () => {
  it('derives a fixed-length fingerprint deterministically from the master', async () => {
    const master = generateRootSecret();
    const a = await deriveKeyRing(master, 1);
    const b = await deriveKeyRing(master, 1);
    expect(a.fingerprint).toHaveLength(16);
    expect(Array.from(a.fingerprint)).toEqual(Array.from(b.fingerprint));
  });

  it('gives different masters different fingerprints', async () => {
    const a = await deriveKeyRing(generateRootSecret(), 1);
    const b = await deriveKeyRing(generateRootSecret(), 1);
    expect(Array.from(a.fingerprint)).not.toEqual(Array.from(b.fingerprint));
  });

  it('is one-way: the fingerprint is not the root secret', async () => {
    const master = generateRootSecret();
    const { fingerprint } = await deriveKeyRing(master, 1);
    expect(Array.from(fingerprint)).not.toEqual(Array.from(master));
  });

  it('stamps the escrow with the same fingerprint the ring carries', async () => {
    const master = generateRootSecret();
    const ring = await deriveKeyRing(master, 1);
    const escrow = await wrapRootSecret(master, 'pw', FAST);
    expect(Array.from(escrow.fingerprint)).toEqual(Array.from(ring.fingerprint));
    // Round-trip: an escrow unwrapped elsewhere re-derives the same fingerprint.
    const recovered = await unwrapRootSecret(escrow, 'pw');
    const recoveredRing = await deriveKeyRing(recovered, 1);
    expect(fingerprintsEqual(escrow.fingerprint, recoveredRing.fingerprint)).toBe(
      true,
    );
  });

  it('fingerprintsEqual compares by value', () => {
    expect(fingerprintsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(fingerprintsEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(fingerprintsEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
