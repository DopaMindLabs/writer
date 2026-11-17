import type { AttachmentChunkManifest } from './operation.types';

/**
 * Attachment chunk transfer, specified by threat model §5.8 and runbook §24.
 *
 * A manifest arrives from a peer, so every number in it is the attacker's to
 * choose. The ceilings below are refused outright rather than clamped: a
 * manifest claiming a terabyte is not a transfer to trim down, it is a peer to
 * stop talking to.
 *
 * Each chunk is verified against its own hash on arrival and the assembled
 * content against `contentHash`, so a peer cannot substitute one chunk of a
 * file it otherwise transfers honestly.
 */

export const MAX_ATTACHMENT_BYTES = 104_857_600;
export const MAX_CHUNK_BYTES = 1_048_576;
export const MAX_CHUNK_COUNT = 4096;

export class MalformedManifestError extends Error {
  constructor(reason: string) {
    super(`Attachment manifest is malformed: ${reason}`);
    this.name = 'MalformedManifestError';
  }
}

export class ChunkIntegrityError extends Error {
  constructor(reason: string) {
    super(`Attachment chunk failed verification: ${reason}`);
    this.name = 'ChunkIntegrityError';
  }
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const sha256 = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', asBuffer(bytes));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
};

const positiveInteger = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new MalformedManifestError(`${field} must be a positive integer`);
  }
};

/**
 * Validate a manifest before a single byte is transferred or allocated.
 *
 * The consistency check matters as much as the ceilings: a manifest whose
 * `chunkCount` disagrees with its `chunkHashes` length or with
 * `ceil(totalBytes / chunkBytes)` is internally contradictory, and accepting it
 * would leave the receiver reconciling two different ideas of how much is
 * coming.
 */
export const validateChunkManifest = (manifest: AttachmentChunkManifest): void => {
  positiveInteger(manifest.totalBytes, 'totalBytes');
  positiveInteger(manifest.chunkBytes, 'chunkBytes');
  positiveInteger(manifest.chunkCount, 'chunkCount');

  if (manifest.totalBytes > MAX_ATTACHMENT_BYTES) {
    throw new MalformedManifestError('totalBytes exceeds the ceiling');
  }
  if (manifest.chunkBytes > MAX_CHUNK_BYTES) {
    throw new MalformedManifestError('chunkBytes exceeds the ceiling');
  }
  if (manifest.chunkCount > MAX_CHUNK_COUNT) {
    throw new MalformedManifestError('chunkCount exceeds the ceiling');
  }
  if (manifest.chunkHashes.length !== manifest.chunkCount) {
    throw new MalformedManifestError('chunkCount disagrees with chunkHashes');
  }
  if (Math.ceil(manifest.totalBytes / manifest.chunkBytes) !== manifest.chunkCount) {
    throw new MalformedManifestError('chunkCount disagrees with the declared size');
  }
  if (manifest.contentHash.length === 0) {
    throw new MalformedManifestError('contentHash must not be empty');
  }
};

/** Verify one chunk against the hash the manifest declared for its index. */
export const verifyChunk = async (options: {
  manifest: AttachmentChunkManifest;
  index: number;
  bytes: Uint8Array;
}): Promise<void> => {
  const { manifest, index, bytes } = options;
  if (!Number.isInteger(index) || index < 0 || index >= manifest.chunkCount) {
    throw new ChunkIntegrityError('chunk index is outside the manifest');
  }
  const expectedBytes =
    index === manifest.chunkCount - 1
      ? manifest.totalBytes - manifest.chunkBytes * index
      : manifest.chunkBytes;
  if (bytes.length !== expectedBytes) {
    throw new ChunkIntegrityError('chunk is not the size the manifest declares');
  }
  if ((await sha256(bytes)) !== manifest.chunkHashes[index]) {
    throw new ChunkIntegrityError('chunk does not match its declared hash');
  }
};

/**
 * Which chunks are still needed. Resumability is the point: a transfer that
 * drops halfway is continued by asking for the gaps rather than restarting,
 * which is what makes a large attachment survivable on a flaky LAN.
 */
export const missingChunkIndices = (options: {
  manifest: AttachmentChunkManifest;
  have: ReadonlySet<number>;
}): number[] =>
  Array.from({ length: options.manifest.chunkCount }, (_unused, index) => index).filter(
    (index) => !options.have.has(index),
  );

/**
 * Assemble verified chunks into the complete content, checking the whole
 * against `contentHash`. Verifying each chunk is not sufficient on its own: the
 * chunks could each be valid yet assembled in the wrong order, and only the
 * whole-content hash catches that.
 */
export const assembleChunks = async (options: {
  manifest: AttachmentChunkManifest;
  chunks: ReadonlyMap<number, Uint8Array>;
}): Promise<Uint8Array> => {
  const { manifest, chunks } = options;
  const missing = missingChunkIndices({ manifest, have: new Set(chunks.keys()) });
  if (missing.length > 0) {
    throw new ChunkIntegrityError(`missing ${String(missing.length)} chunk(s)`);
  }
  const out = new Uint8Array(manifest.totalBytes);
  let offset = 0;
  for (let index = 0; index < manifest.chunkCount; index += 1) {
    const chunk = chunks.get(index);
    if (chunk === undefined) throw new ChunkIntegrityError('missing chunk');
    out.set(chunk, offset);
    offset += chunk.length;
  }
  if ((await sha256(out)) !== manifest.contentHash) {
    throw new ChunkIntegrityError('assembled content does not match its declared hash');
  }
  return out;
};

/** Build a manifest for content this device is sending. */
export const buildChunkManifest = async (options: {
  attachmentId: string;
  content: Uint8Array;
  chunkBytes?: number;
}): Promise<AttachmentChunkManifest> => {
  const chunkBytes = options.chunkBytes ?? MAX_CHUNK_BYTES;
  const totalBytes = options.content.length;
  const chunkCount = Math.max(1, Math.ceil(totalBytes / chunkBytes));
  const chunkHashes = await Promise.all(
    Array.from({ length: chunkCount }, (_unused, index) =>
      sha256(options.content.subarray(index * chunkBytes, (index + 1) * chunkBytes)),
    ),
  );
  return {
    attachmentId: options.attachmentId,
    contentHash: await sha256(options.content),
    totalBytes,
    chunkBytes,
    chunkCount,
    chunkHashes,
  };
};
