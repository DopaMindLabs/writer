import type { CloudKeyRing } from './keys';
import { CIPHER_FIELD } from './tableRules';

/**
 * The encrypted payload stored on a sealed row under {@link CIPHER_FIELD}.
 *
 * `iv` and `data` are base64 **strings**, never `Uint8Array`. This is
 * load-bearing: Dexie Cloud auto-offloads any binary value (`Uint8Array` /
 * `ArrayBuffer`) ≥ 4 KB to blob storage, replacing it on the wire with a
 * `{_bt,ref,size}` reference the receiving device must download and re-persist
 * asynchronously. That blob lifecycle is fundamentally incompatible with this
 * encryption middleware (which sits above the addon's blob-resolve layer): a
 * pulled-but-unresolved ref cannot be decrypted, and the addon's blob save-back
 * re-enters this middleware and corrupts the write. Keeping the ciphertext as an
 * inline string sidesteps the binary-offload path entirely; the paired
 * `largeStringThreshold: Infinity` cloud config sidesteps the large-string path.
 */
export interface CipherEnvelope {
  v: 1;
  epoch: number;
  iv: string;
  data: string;
}

/** Thrown when a ciphertext fails AES-GCM authentication (tamper / row swap). */
export class EnvelopeIntegrityError extends Error {
  constructor() {
    super('Cipher envelope failed authentication');
    this.name = 'EnvelopeIntegrityError';
  }
}

/**
 * Thrown when an envelope is structurally invalid — its `iv`/`data` are not the
 * expected base64 strings (e.g. a stray shape reached the decrypt path). Kept
 * distinct from {@link EnvelopeIntegrityError} so callers never mistake a
 * malformed row for a wrong-key/tamper failure and wrongly engage the
 * key-mismatch lock.
 */
export class MalformedEnvelopeError extends Error {
  constructor() {
    super('Cipher envelope is structurally invalid');
    this.name = 'MalformedEnvelopeError';
  }
}

/** Encode raw bytes as a base64 string, chunked so large bodies don't blow the
 *  call stack via argument spread. */
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

/** Decode a base64 string back to raw bytes. */
const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/** Identifies which row a ciphertext belongs to, for AES-GCM's row binding. */
export interface RowRef {
  table: string;
  primaryKey: string;
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

/** Row binding: a decrypt with mismatched table/pk/epoch fails authentication. */
const aad = (epoch: number, ref: RowRef): ArrayBuffer =>
  asBuffer(
    new TextEncoder().encode(
      `lipsum:1:${String(epoch)}:${ref.table}:${ref.primaryKey}`,
    ),
  );

// Structured-clone-safe JSON: Uint8Array/Blob are tagged; functions are rejected.
const tagValue = async (value: unknown): Promise<unknown> => {
  if (value instanceof Uint8Array) return { __u8: Array.from(value) };
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const bytes = Array.from(new Uint8Array(await value.arrayBuffer()));
    return { __blob: { type: value.type, bytes } };
  }
  if (typeof value === 'function') {
    throw new Error('cannot encrypt a function value');
  }
  if (Array.isArray(value)) return Promise.all(value.map(tagValue));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = await tagValue(val);
    return out;
  }
  return value;
};

const untagValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(untagValue);
  const obj = value as Record<string, unknown>;
  if ('__u8' in obj) return new Uint8Array(obj.__u8 as number[]);
  if ('__blob' in obj) {
    const blob = obj.__blob as { type: string; bytes: number[] };
    return new Blob([new Uint8Array(blob.bytes)], { type: blob.type });
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) out[key] = untagValue(val);
  return out;
};

const serialize = async (fields: Record<string, unknown>): Promise<Uint8Array> =>
  new TextEncoder().encode(JSON.stringify(await tagValue(fields)));

const deserialize = (bytes: Uint8Array): Record<string, unknown> =>
  untagValue(JSON.parse(new TextDecoder().decode(bytes))) as Record<
    string,
    unknown
  >;

/** Encrypt every non-plaintext field into `$lipsumCipher`; keep plaintext fields. */
export const sealRow = async (
  ring: CloudKeyRing,
  ref: RowRef,
  row: Record<string, unknown>,
  rules: ReadonlySet<string>,
): Promise<Record<string, unknown>> => {
  const plaintext: Record<string, unknown> = {};
  const secret: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (rules.has(key)) plaintext[key] = value;
    else secret[key] = value;
  }
  // A row that still carries an envelope is sealed data written straight back —
  // the sync layer stamping realmId/owner onto it, or a pulled server row. Its
  // real secret fields live *inside* that envelope, never at the top level:
  // decrypted reads strip the envelope, so no legitimate app write can present
  // both. Re-sealing here would encrypt only the top-level fields and overwrite
  // the real envelope, destroying name/body/meta. Preserve the envelope and drop
  // any stray top-level secret fields (plaintext a legacy update op leaked onto
  // the server row) — `plaintext` already holds exactly the rule fields plus the
  // original envelope.
  if (CIPHER_FIELD in row) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(ring.epoch, ref) },
      ring.contentKey,
      asBuffer(await serialize(secret)),
    ),
  );
  const envelope: CipherEnvelope = {
    v: 1,
    epoch: ring.epoch,
    iv: toBase64(iv),
    data: toBase64(data),
  };
  return { ...plaintext, [CIPHER_FIELD]: envelope };
};

/** Decrypt `$lipsumCipher` back into fields; rows without it pass through. */
export const openRow = async (
  ring: CloudKeyRing,
  ref: RowRef,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const envelope = row[CIPHER_FIELD] as CipherEnvelope | undefined;
  if (!envelope) return row;
  // Validate the shape *before* decrypting: a non-string iv/data is a malformed
  // envelope, not a wrong-key/tamper failure, and must not be caught below and
  // reported as an integrity error (which would engage the key-mismatch lock).
  if (typeof envelope.iv !== 'string' || typeof envelope.data !== 'string') {
    throw new MalformedEnvelopeError();
  }
  let iv: Uint8Array;
  let cipherBytes: Uint8Array;
  try {
    iv = fromBase64(envelope.iv);
    cipherBytes = fromBase64(envelope.data);
  } catch {
    throw new MalformedEnvelopeError();
  }
  let plainBytes: ArrayBuffer;
  try {
    plainBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(envelope.epoch, ref) },
      ring.contentKey,
      asBuffer(cipherBytes),
    );
  } catch {
    throw new EnvelopeIntegrityError();
  }
  const secret = deserialize(new Uint8Array(plainBytes));
  const plaintext: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== CIPHER_FIELD) plaintext[key] = value;
  }
  return { ...plaintext, ...secret };
};
