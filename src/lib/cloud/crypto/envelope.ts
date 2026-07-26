import type { CloudKeyRing } from './keys';
import { CIPHER_FIELD } from './tableRules';
import { tagBinary, untagBinary, toBase64, fromBase64 } from './binaryJsonCodec';

/**
 * The encrypted payload stored on a sealed row under {@link CIPHER_FIELD}.
 *
 * Version 2 is *scope-bound*: the envelope names the key (`keyId`, `epoch`) and
 * the access scope it was sealed for, and every one of those values — plus the
 * envelope version, table and primary key — is bound into the AES-GCM AAD.
 * Moving a row to another scope by restamping plaintext fields therefore fails
 * authentication by design: changing scope requires decrypting under the old
 * context and re-encrypting under the new one. There is no v1 dual-read — the
 * project is greenfield and pre-v2 beta data is reset, never migrated.
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
export interface CipherEnvelopeV2 {
  v: 2;
  /** Public one-way tag of the key that sealed this row (the ring fingerprint). */
  keyId: string;
  epoch: number;
  accessScopeId: string;
  algorithm: 'AES-256-GCM';
  iv: string;
  data: string;
}

/** Thrown when a ciphertext fails AES-GCM authentication (tamper / row or scope swap). */
export class EnvelopeIntegrityError extends Error {
  constructor() {
    super('Cipher envelope failed authentication');
    this.name = 'EnvelopeIntegrityError';
  }
}

/**
 * Thrown when an envelope is structurally invalid — not the v2 shape, or its
 * `iv`/`data` are not the expected base64 strings. Kept distinct from
 * {@link EnvelopeIntegrityError} so callers never mistake a malformed row for a
 * wrong-key/tamper failure and wrongly engage the key-mismatch lock.
 */
export class MalformedEnvelopeError extends Error {
  constructor() {
    super('Cipher envelope is structurally invalid');
    this.name = 'MalformedEnvelopeError';
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

/** The public key id for a ring — its fingerprint, as base64. */
export const keyIdOf = (ring: CloudKeyRing): string => toBase64(ring.fingerprint);

/**
 * Context binding: a decrypt whose envelope version, key id, epoch, access
 * scope, table or primary key differs from what was sealed fails authentication.
 */
const aad = (envelope: {
  keyId: string;
  epoch: number;
  accessScopeId: string;
}, ref: RowRef): ArrayBuffer =>
  asBuffer(
    new TextEncoder().encode(
      [
        'lipsum',
        '2',
        envelope.keyId,
        String(envelope.epoch),
        envelope.accessScopeId,
        ref.table,
        ref.primaryKey,
      ].join(':'),
    ),
  );

const serialize = async (fields: Record<string, unknown>): Promise<Uint8Array> =>
  new TextEncoder().encode(JSON.stringify(await tagBinary(fields)));

const deserialize = (bytes: Uint8Array): Record<string, unknown> =>
  untagBinary(JSON.parse(new TextDecoder().decode(bytes))) as Record<
    string,
    unknown
  >;

/**
 * The access scope a row is sealed for — its plaintext routing metadata. A
 * synced row without a scope cannot be sealed: scope-bound encryption has
 * nothing to bind, so this is a programming error, not data to tolerate.
 */
const scopeOf = (row: Record<string, unknown>): string => {
  const scope = row.accessScopeId;
  if (typeof scope !== 'string' || scope.length === 0) {
    throw new MalformedEnvelopeError();
  }
  return scope;
};

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
  // any stray top-level secret fields — `plaintext` already holds exactly the
  // rule fields plus the original envelope.
  if (CIPHER_FIELD in row) return plaintext;
  const header = {
    keyId: keyIdOf(ring),
    epoch: ring.epoch,
    accessScopeId: scopeOf(row),
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(header, ref) },
      ring.contentKey,
      asBuffer(await serialize(secret)),
    ),
  );
  const envelope: CipherEnvelopeV2 = {
    v: 2,
    ...header,
    algorithm: 'AES-256-GCM',
    iv: toBase64(iv),
    data: toBase64(data),
  };
  return { ...plaintext, [CIPHER_FIELD]: envelope };
};

/** Whether a value has the exact v2 envelope shape. */
const isV2Envelope = (value: unknown): value is CipherEnvelopeV2 => {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    raw.v === 2 &&
    typeof raw.keyId === 'string' &&
    typeof raw.epoch === 'number' &&
    typeof raw.accessScopeId === 'string' &&
    raw.algorithm === 'AES-256-GCM' &&
    typeof raw.iv === 'string' &&
    typeof raw.data === 'string'
  );
};

/** Decrypt `$lipsumCipher` back into fields; rows without it pass through. */
export const openRow = async (
  ring: CloudKeyRing,
  ref: RowRef,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const envelope = row[CIPHER_FIELD];
  if (envelope === undefined) return row;
  // Validate the shape *before* decrypting: anything that is not the v2 shape is
  // a malformed envelope, not a wrong-key/tamper failure, and must not be caught
  // below and reported as an integrity error (which would wrongly engage the
  // key-mismatch lock). There is deliberately no v1 fallback.
  if (!isV2Envelope(envelope)) {
    throw new MalformedEnvelopeError();
  }
  // The plaintext scope on the row is the decryption *context*. If a sync layer
  // restamped it without re-encrypting, it no longer matches the sealed scope —
  // decrypt under the stored row's context so the mismatch fails authentication.
  const context = {
    keyId: envelope.keyId,
    epoch: envelope.epoch,
    accessScopeId: scopeOf(row),
  };
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
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(context, ref) },
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
