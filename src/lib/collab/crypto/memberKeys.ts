/**
 * Per-member identity keys for a collaboration room. Each participant holds two
 * keypairs: a **signing** pair (attribution and write authority — every document
 * update is signed with it) and a **key-agreement** pair (to receive the room's
 * content key wrapped to them, Task 4). The private halves are non-extractable
 * `CryptoKey`s that never leave the device in any form; only the raw *public*
 * halves travel, inside the roster.
 *
 * Ed25519 / X25519 are preferred and feature-detected; where a runtime lacks
 * them the code falls back to the universally-supported ECDSA-P256 / ECDH-P256.
 * The chosen algorithm is recorded on the member so every verifier agrees on how
 * to check a signature or derive a shared secret. WebCrypto always makes a
 * generated *public* key extractable and honours `extractable: false` for the
 * *private* key, so a single `generateKey(..., false, ...)` yields exactly the
 * asymmetry we need: exportable public, sealed private.
 */
import { invariant } from '@/lib/invariant';

export type SignAlg = 'Ed25519' | 'ECDSA-P256';
export type AgreeAlg = 'X25519' | 'ECDH-P256';

/** This device's full keys for one room; private halves are non-extractable. */
export interface MemberKeys {
  authorId: string;
  signAlg: SignAlg;
  signPriv: CryptoKey;
  signPub: CryptoKey;
  agreeAlg: AgreeAlg;
  agreePriv: CryptoKey;
  agreePub: CryptoKey;
}

/** The roster-portable public half of a member's identity. */
export interface MemberPublic {
  authorId: string;
  displayName: string;
  signAlg: SignAlg;
  signPubRaw: Uint8Array;
  agreeAlg: AgreeAlg;
  agreePubRaw: Uint8Array;
}

/** WebCrypto wants an ArrayBuffer-backed BufferSource; copy the exact view. */
const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const signKeyParams = (alg: SignAlg): EcKeyGenParams | Algorithm =>
  alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' };

const signOpParams = (alg: SignAlg): EcdsaParams | Algorithm =>
  alg === 'Ed25519' ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' };

const agreeKeyParams = (alg: AgreeAlg): EcKeyGenParams | Algorithm =>
  alg === 'X25519' ? { name: 'X25519' } : { name: 'ECDH', namedCurve: 'P-256' };

const agreeDeriveParams = (alg: AgreeAlg, pub: CryptoKey): EcdhKeyDeriveParams =>
  alg === 'X25519' ? { name: 'X25519', public: pub } : { name: 'ECDH', public: pub };

const supports = async (params: Algorithm | EcKeyGenParams, usages: KeyUsage[]): Promise<boolean> => {
  try {
    await crypto.subtle.generateKey(params, false, usages);
    return true;
  } catch {
    return false;
  }
};

let signAlgP: Promise<SignAlg> | null = null;
const detectSignAlg = (): Promise<SignAlg> =>
  (signAlgP ??= supports({ name: 'Ed25519' }, ['sign', 'verify']).then((ok) =>
    ok ? 'Ed25519' : 'ECDSA-P256',
  ));

let agreeAlgP: Promise<AgreeAlg> | null = null;
const detectAgreeAlg = (): Promise<AgreeAlg> =>
  (agreeAlgP ??= supports({ name: 'X25519' }, ['deriveBits']).then((ok) =>
    ok ? 'X25519' : 'ECDH-P256',
  ));

const importVerifyKey = (pub: MemberPublic): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', asBuffer(pub.signPubRaw), signKeyParams(pub.signAlg), true, [
    'verify',
  ]);

/** Generate this device's signing and agreement keypairs for a room. */
export const generateMemberKeys = async (authorId: string): Promise<MemberKeys> => {
  invariant(authorId, 'generateMemberKeys: authorId is required');
  const signAlg = await detectSignAlg();
  const agreeAlg = await detectAgreeAlg();
  const sign = (await crypto.subtle.generateKey(signKeyParams(signAlg), false, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const agree = (await crypto.subtle.generateKey(agreeKeyParams(agreeAlg), false, [
    'deriveBits',
  ])) as CryptoKeyPair;
  return {
    authorId,
    signAlg,
    signPriv: sign.privateKey,
    signPub: sign.publicKey,
    agreeAlg,
    agreePriv: agree.privateKey,
    agreePub: agree.publicKey,
  };
};

/** Extract the roster-portable public half, tagged with a display name. */
export const memberPublicOf = async (
  keys: MemberKeys,
  displayName: string,
): Promise<MemberPublic> => ({
  authorId: keys.authorId,
  displayName,
  signAlg: keys.signAlg,
  signPubRaw: new Uint8Array(await crypto.subtle.exportKey('raw', keys.signPub)),
  agreeAlg: keys.agreeAlg,
  agreePubRaw: new Uint8Array(await crypto.subtle.exportKey('raw', keys.agreePub)),
});

/** Sign bytes with this device's signing key. */
export const signBytes = (keys: MemberKeys, data: Uint8Array): Promise<ArrayBuffer> =>
  crypto.subtle.sign(signOpParams(keys.signAlg), keys.signPriv, asBuffer(data));

/** Verify a signature against a member's public signing key from the roster. */
export const verifyBytes = async (
  pub: MemberPublic,
  sig: Uint8Array,
  data: Uint8Array,
): Promise<boolean> => {
  const key = await importVerifyKey(pub);
  return crypto.subtle.verify(signOpParams(pub.signAlg), key, asBuffer(sig), asBuffer(data));
};

/**
 * Derive shared secret bits with another member's public agreement key. The
 * basis of content-key wrapping (Task 4); both sides derive the same bytes.
 */
export const deriveAgreementBits = async (
  self: MemberKeys,
  otherAgreePubRaw: Uint8Array,
  lengthBits = 256,
): Promise<Uint8Array> => {
  const otherPub = await crypto.subtle.importKey(
    'raw',
    asBuffer(otherAgreePubRaw),
    agreeKeyParams(self.agreeAlg),
    true,
    [],
  );
  const bits = await crypto.subtle.deriveBits(
    agreeDeriveParams(self.agreeAlg, otherPub),
    self.agreePriv,
    lengthBits,
  );
  return new Uint8Array(bits);
};
