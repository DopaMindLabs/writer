import { invariant } from '@/lib/invariant';

/**
 * The recovery code is the 32-byte root secret plus one checksum byte,
 * rendered in Crockford base32 and grouped into 8-character blocks. It is shown
 * exactly once at setup; entering it re-derives the master on a new device.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CHAR_TO_VAL = new Map<string, number>();
for (let i = 0; i < ALPHABET.length; i += 1) CHAR_TO_VAL.set(ALPHABET[i], i);

const checksumByte = (bytes: Uint8Array): number =>
  bytes.reduce((acc, byte) => (acc + byte) & 0xff, 0);

const encodeBase32 = (bytes: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
};

const decodeBase32 = (str: string): Uint8Array => {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of str) {
    const v = CHAR_TO_VAL.get(ch);
    invariant(v !== undefined, () => `invalid recovery code character: ${ch}`);
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
      value &= (1 << bits) - 1;
    }
  }
  return new Uint8Array(out);
};

export const encodeRecoveryCode = (master: Uint8Array): string => {
  invariant(master.length === 32, 'recovery code expects a 32-byte root secret');
  const withCheck = new Uint8Array(33);
  withCheck.set(master);
  withCheck[32] = checksumByte(master);
  const encoded = encodeBase32(withCheck);
  return encoded.match(/.{1,8}/g)?.join('-') ?? encoded;
};

/** Tolerant of case, hyphens, spaces, and the Crockford I/L→1, O→0 aliases. */
export const decodeRecoveryCode = (code: string): Uint8Array => {
  const clean = code
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  const bytes = decodeBase32(clean);
  invariant(bytes.length === 33, 'recovery code has the wrong length');
  const master = bytes.slice(0, 32);
  invariant(
    bytes[32] === checksumByte(master),
    'recovery code checksum does not match — check for a typo',
  );
  return master;
};
