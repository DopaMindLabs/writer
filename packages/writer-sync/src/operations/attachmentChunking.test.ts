import { describe, expect, it } from 'vitest';
import type { AttachmentChunkManifest } from './operation.types';
import {
  ChunkIntegrityError,
  MAX_ATTACHMENT_BYTES,
  MalformedManifestError,
  assembleChunks,
  buildChunkManifest,
  missingChunkIndices,
  validateChunkManifest,
  verifyChunk,
} from './attachmentChunking';

const CONTENT = new Uint8Array(
  Array.from({ length: 2500 }, (_unused, i) => (i * 7) % 256),
);
const CHUNK_BYTES = 1000;

const manifestFor = () =>
  buildChunkManifest({ attachmentId: 'att-1', content: CONTENT, chunkBytes: CHUNK_BYTES });

const chunkAt = (index: number): Uint8Array =>
  CONTENT.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);

const allChunks = (): Map<number, Uint8Array> =>
  new Map([0, 1, 2].map((index) => [index, chunkAt(index)]));

describe('buildChunkManifest', () => {
  it('describes the content it was built from', async () => {
    const manifest = await manifestFor();
    expect(manifest).toMatchObject({
      attachmentId: 'att-1',
      totalBytes: 2500,
      chunkBytes: CHUNK_BYTES,
      chunkCount: 3,
    });
    expect(manifest.chunkHashes).toHaveLength(3);
  });

  it('produces a manifest that validates', async () => {
    const manifest = await manifestFor();
    expect(() => validateChunkManifest(manifest)).not.toThrow();
  });

  it('always describes at least one chunk, even for tiny content', async () => {
    const manifest = await buildChunkManifest({
      attachmentId: 'a',
      content: new Uint8Array([1]),
    });
    expect(manifest.chunkCount).toBe(1);
  });
});

describe('validateChunkManifest', () => {
  const invalid = async (
    mutation: Partial<AttachmentChunkManifest>,
  ): Promise<() => void> => {
    const manifest = { ...(await manifestFor()), ...mutation };
    return () => validateChunkManifest(manifest);
  };

  it('rejects an implausible total size', async () => {
    expect(await invalid({ totalBytes: MAX_ATTACHMENT_BYTES + 1 })).toThrow(
      MalformedManifestError,
    );
  });

  it('rejects an implausible chunk size', async () => {
    expect(await invalid({ chunkBytes: 999_999_999 })).toThrow(MalformedManifestError);
  });

  it('rejects an implausible chunk count', async () => {
    expect(await invalid({ chunkCount: 999_999 })).toThrow(MalformedManifestError);
  });

  it('rejects a chunk count that disagrees with the hash list', async () => {
    // Internally contradictory: the receiver would be reconciling two different
    // ideas of how much is coming.
    expect(await invalid({ chunkCount: 2 })).toThrow(MalformedManifestError);
  });

  it('rejects a chunk count that disagrees with the declared size', async () => {
    const manifest = await manifestFor();
    expect(() =>
      validateChunkManifest({
        ...manifest,
        totalBytes: 10_000,
        chunkHashes: manifest.chunkHashes,
      }),
    ).toThrow(MalformedManifestError);
  });

  it('rejects zero and negative sizes', async () => {
    expect(await invalid({ totalBytes: 0 })).toThrow(MalformedManifestError);
    expect(await invalid({ chunkBytes: -1 })).toThrow(MalformedManifestError);
  });

  it('rejects a missing content hash', async () => {
    expect(await invalid({ contentHash: '' })).toThrow(MalformedManifestError);
  });
});

describe('verifyChunk', () => {
  it('accepts a chunk matching its declared hash', async () => {
    const manifest = await manifestFor();
    await expect(
      verifyChunk({ manifest, index: 0, bytes: chunkAt(0) }),
    ).resolves.toBeUndefined();
  });

  it('accepts the short final chunk', async () => {
    const manifest = await manifestFor();
    await expect(
      verifyChunk({ manifest, index: 2, bytes: chunkAt(2) }),
    ).resolves.toBeUndefined();
  });

  it('rejects a chunk whose bytes were substituted', async () => {
    const manifest = await manifestFor();
    const tampered = Uint8Array.from(chunkAt(0));
    tampered[0] = (tampered[0] + 1) % 256;
    await expect(verifyChunk({ manifest, index: 0, bytes: tampered })).rejects.toBeInstanceOf(
      ChunkIntegrityError,
    );
  });

  it('rejects a chunk of the wrong length', async () => {
    const manifest = await manifestFor();
    await expect(
      verifyChunk({ manifest, index: 0, bytes: new Uint8Array(10) }),
    ).rejects.toBeInstanceOf(ChunkIntegrityError);
  });

  it('rejects an index outside the manifest', async () => {
    const manifest = await manifestFor();
    await expect(
      verifyChunk({ manifest, index: 99, bytes: chunkAt(0) }),
    ).rejects.toBeInstanceOf(ChunkIntegrityError);
  });
});

describe('missingChunkIndices', () => {
  it('lists everything when nothing has arrived', async () => {
    const manifest = await manifestFor();
    expect(missingChunkIndices({ manifest, have: new Set() })).toEqual([0, 1, 2]);
  });

  it('lists only the gaps, so a dropped transfer resumes', async () => {
    const manifest = await manifestFor();
    expect(missingChunkIndices({ manifest, have: new Set([0, 2]) })).toEqual([1]);
  });

  it('lists nothing once complete', async () => {
    const manifest = await manifestFor();
    expect(missingChunkIndices({ manifest, have: new Set([0, 1, 2]) })).toEqual([]);
  });
});

describe('assembleChunks', () => {
  it('reassembles the original content', async () => {
    const manifest = await manifestFor();
    expect(await assembleChunks({ manifest, chunks: allChunks() })).toEqual(CONTENT);
  });

  it('refuses an incomplete set rather than padding it', async () => {
    const manifest = await manifestFor();
    const partial = new Map([[0, chunkAt(0)]]);
    await expect(assembleChunks({ manifest, chunks: partial })).rejects.toBeInstanceOf(
      ChunkIntegrityError,
    );
  });

  it('catches chunks that are individually valid but assembled wrongly', async () => {
    // Every chunk passes its own hash; only the whole-content hash catches
    // the transposition.
    const manifest = await manifestFor();
    const swapped = new Map([
      [0, chunkAt(1)],
      [1, chunkAt(0)],
      [2, chunkAt(2)],
    ]);
    await expect(assembleChunks({ manifest, chunks: swapped })).rejects.toBeInstanceOf(
      ChunkIntegrityError,
    );
  });
});
