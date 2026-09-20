import { asDeviceId, type DeviceId } from '../core/ids';
import { toBase64Url } from './base64url';

/**
 * A device's persistent signing identity, specified in
 * `docs/pairing-protocol.md` §9.
 *
 * The identity is what a pairing payload proves possession of, and what a
 * trusted-device record stores. The private half is generated non-extractable,
 * so injected script can use it while the page lives but can never carry it off
 * the device.
 *
 * The {@link DeviceId} is **derived from** the key rather than minted beside it.
 * A minted id is a claim; a derived one is a proof — a device cannot present
 * another's id without also presenting its key, and a registry row's id and
 * public key cannot drift apart.
 */

export const DEVICE_IDENTITY_ALGORITHM = {
  name: 'ECDSA',
  namedCurve: 'P-256',
} as const;

const DEVICE_ID_LABEL = 'lipsum-device-id-v1';
const DEVICE_ID_BYTES = 16;

/** Thrown when a public device key is malformed or not on the expected curve. */
export class MalformedDeviceKeyError extends Error {
  constructor(reason: string) {
    super(`Device public key is malformed: ${reason}`);
    this.name = 'MalformedDeviceKeyError';
  }
}

/** A device's signing key pair. The private half never leaves the device. */
export interface DeviceIdentityKeys {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** Generate a fresh, non-extractable device signing identity. */
export const generateDeviceIdentity = async (): Promise<DeviceIdentityKeys> => {
  const pair = await crypto.subtle.generateKey(DEVICE_IDENTITY_ALGORITHM, false, [
    'sign',
    'verify',
  ]);
  return { privateKey: pair.privateKey, publicKey: pair.publicKey };
};

/** Export the public half for a pairing payload or a registry row. */
export const publicJwkOf = (publicKey: CryptoKey): Promise<JsonWebKey> =>
  crypto.subtle.exportKey('jwk', publicKey);

/**
 * Import a peer's public key, validating it rather than repairing it. A JWK that
 * carries a private component, names another curve or omits a coordinate is
 * evidence of a bug or an attack — filtering the offending member and continuing
 * would hide both.
 */
export const importDevicePublicKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
  if (jwk.kty !== 'EC') throw new MalformedDeviceKeyError('kty must be EC');
  if (jwk.crv !== DEVICE_IDENTITY_ALGORITHM.namedCurve) {
    throw new MalformedDeviceKeyError(
      `crv must be ${DEVICE_IDENTITY_ALGORITHM.namedCurve}`,
    );
  }
  if (typeof jwk.x !== 'string' || typeof jwk.y !== 'string') {
    throw new MalformedDeviceKeyError('x and y are required');
  }
  if (jwk.d !== undefined) {
    throw new MalformedDeviceKeyError('a private component must not be present');
  }
  try {
    return await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
      DEVICE_IDENTITY_ALGORITHM,
      true,
      ['verify'],
    );
  } catch {
    throw new MalformedDeviceKeyError('the coordinates are not a valid public point');
  }
};

/**
 * Whether two public JWKs name the same identity key. Only `kty`, `crv`, `x`
 * and `y` are the identity — exactly the members {@link importDevicePublicKey}
 * reads. A JWK straight from `crypto.subtle.exportKey` also carries `ext` and
 * `key_ops`, which describe the exported handle rather than the key, so a
 * whole-object comparison would never match a stored record.
 */
export const sameIdentityKey = (a: JsonWebKey, b: JsonWebKey): boolean =>
  a.kty === b.kty &&
  a.crv === b.crv &&
  typeof a.x === 'string' &&
  a.x === b.x &&
  typeof a.y === 'string' &&
  a.y === b.y;

/**
 * The device id: the first 128 bits of a domain-separated SHA-256 over the key's
 * SPKI encoding, base64url. SPKI rather than JWK because it is a canonical byte
 * encoding — a JWK is JSON, and two encoders could order its members differently
 * and derive two ids for one key.
 */
export const deviceIdFor = async (publicKey: CryptoKey): Promise<DeviceId> => {
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', publicKey));
  const label = new TextEncoder().encode(DEVICE_ID_LABEL);
  const input = new Uint8Array(label.length + 1 + spki.length);
  input.set(label, 0);
  input[label.length] = 0;
  input.set(spki, label.length + 1);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', asBuffer(input)));
  return asDeviceId(toBase64Url(digest.subarray(0, DEVICE_ID_BYTES)));
};
