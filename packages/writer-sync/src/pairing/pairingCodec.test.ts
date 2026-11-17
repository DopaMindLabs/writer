import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../crypto/canonicalJson';
import { toBase64Url } from '../crypto/base64url';
import { PairingError, PairingErrorCode, type PairingOffer } from './pairing.types';
import {
  MAX_PAYLOAD_BYTES,
  decodePairingPayload,
  encodePairingPayload,
  pairingPayloadBytes,
} from './pairingCodec';

const SDP = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=application 51427 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 192.168.1.23',
  'a=candidate:2999745851 1 udp 2122260223 192.168.1.23 51427 typ host generation 0',
  'a=ice-ufrag:F7gI',
  'a=fingerprint:sha-256 7B:8B:F0:65:5F:78:E2:51:3B:AC:6F:F3:3F:46:1B:35',
  'a=setup:actpass',
  '',
].join('\r\n');

const offer = (overrides: Partial<PairingOffer> = {}): PairingOffer => ({
  v: 1,
  kind: 'offer',
  sessionId: 'ICEiIyQlJicoKSorLC0uLw',
  deviceId: 'AAECAwQFBgcICQoLDA0ODw',
  identityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
  ephemeralJwk: { kty: 'EC', crv: 'P-256', x: 'eA', y: 'eQ' },
  sdp: SDP,
  nonce: 'EBESExQVFhcYGRobHB0eHw',
  expiresAt: 1_700_000_120_000,
  signature: 'c2ln',
  ...overrides,
});

const codeOf = async (run: () => Promise<unknown>): Promise<PairingErrorCode> => {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(PairingError);
    return (error as PairingError).code;
  }
  throw new Error('expected a PairingError');
};

describe('encodePairingPayload', () => {
  it('round-trips an offer', async () => {
    const original = offer();
    expect(await decodePairingPayload(await encodePairingPayload(original))).toEqual(original);
  });

  it('round-trips an answer, offerHash included', async () => {
    const answer = { ...offer(), kind: 'answer' as const, offerHash: 'UFFSU1RVVldYWVpbXF1eXw' };
    expect(await decodePairingPayload(await encodePairingPayload(answer))).toEqual(answer);
  });

  it('produces base64url text with no padding', async () => {
    expect(await encodePairingPayload(offer())).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('compresses — the encoded text is shorter than the canonical bytes', async () => {
    // This is what keeps a realistic offer inside one QR symbol.
    const encoded = await encodePairingPayload(offer());
    expect(encoded.length).toBeLessThan(pairingPayloadBytes(offer()).length);
  });

  it('is deterministic for one payload', async () => {
    expect(await encodePairingPayload(offer())).toBe(await encodePairingPayload(offer()));
  });

  it('rejects an oversized session description', async () => {
    const huge = offer({ sdp: 'a='.repeat(4000) });
    expect(await codeOf(() => encodePairingPayload(huge))).toBe(
      PairingErrorCode.OversizedPayload,
    );
  });
});

describe('decodePairingPayload', () => {
  const encodeRaw = async (value: unknown): Promise<string> => {
    const bytes = new TextEncoder().encode(canonicalJson(value));
    const stream = new CompressionStream('deflate-raw');
    const collected = new Response(stream.readable).arrayBuffer();
    const writer = stream.writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    return toBase64Url(new Uint8Array(await collected));
  };

  it('rejects text outside the base64url alphabet', async () => {
    expect(await codeOf(() => decodePairingPayload('not base64!'))).toBe(
      PairingErrorCode.MalformedPayload,
    );
  });

  it('rejects bytes that are not DEFLATE data', async () => {
    expect(await codeOf(() => decodePairingPayload(toBase64Url(new Uint8Array([1, 2, 3]))))).toBe(
      PairingErrorCode.MalformedPayload,
    );
  });

  it('rejects an unsupported protocol version', async () => {
    expect(await codeOf(async () => decodePairingPayload(await encodeRaw({ ...offer(), v: 2 })))).toBe(
      PairingErrorCode.UnsupportedVersion,
    );
  });

  it('rejects a payload carrying an unknown field', async () => {
    // An unknown field would ride into the signed bytes unnoticed otherwise.
    const code = await codeOf(async () =>
      decodePairingPayload(await encodeRaw({ ...offer(), injected: 'x' })),
    );
    expect(code).toBe(PairingErrorCode.MalformedPayload);
  });

  it('rejects an answer with no offerHash', async () => {
    const { sdp, ...rest } = offer();
    const code = await codeOf(async () =>
      decodePairingPayload(await encodeRaw({ ...rest, sdp, kind: 'answer' })),
    );
    expect(code).toBe(PairingErrorCode.MalformedPayload);
  });

  const malformed: readonly (readonly [string, Record<string, unknown>])[] = [
    ['an empty session id', { sessionId: '' }],
    ['a missing device id', { deviceId: '' }],
    ['a non-object identity key', { identityJwk: 'nope' }],
    // A non-integer or negative expiry cannot even be canonically encoded
    // (canonicalJson rejects both), so the wrong *type* is what this defends.
    ['an expiry that is not a number', { expiresAt: '1700000120000' }],
    ['an unknown kind', { kind: 'sideways' }],
  ];

  for (const [reason, mutation] of malformed) {
    it(`rejects ${reason}`, async () => {
      const value = { ...offer(), ...mutation };
      const code = await codeOf(async () => decodePairingPayload(await encodeRaw(value)));
      expect([PairingErrorCode.MalformedPayload, PairingErrorCode.NonCanonical]).toContain(code);
    });
  }

  it('rejects a decompression bomb rather than buffering it', async () => {
    const bomb = await encodeRaw({ pad: 'a'.repeat(MAX_PAYLOAD_BYTES * 4) });
    expect(await codeOf(() => decodePairingPayload(bomb))).toBe(
      PairingErrorCode.OversizedPayload,
    );
  });

  it('rejects non-canonical bytes even though they parse', async () => {
    const bytes = new TextEncoder().encode('{"b":2,"a":1}');
    const stream = new CompressionStream('deflate-raw');
    const collected = new Response(stream.readable).arrayBuffer();
    const writer = stream.writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    const text = toBase64Url(new Uint8Array(await collected));
    expect(await codeOf(() => decodePairingPayload(text))).toBe(PairingErrorCode.NonCanonical);
  });
});
