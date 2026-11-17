import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonicalJson';
import { generateDeviceIdentity } from './deviceIdentity';
import {
  MissingSignatureError,
  signPairingPayload,
  verifyPairingPayload,
} from './deviceSignature';
import { toBase64Url } from './base64url';

const payloadOf = () => ({
  v: 1,
  kind: 'offer',
  sessionId: 'ICEiIyQlJicoKSorLC0uLw',
  deviceId: 'AAECAwQFBgcICQoLDA0ODw',
  expiresAt: 1700000120000,
  nonce: 'EBESExQVFhcYGRobHB0eHw',
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n',
});

const signed = async () => {
  const identity = await generateDeviceIdentity();
  const payload = payloadOf();
  const signature = await signPairingPayload(identity.privateKey, payload);
  return { identity, payload: { ...payload, signature } };
};

describe('signPairingPayload', () => {
  it('produces a signature the matching public key verifies', async () => {
    const { identity, payload } = await signed();
    expect(await verifyPairingPayload(identity.publicKey, payload)).toBe(true);
  });

  it('ignores any signature already on the payload when signing', async () => {
    const identity = await generateDeviceIdentity();
    const payload = payloadOf();
    const first = await signPairingPayload(identity.privateKey, payload);
    const second = await signPairingPayload(identity.privateKey, {
      ...payload,
      signature: 'not-a-signature',
    });
    // ECDSA is randomised, so the two differ — but both must verify, which
    // proves the stale field was excluded from the signing input.
    expect(await verifyPairingPayload(identity.publicKey, { ...payload, signature: first })).toBe(true);
    expect(await verifyPairingPayload(identity.publicKey, { ...payload, signature: second })).toBe(true);
  });

  it('is randomised — two signatures over one payload differ', async () => {
    const identity = await generateDeviceIdentity();
    const payload = payloadOf();
    const a = await signPairingPayload(identity.privateKey, payload);
    const b = await signPairingPayload(identity.privateKey, payload);
    expect(a).not.toBe(b);
  });
});

describe('verifyPairingPayload', () => {
  it('rejects a signature made by another device', async () => {
    const { payload } = await signed();
    const other = await generateDeviceIdentity();
    expect(await verifyPairingPayload(other.publicKey, payload)).toBe(false);
  });

  it('rejects a payload whose signature bytes were altered', async () => {
    const { identity, payload } = await signed();
    const tampered = { ...payload, signature: toBase64Url(new Uint8Array(64)) };
    expect(await verifyPairingPayload(identity.publicKey, tampered)).toBe(false);
  });

  it('rejects a signature that is not valid base64url', async () => {
    const { identity, payload } = await signed();
    expect(await verifyPairingPayload(identity.publicKey, { ...payload, signature: '!!!' })).toBe(
      false,
    );
  });

  const mutations: readonly (readonly [string, Record<string, unknown>])[] = [
    ['the session id', { sessionId: 'AAAAAAAAAAAAAAAAAAAAAA' }],
    ['the device id', { deviceId: 'AAAAAAAAAAAAAAAAAAAAAA' }],
    ['the expiry', { expiresAt: 1700000999000 }],
    ['the nonce', { nonce: 'AAAAAAAAAAAAAAAAAAAAAA' }],
    ['the session description', { sdp: 'v=0\r\no=- 9 9 IN IP4 10.0.0.1\r\n' }],
    ['the payload kind', { kind: 'answer' }],
    ['the protocol version', { v: 2 }],
  ];

  for (const [field, mutation] of mutations) {
    it(`rejects the payload when ${field} is changed`, async () => {
      const { identity, payload } = await signed();
      expect(await verifyPairingPayload(identity.publicKey, { ...payload, ...mutation })).toBe(
        false,
      );
    });
  }

  it('rejects a payload with an added field', async () => {
    const { identity, payload } = await signed();
    expect(
      await verifyPairingPayload(identity.publicKey, { ...payload, injected: 'x' }),
    ).toBe(false);
  });

  it('rejects a payload with a removed field', async () => {
    const { identity, payload } = await signed();
    const withoutNonce = Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== 'nonce'),
    );
    expect(await verifyPairingPayload(identity.publicKey, withoutNonce)).toBe(false);
  });

  it('throws rather than returning false when no signature is present', async () => {
    const identity = await generateDeviceIdentity();
    await expect(verifyPairingPayload(identity.publicKey, payloadOf())).rejects.toBeInstanceOf(
      MissingSignatureError,
    );
  });

  it('rejects a signature made over the canonical bytes without the domain label', async () => {
    // Domain separation: a signature over the same payload in another context
    // must not verify here, or a pairing signature could be replayed as one.
    const identity = await generateDeviceIdentity();
    const payload = payloadOf();
    const undomained = new TextEncoder().encode(canonicalJson(payload));
    const raw = new Uint8Array(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        identity.privateKey,
        undomained.buffer.slice(0, undomained.byteLength) as ArrayBuffer,
      ),
    );
    expect(
      await verifyPairingPayload(identity.publicKey, { ...payload, signature: toBase64Url(raw) }),
    ).toBe(false);
  });
});
