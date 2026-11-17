/**
 * Ephemeral key agreement for one pairing session, specified in
 * `docs/pairing-protocol.md` §10.
 *
 * Each device generates a fresh ECDH pair per session and never reuses or
 * persists it. The shared secret is *not* used as a key directly: it goes
 * through HKDF with the pairing transcript as the salt, which is what makes the
 * resulting key transcript-bound. Two devices that saw different payloads derive
 * different keys and cannot talk at all — the failure is structural rather than
 * something a user has to spot.
 */

const EPHEMERAL_ALGORITHM = { name: 'ECDH', namedCurve: 'P-256' } as const;
const PAIRING_KEY_LABEL = 'lipsum-pair-key-v1';
const PAIRING_KEY_BITS = 256;

/** Thrown when a peer's ephemeral public key is malformed or off-curve. */
export class MalformedEphemeralKeyError extends Error {
  constructor(reason: string) {
    super(`Ephemeral pairing key is malformed: ${reason}`);
    this.name = 'MalformedEphemeralKeyError';
  }
}

export interface PairingEphemeralKeys {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

export interface PairingKeyOptions {
  /** This device's ephemeral private half. */
  privateKey: CryptoKey;
  /** The peer's ephemeral public half, as carried in its payload. */
  peerPublicJwk: JsonWebKey;
  /** The pairing transcript both devices computed independently. */
  transcript: Uint8Array;
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** Generate the fresh ephemeral pair for one pairing session. */
export const generatePairingEphemeral = async (): Promise<PairingEphemeralKeys> => {
  const pair = await crypto.subtle.generateKey(EPHEMERAL_ALGORITHM, false, ['deriveBits']);
  return { privateKey: pair.privateKey, publicKey: pair.publicKey };
};

/** Export the ephemeral public half for the pairing payload. */
export const ephemeralPublicJwkOf = (publicKey: CryptoKey): Promise<JsonWebKey> =>
  crypto.subtle.exportKey('jwk', publicKey);

const importPeerKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
  if (jwk.kty !== 'EC') throw new MalformedEphemeralKeyError('kty must be EC');
  if (jwk.crv !== EPHEMERAL_ALGORITHM.namedCurve) {
    throw new MalformedEphemeralKeyError(`crv must be ${EPHEMERAL_ALGORITHM.namedCurve}`);
  }
  if (typeof jwk.x !== 'string' || typeof jwk.y !== 'string') {
    throw new MalformedEphemeralKeyError('x and y are required');
  }
  if (jwk.d !== undefined) {
    throw new MalformedEphemeralKeyError('a private component must not be present');
  }
  try {
    return await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
      EPHEMERAL_ALGORITHM,
      false,
      [],
    );
  } catch {
    throw new MalformedEphemeralKeyError('the coordinates are not a valid public point');
  }
};

/**
 * Derive the session's AES-256-GCM transfer key.
 *
 * The HKDF step is deliberate. Handing an ECDH result straight to `deriveKey`
 * yields a working key with no domain separation and, more importantly, no
 * binding to what the two devices actually exchanged. Salting with the
 * transcript ties the key to the exact offer and answer bytes, so a substituted
 * payload cannot produce an agreeing key.
 */
export const derivePairingKey = async (options: PairingKeyOptions): Promise<CryptoKey> => {
  const peerKey = await importPeerKey(options.peerPublicJwk);
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: peerKey },
    options.privateKey,
    PAIRING_KEY_BITS,
  );
  const base = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: asBuffer(options.transcript),
      info: asBuffer(new TextEncoder().encode(PAIRING_KEY_LABEL)),
    },
    base,
    { name: 'AES-GCM', length: PAIRING_KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
};
