/**
 * Cloud-sync key management. The master secret is 32 bytes of CSPRNG output; a
 * non-extractable AES-256-GCM content key is derived from it via HKDF, and the
 * master itself is wrapped for escrow under a PBKDF2 key-encryption key derived
 * from the user's passphrase. Raw key bytes never leave this module except as
 * the ciphertext fields of an {@link EscrowRecord}.
 */

const CONTENT_INFO = 'lipsum-content-v1';
/** HKDF info for the public, one-way key-verification tag (the fingerprint). */
const KEYCHECK_INFO = 'lipsum-keycheck-v1';

/**
 * The escrow row's primary key. The leading `#` is load-bearing: Dexie Cloud
 * treats a bare string key as **one global object across every account** in the
 * database — the first account to publish would claim it, every other account's
 * escrow would be silently rejected server-side (never an error the client
 * sees), and that account's other devices would never receive an escrow at all,
 * so the same passphrase could not join them. A `#`-prefixed key is the addon's
 * *private singleton* form: it is rewritten per user on the wire
 * (`#v1:<userId>`), giving each account its own escrow row in its private
 * realm, synced to all of that account's devices and nobody else's.
 */
export const ESCROW_ID = '#v1';
const FINGERPRINT_BYTES = 16;
const PBKDF2_HASH = 'SHA-512';
/** Never derive a KEK with fewer iterations than this, however fast the device. */
const ITERATIONS_FLOOR = 800_000;

export interface EscrowRecord {
  id: typeof ESCROW_ID;
  epoch: number;
  kdf: 'PBKDF2';
  hash: 'SHA-512';
  iterations: number;
  salt: Uint8Array;
  iv: Uint8Array;
  wrapped: Uint8Array;
  /** Public one-way tag of the master; lets a device tell whether the escrow it
   *  pulled is protecting the same key it already holds — without decrypting. */
  fingerprint: Uint8Array;
}

/** A derived, non-extractable AES-GCM content key plus its rotation epoch. */
export interface CloudKeyRing {
  epoch: number;
  contentKey: CryptoKey;
  /** Public one-way tag of the master this ring was derived from (see
   *  {@link EscrowRecord.fingerprint}); safe to store and compare in the clear. */
  fingerprint: Uint8Array;
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('Incorrect passphrase');
    this.name = 'WrongPassphraseError';
  }
}

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

/** WebCrypto wants an ArrayBuffer-backed BufferSource; TS 6's generic Uint8Array
 *  is not assignable, so copy the exact view into a standalone ArrayBuffer. */
const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** 32 bytes of cryptographically-random master secret. */
export const generateMasterSecret = (): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(32));

/**
 * A public, one-way tag of the master via HKDF (a separate `info` from the
 * content key, so it reveals nothing about that key). Two devices derive the
 * same fingerprint iff they hold the same master; it never travels backwards to
 * the secret, so it is safe to store in the escrow and compare in the clear.
 */
export const deriveKeyFingerprint = async (
  master: Uint8Array,
): Promise<Uint8Array> => {
  const base = await crypto.subtle.importKey('raw', asBuffer(master), 'HKDF', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new ArrayBuffer(0),
      info: asBuffer(utf8(KEYCHECK_INFO)),
    },
    base,
    FINGERPRINT_BYTES * 8,
  );
  return new Uint8Array(bits);
};

/** Whether two fingerprints are byte-for-byte equal. */
export const fingerprintsEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

/** HKDF-SHA-256 a non-extractable AES-256-GCM content key from the master. */
export const deriveKeyRing = async (
  master: Uint8Array,
  epoch: number,
): Promise<CloudKeyRing> => {
  const base = await crypto.subtle.importKey('raw', asBuffer(master), 'HKDF', false, [
    'deriveKey',
  ]);
  const contentKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new ArrayBuffer(0),
      info: asBuffer(utf8(CONTENT_INFO)),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const fingerprint = await deriveKeyFingerprint(master);
  return { epoch, contentKey, fingerprint };
};

/** Time PBKDF2 on this device; return the iteration count for ~1s, floored. */
export const calibrateIterations = async (): Promise<number> => {
  const base = await crypto.subtle.importKey(
    'raw',
    asBuffer(utf8('calibration')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const BATCH = 50_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const start = performance.now();
  await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: PBKDF2_HASH, salt: asBuffer(salt), iterations: BATCH },
    base,
    256,
  );
  const perIteration = (performance.now() - start) / BATCH;
  const forOneSecond = perIteration > 0 ? Math.round(1000 / perIteration) : ITERATIONS_FLOOR;
  return Math.max(forOneSecond, ITERATIONS_FLOOR);
};

/**
 * Canonicalise a passphrase before key derivation. Platforms emit different
 * Unicode byte sequences for the same visible text (iOS keyboards favour
 * decomposed accents, desktop keyboards composed), so without a fixed normal
 * form the same passphrase typed on two devices derives two different KEKs and
 * the correct passphrase reads as wrong. NFKC is the identity on ASCII.
 *
 * Exported so the setup UI can validate and compare the *same* value the crypto
 * derives from — otherwise the dialog can reject two visually identical
 * passphrases that would unwrap the same escrow. NFKC is the only
 * transformation: it must not trim, lowercase, or otherwise alter whitespace.
 */
export const canonicalisePassphrase = (passphrase: string): string =>
  passphrase.normalize('NFKC');

const deriveKek = async (
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> => {
  const base = await crypto.subtle.importKey(
    'raw',
    asBuffer(utf8(canonicalisePassphrase(passphrase))),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: PBKDF2_HASH, salt: asBuffer(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

/** AES-GCM-wrap the master secret under a passphrase-derived KEK for escrow. */
export const wrapMasterSecret = async (
  master: Uint8Array,
  passphrase: string,
  iterations: number,
): Promise<EscrowRecord> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveKek(passphrase, salt, iterations);
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asBuffer(iv) }, kek, asBuffer(master)),
  );
  const fingerprint = await deriveKeyFingerprint(master);
  return {
    id: ESCROW_ID,
    epoch: 1,
    kdf: 'PBKDF2',
    hash: PBKDF2_HASH,
    iterations,
    salt,
    iv,
    wrapped,
    fingerprint,
  };
};

/** Unwrap the escrowed master; throws {@link WrongPassphraseError} on auth failure. */
export const unwrapMasterSecret = async (
  escrow: EscrowRecord,
  passphrase: string,
): Promise<Uint8Array> => {
  const kek = await deriveKek(passphrase, escrow.salt, escrow.iterations);
  try {
    const master = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBuffer(escrow.iv) },
      kek,
      asBuffer(escrow.wrapped),
    );
    return new Uint8Array(master);
  } catch {
    throw new WrongPassphraseError();
  }
};
