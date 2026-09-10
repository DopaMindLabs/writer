import { fromBase64Url, toBase64Url } from '../crypto/base64url';
import { canonicalJson, parseCanonicalJson } from '../crypto/canonicalJson';
import {
  PAIRING_PROTOCOL_VERSION,
  PairingError,
  PairingErrorCode,
  type PairingPayload,
} from './pairing.types';

/**
 * The wire codec for pairing payloads, specified in `docs/pairing-protocol.md`
 * §3, §4 and §6.
 *
 * Canonical JSON, then raw DEFLATE, then base64url. Compression is safe here
 * precisely because the payload holds nothing confidential (threat model §5.1),
 * and SDP compresses to roughly half its size — which is the difference between
 * one QR symbol and a multi-part sequence.
 *
 * Decoding treats every input as hostile: bounded output, strict structural
 * validation, and no field is repaired or ignored.
 */

export const MAX_PAYLOAD_BYTES = 8192;
export const MAX_SDP_BYTES = 6144;
export const MAX_JWK_BYTES = 512;

const COMPRESSION_FORMAT = 'deflate-raw';

/**
 * A view guaranteed to be backed by a plain `ArrayBuffer`. A `Uint8Array` may be
 * backed by a `SharedArrayBuffer`, which a stream writer will not accept — and
 * the streams want the *view*, not a detached buffer, so the repo's usual
 * `asBuffer` helper is the wrong shape here.
 */
const asWritable = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
};

/**
 * Start consuming the readable *before* writing. A transform stream applies
 * backpressure, so writing first and reading afterwards deadlocks as soon as the
 * payload exceeds the internal queue — which a real session description does.
 */
const deflate = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = new CompressionStream(COMPRESSION_FORMAT);
  const collected = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(asWritable(bytes));
  await writer.close();
  return new Uint8Array(await collected);
};

/**
 * Inflate with a hard output ceiling. A decompression bomb is rejected by
 * refusing to accumulate past the ceiling, never by trusting a declared size —
 * the declared size is the attacker's to choose.
 */
const inflate = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = new DecompressionStream(COMPRESSION_FORMAT);
  const reader = stream.readable.getReader();
  const writer = stream.writable.getWriter();
  // Not awaited: the read loop below is what drains the stream, and a bomb is
  // cancelled mid-flight, so these promises may never settle.
  void writer.write(asWritable(bytes)).catch(() => undefined);
  void writer.close().catch(() => undefined);

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read().catch(() => {
      throw new PairingError(PairingErrorCode.MalformedPayload, 'not valid DEFLATE data');
    });
    if (done) break;
    total += value.length;
    if (total > MAX_PAYLOAD_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new PairingError(PairingErrorCode.OversizedPayload, 'decompressed past the ceiling');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

const requireString = (raw: Record<string, unknown>, field: string): string => {
  const value = raw[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new PairingError(PairingErrorCode.MalformedPayload, `${field} must be a non-empty string`);
  }
  return value;
};

const requireJwk = (raw: Record<string, unknown>, field: string): JsonWebKey => {
  const value = raw[field];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new PairingError(PairingErrorCode.MalformedPayload, `${field} must be an object`);
  }
  if (canonicalJson(value).length > MAX_JWK_BYTES) {
    throw new PairingError(PairingErrorCode.OversizedPayload, `${field} exceeds its ceiling`);
  }
  return value;
};

const requireKind = (raw: Record<string, unknown>): 'offer' | 'answer' => {
  const value = raw.kind;
  if (value !== 'offer' && value !== 'answer') {
    throw new PairingError(PairingErrorCode.MalformedPayload, 'kind must be offer or answer');
  }
  return value;
};

const requireExpiry = (raw: Record<string, unknown>): number => {
  const value = raw.expiresAt;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new PairingError(PairingErrorCode.MalformedPayload, 'expiresAt must be a positive integer');
  }
  return value;
};

/** Canonical bytes of a payload — the exact input to signing and the transcript. */
export const pairingPayloadBytes = (payload: PairingPayload): Uint8Array =>
  new TextEncoder().encode(canonicalJson(payload));

/** Canonical JSON → raw DEFLATE → base64url. */
export const encodePairingPayload = async (payload: PairingPayload): Promise<string> => {
  const bytes = pairingPayloadBytes(payload);
  if (bytes.length > MAX_PAYLOAD_BYTES) {
    throw new PairingError(PairingErrorCode.OversizedPayload, 'canonical payload exceeds the ceiling');
  }
  if (new TextEncoder().encode(payload.sdp).length > MAX_SDP_BYTES) {
    throw new PairingError(PairingErrorCode.OversizedPayload, 'sdp exceeds its ceiling');
  }
  return toBase64Url(await deflate(bytes));
};

const structure = (raw: Record<string, unknown>): PairingPayload => {
  if (raw.v !== PAIRING_PROTOCOL_VERSION) {
    throw new PairingError(PairingErrorCode.UnsupportedVersion, String(raw.v));
  }
  const kind = requireKind(raw);
  const base = {
    v: PAIRING_PROTOCOL_VERSION as typeof PAIRING_PROTOCOL_VERSION,
    sessionId: requireString(raw, 'sessionId'),
    deviceId: requireString(raw, 'deviceId'),
    identityJwk: requireJwk(raw, 'identityJwk'),
    ephemeralJwk: requireJwk(raw, 'ephemeralJwk'),
    sdp: requireString(raw, 'sdp'),
    nonce: requireString(raw, 'nonce'),
    expiresAt: requireExpiry(raw),
    signature: requireString(raw, 'signature'),
  };
  return kind === 'offer'
    ? { ...base, kind }
    : { ...base, kind, offerHash: requireString(raw, 'offerHash') };
};

/**
 * base64url → inflate → canonical parse → structural validation.
 *
 * The canonical check is not a formality: a receiver verifies the signature over
 * the bytes it received, so bytes that parse to a signed value but are not
 * themselves canonical must be refused before anything looks at the signature.
 */
export const decodePairingPayload = async (text: string): Promise<PairingPayload> => {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) {
    throw new PairingError(PairingErrorCode.MalformedPayload, 'not base64url text');
  }
  const inflated = await inflate(fromBase64Url(text));
  let parsed: unknown;
  try {
    parsed = parseCanonicalJson(new TextDecoder().decode(inflated));
  } catch {
    throw new PairingError(PairingErrorCode.NonCanonical, 'payload bytes are not canonical JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PairingError(PairingErrorCode.MalformedPayload, 'payload must be an object');
  }
  const payload = structure(parsed as Record<string, unknown>);
  // Re-encoding must reproduce the parsed object exactly: a field the structure
  // check does not know about would otherwise ride along unnoticed into the
  // signed bytes.
  if (canonicalJson(payload) !== canonicalJson(parsed)) {
    throw new PairingError(PairingErrorCode.MalformedPayload, 'payload carries unknown fields');
  }
  return payload;
};
