import { fromBase64, toBase64 } from './binaryJson';

/**
 * base64url without padding (RFC 4648 §5) — the encoding the pairing protocol
 * uses for every binary field, because a payload travels through a QR symbol and
 * `+`, `/` and `=` are awkward there.
 *
 * The envelope codec keeps standard base64 (`binaryJson`); these two alphabets
 * are deliberately separate so neither can drift into the other's format.
 */

export const toBase64Url = (bytes: Uint8Array): string =>
  toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const fromBase64Url = (value: string): Uint8Array => {
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = standard.length % 4 === 0 ? '' : '='.repeat(4 - (standard.length % 4));
  return fromBase64(standard + padding);
};
