import type { CloudKeyRing } from './keys';
import { CIPHER_FIELD } from './tableRules';

/** The encrypted payload stored on a sealed row under {@link CIPHER_FIELD}. */
export interface CipherEnvelope {
  v: 1;
  epoch: number;
  iv: Uint8Array;
  data: Uint8Array;
}

/** Thrown when a ciphertext fails AES-GCM authentication (tamper / row swap). */
export class EnvelopeIntegrityError extends Error {
  constructor() {
    super('Cipher envelope failed authentication');
    this.name = 'EnvelopeIntegrityError';
  }
}

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
  // An already-sealed row written straight back — no secret fields at the top
  // level, but an existing envelope present — is a re-put of sealed data (e.g.
  // the sync layer stamping realmId/owner onto the row). Its secret fields live
  // inside that envelope, not in `row`, so re-sealing would encrypt the empty
  // secret set and overwrite the real envelope, destroying name/body/meta.
  // Preserve it untouched instead.
  if (Object.keys(secret).length === 0 && CIPHER_FIELD in row) return row;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(ring.epoch, ref) },
      ring.contentKey,
      asBuffer(await serialize(secret)),
    ),
  );
  const envelope: CipherEnvelope = { v: 1, epoch: ring.epoch, iv, data };
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
  let plainBytes: ArrayBuffer;
  try {
    plainBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBuffer(envelope.iv), additionalData: aad(envelope.epoch, ref) },
      ring.contentKey,
      asBuffer(envelope.data),
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
