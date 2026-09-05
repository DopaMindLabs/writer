/**
 * The pairing transcript and the verification code derived from it, specified in
 * `docs/pairing-protocol.md` §8.
 *
 * The transcript is the single value that binds a pairing session together: both
 * devices compute it independently over the complete offer and answer bytes, and
 * it feeds the key agreement, the root-secret wrapper's AAD, and the code
 * the user compares on the two screens. A substituted payload therefore diverges
 * all three at once, rather than relying on anyone noticing one mismatch.
 */

const TRANSCRIPT_LABEL = 'lipsum-pair-transcript-v1';
const SAS_LABEL = 'lipsum-pair-sas-v1';
const SAS_BYTES = 4;
const SAS_MODULUS = 1_000_000;
const SAS_DIGITS = 6;

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const joinWithSeparators = (parts: readonly Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0) + parts.length - 1;
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part, index) => {
    if (index > 0) {
      out[offset] = 0;
      offset += 1;
    }
    out.set(part, offset);
    offset += part.length;
  });
  return out;
};

/**
 * `SHA-256(label || 0x00 || offer || 0x00 || answer)`.
 *
 * The `0x00` separators are what stop bytes moving across the boundary: without
 * them `("ab", "c")` and `("a", "bc")` would hash identically, and an attacker
 * who controls both halves could pair two transcripts that are not the same
 * session.
 */
export const pairingTranscript = async (
  offer: Uint8Array,
  answer: Uint8Array,
): Promise<Uint8Array> => {
  const input = joinWithSeparators([
    new TextEncoder().encode(TRANSCRIPT_LABEL),
    offer,
    answer,
  ]);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', asBuffer(input)));
};

/**
 * The six-digit code shown on both screens for the user to compare.
 *
 * Derived, never transmitted — a payload field carrying it would let an attacker
 * display exactly the value the user expects. Six digits is proportionate
 * because the attacker gets one attempt: the session is single-use, the nonce is
 * cached and the payload expires in five minutes.
 */
export const verificationCode = async (transcript: Uint8Array): Promise<string> => {
  const base = await crypto.subtle.importKey('raw', asBuffer(transcript), 'HKDF', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new ArrayBuffer(0),
      info: asBuffer(new TextEncoder().encode(SAS_LABEL)),
    },
    base,
    SAS_BYTES * 8,
  );
  const value = new DataView(bits).getUint32(0, false);
  return String(value % SAS_MODULUS).padStart(SAS_DIGITS, '0');
};
