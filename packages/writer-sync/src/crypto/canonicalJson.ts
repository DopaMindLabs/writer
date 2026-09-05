/**
 * Canonical JSON, as specified in `docs/pairing-protocol.md` §3.
 *
 * Signatures and the pairing transcript are computed over *bytes*, so the map
 * from a payload to bytes has to be exact and reproducible on both devices.
 * Two encoders that disagree by a single space produce different signatures and
 * pairing fails with no useful diagnosis.
 *
 * The rules: UTF-8, keys sorted by code point, no insignificant whitespace,
 * minimal string escaping, and integers only — the protocol carries no
 * floating-point value anywhere, so rejecting one is safer than rounding it.
 */

/** Thrown when a value cannot be canonicalised, or bytes are not canonical. */
export class NonCanonicalJsonError extends Error {
  constructor(reason: string) {
    super(`Value is not canonical JSON: ${reason}`);
    this.name = 'NonCanonicalJsonError';
  }
}

const SHORT_ESCAPES: Readonly<Partial<Record<number, string>>> = {
  8: '\\b',
  9: '\\t',
  10: '\\n',
  12: '\\f',
  13: '\\r',
};

/**
 * Escape only what JSON requires: the quote, the reverse solidus, and the C0
 * controls. The solidus is deliberately *not* escaped, and no character above
 * `U+001F` is ever written as a `\u` escape — either choice would produce two
 * byte strings for one value.
 */
const escapeString = (value: string): string => {
  let out = '"';
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const short = SHORT_ESCAPES[code];
    if (character === '"') out += '\\"';
    else if (character === '\\') out += '\\\\';
    else if (short !== undefined) out += short;
    else if (code <= 0x1f) out += `\\u${code.toString(16).padStart(4, '0')}`;
    else out += character;
  }
  return `${out}"`;
};

const encodeNumber = (value: number): string => {
  if (!Number.isInteger(value)) {
    throw new NonCanonicalJsonError(`${String(value)} is not an integer`);
  }
  if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new NonCanonicalJsonError(`${String(value)} is outside [0, 2^53 - 1]`);
  }
  return String(value);
};

const encodeObject = (value: object): string => {
  const entries = Object.entries(value);
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const body = entries
    .map(([key, val]) => `${escapeString(key)}:${canonicalJson(val)}`)
    .join(',');
  return `{${body}}`;
};

/** Encode a value to its single canonical JSON representation. */
export const canonicalJson = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return encodeNumber(value);
  if (typeof value === 'string') return escapeString(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') return encodeObject(value);
  throw new NonCanonicalJsonError(`${typeof value} cannot be encoded`);
};

/**
 * Parse text that must already be canonical, and prove it: the parsed value is
 * re-encoded and compared against the bytes received.
 *
 * Without that comparison a receiver would verify a signature over the *parsed*
 * value while an attacker chose the *bytes* — duplicate keys, a stray space or a
 * redundant escape all parse to something whose signature checks out. Re-encoding
 * closes that gap and costs one pass.
 */
export const parseCanonicalJson = (text: string): unknown => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new NonCanonicalJsonError('text is not valid JSON');
  }
  if (canonicalJson(parsed) !== text) {
    throw new NonCanonicalJsonError('text does not match its canonical encoding');
  }
  return parsed;
};
