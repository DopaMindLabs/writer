import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import type { NoteAttachment } from '@/db/schema';
import {
  forgetDeviceKeyRing,
  saveDeviceKeyRing,
} from '@/lib/cloud/crypto/keyStore';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
} from 'writer-sync/core';
import {
  generateDeviceIdentity,
  publicJwkOf,
  toBase64Url,
  type DeviceIdentityKeys,
} from 'writer-sync/crypto';
import {
  buildChunkManifest,
  TRANSFER_CHUNK_BYTES,
  type CatchUpMessage,
} from 'writer-sync/operations';
import { prepareFramePayload } from './materialization/attachmentFramePayload';
import {
  makePutFrame,
  signAuthoredFrames,
} from './materialization/writerOperationFactory';
import { createTrustedDeviceStore } from './trustedDeviceStore';
import { createAttachmentChunkStore } from './attachmentChunkStore';

const DEVICE_REMOTE = asDeviceId('remote-device');

let db: LoremDB;
/** The device the fixtures speak for, as its pairing left it recorded here. */
let remote: DeviceIdentityKeys;

const bytesOf = (): Uint8Array =>
  Uint8Array.from(
    { length: TRANSFER_CHUNK_BYTES + 11 },
    (_unused, index) => index % 251,
  );

const attachment = (bytes: Uint8Array): NoteAttachment => {
  const content = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return {
    accessScopeId: 's1',
    createdBy: asPrincipalId('remote'),
    updatedBy: asPrincipalId('remote'),
    mutationId: asOperationId('op-a1'),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    id: 'a1',
    noteId: 'n1',
    spaceId: 's1',
    name: 'figure.png',
    mime: 'image/png',
    size: bytes.length,
    blob: new Blob([content], { type: 'image/png' }),
    createdAt: 1000,
  };
};

const thinFrame = async () => {
  const ring = await deriveKeyRing(generateRootSecret(), 1);
  const prepared = await prepareFramePayload({
    entityTable: 'noteAttachments',
    row: { ...attachment(bytesOf()) },
    ring,
  });
  const frame = await makePutFrame({
    ring,
    deviceId: DEVICE_REMOTE,
    entityTable: 'noteAttachments',
    row: prepared.row,
  });
  // The sweep this store triggers attributes a frame before applying it.
  const [signed] = await signAuthoredFrames(remote.privateKey, [frame]);
  return { frame: signed, chunks: prepared.chunks, ring };
};

beforeEach(async () => {
  db = new LoremDB('attachment-chunk-store');
  await db.open();
  remote = await generateDeviceIdentity();
  await createTrustedDeviceStore(db).trust({
    deviceId: DEVICE_REMOTE,
    publicIdentityJwk: await publicJwkOf(remote.publicKey),
    principalId: asPrincipalId('remote'),
    addedAt: 1_700_000_000_000,
    lastSessionAt: 1_700_000_000_000,
    displayName: 'Remote',
    status: TrustedDeviceStatus.Active,
    acknowledgedOperations: {},
  });
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await db.delete();
});

describe('createAttachmentChunkStore', () => {
  it('persists verified chunks so a new transfer requests only the gaps', async () => {
    const content = bytesOf();
    const manifest = await buildChunkManifest({
      attachmentId: 'a1',
      content,
      chunkBytes: TRANSFER_CHUNK_BYTES,
    });
    const { frame } = await thinFrame();
    await db.syncOperations.put(frame);
    const adapter = createAttachmentChunkStore(db);
    const firstSent: CatchUpMessage[] = [];
    const first = adapter.create((message) => firstSent.push(message));

    await first.receive({
      v: 1,
      kind: 'attachment-offer',
      manifests: [manifest],
    });
    await first.receive({
      v: 1,
      kind: 'attachment-chunk',
      chunk: {
        attachmentId: 'a1',
        index: 0,
        bytes: toBase64Url(content.subarray(0, TRANSFER_CHUNK_BYTES)),
      },
    });

    const resumedSent: CatchUpMessage[] = [];
    const resumed = adapter.create((message) => resumedSent.push(message));
    await resumed.receive({
      v: 1,
      kind: 'attachment-offer',
      manifests: [manifest],
    });

    expect(firstSent[0]).toMatchObject({
      kind: 'attachment-request',
      indices: [0, 1],
    });
    expect(resumedSent[0]).toMatchObject({
      kind: 'attachment-request',
      indices: [1],
    });
    expect(await db.syncAttachmentChunks.get(['a1', 0])).toBeDefined();
  });

  it('materialises the pending thin frame when the complete ciphertext arrives', async () => {
    const { frame, chunks, ring } = await thinFrame();
    await saveDeviceKeyRing({ accountId: null, ring });
    await db.syncOperations.put(frame);
    const adapter = createAttachmentChunkStore(db);
    const sent: CatchUpMessage[] = [];
    const transfer = adapter.create((message) => sent.push(message));
    const content = new Uint8Array(
      chunks.reduce((total, chunk) => total + atob(chunk.bytes).length, 0),
    );
    let offset = 0;
    for (const chunk of chunks) {
      const raw = Uint8Array.from(atob(chunk.bytes), (character) =>
        character.charCodeAt(0),
      );
      content.set(raw, offset);
      offset += raw.length;
    }
    const manifest = await buildChunkManifest({
      attachmentId: 'a1',
      content,
      chunkBytes: TRANSFER_CHUNK_BYTES,
    });

    await transfer.receive({
      v: 1,
      kind: 'attachment-offer',
      manifests: [manifest],
    });
    for (const chunk of chunks) {
      await transfer.receive({
        v: 1,
        kind: 'attachment-chunk',
        chunk: {
          attachmentId: chunk.attachmentId,
          index: chunk.index,
          bytes: toBase64Url(
            Uint8Array.from(atob(chunk.bytes), (character) =>
              character.charCodeAt(0),
            ),
          ),
        },
      });
    }

    expect(sent[0]).toMatchObject({
      kind: 'attachment-request',
      indices: [0, 1],
    });
    expect(await db.noteAttachments.get('a1')).toBeDefined();
    expect(await db.syncInbox.get(String(frame.operationId))).toBeDefined();
  });

  it('offers manifests only for complete attachment rows in permitted scopes', async () => {
    const { chunks } = await thinFrame();
    await db.syncAttachmentChunks.bulkPut(chunks);
    await db.noteAttachments.put(attachment(bytesOf()));
    const adapter = createAttachmentChunkStore(db);

    const manifests = await adapter.manifestsForScopes(['s1']);

    expect(manifests).toHaveLength(1);
    expect(manifests[0]).toMatchObject({
      attachmentId: 'a1',
      chunkBytes: TRANSFER_CHUNK_BYTES,
      chunkCount: 2,
    });
    expect(await adapter.manifestsForScopes(['other-scope'])).toEqual([]);
  });
});
