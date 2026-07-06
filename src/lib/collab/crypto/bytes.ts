/**
 * Low-level byte helpers shared across the collaboration crypto layer. These are
 * pure, key-free primitives — UTF-8 encoding, an `ArrayBuffer`-backed view copy
 * for WebCrypto's `BufferSource`, big-endian `u32` encoding, and unambiguous
 * length-prefixed concatenation — extracted here so the roster, envelope, key
 * wrapping and member-key modules bind and serialise bytes exactly the same way.
 * Keeping one implementation is a correctness property, not just tidiness: a
 * signature or AAD produced by one module must be byte-identical to what another
 * module verifies against.
 */

/** WebCrypto wants an ArrayBuffer-backed BufferSource; copy the exact view. */
export const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** Encode a string as UTF-8 bytes. */
export const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

/** Big-endian 32-bit encoding — the fixed-width length prefix for framing. */
export const u32 = (n: number): Uint8Array => {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n, false);
  return out;
};

/** Unambiguous length-prefixed concatenation, so field boundaries are fixed. */
export const concatLengthPrefixed = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + 4 + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(u32(part.byteLength), offset);
    offset += 4;
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
};
