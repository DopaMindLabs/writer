/**
 * Structured-clone-safe JSON codec for the encryption envelope. Binary values
 * (`Uint8Array`, `Blob`) are tagged as **base64 strings** rather than number
 * arrays: a `number[]` serialises to roughly 4 bytes of JSON per raw byte, so a
 * 5 MiB attachment would balloon past 17 MiB of JSON before encryption. Base64 is
 * ~1.33× the raw bytes and converts in bounded chunks, keeping payloads and heap
 * within reach on mobile.
 */

/** Thrown when a tagged binary value is structurally invalid on decode. */
export class MalformedBinaryTagError extends Error {
  constructor() {
    super('Binary JSON tag is structurally invalid');
    this.name = 'MalformedBinaryTagError';
  }
}

const U8_TAG = '__u8b64';
const BLOB_TAG = '__blob';

/**
 * Encode raw bytes as base64, chunked so a large body never overflows the call
 * stack through an argument spread.
 */
export const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

/** Decode a base64 string back to raw bytes. */
export const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/**
 * Tag `Uint8Array`/`Blob` values as base64 strings, reject functions, and recurse
 * into arrays and plain objects. The returned value is JSON-serialisable.
 */
export const tagBinary = async (value: unknown): Promise<unknown> => {
  if (value instanceof Uint8Array) return { [U8_TAG]: toBase64(value) };
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const base64 = toBase64(new Uint8Array(await value.arrayBuffer()));
    return { [BLOB_TAG]: { type: value.type, base64 } };
  }
  if (typeof value === 'function') {
    throw new Error('cannot encrypt a function value');
  }
  if (Array.isArray(value)) return Promise.all(value.map(tagBinary));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = await tagBinary(val);
    return out;
  }
  return value;
};

/** Reverse {@link tagBinary}, validating each tag's fields before allocating. */
export const untagBinary = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(untagBinary);
  const obj = value as Record<string, unknown>;
  if (U8_TAG in obj) {
    const base64 = obj[U8_TAG];
    if (typeof base64 !== 'string') throw new MalformedBinaryTagError();
    return fromBase64(base64);
  }
  if (BLOB_TAG in obj) {
    const blob = obj[BLOB_TAG];
    if (
      blob === null ||
      typeof blob !== 'object' ||
      typeof (blob as { base64?: unknown }).base64 !== 'string' ||
      typeof (blob as { type?: unknown }).type !== 'string'
    ) {
      throw new MalformedBinaryTagError();
    }
    const { type, base64 } = blob as { type: string; base64: string };
    const bytes = fromBase64(base64);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return new Blob([buffer], { type });
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) out[key] = untagBinary(val);
  return out;
};
