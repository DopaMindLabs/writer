import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import {
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
  deviceKeyProvider,
} from '@/lib/cloud/crypto/keyStore';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import {
  ACCOUNT_IDENTITY_SCOPE,
  accountDeviceIdentityId,
} from '@/lib/writerSyncIntegration/accountDeviceIdentity.types';
import { createAccountDeviceIdentityStore } from '@/lib/writerSyncIntegration/accountDeviceIdentityStore';
import {
  NoteKind,
  NoteState,
  type Note,
  type NoteAttachment,
} from '@/db/schema';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type DeviceId,
} from 'writer-sync/core';
import {
  deviceIdFor,
  generateDeviceIdentity,
  publicJwkOf,
  type DeviceIdentityKeys,
  type SyncKeyRing,
} from 'writer-sync/crypto';
import { TRANSFER_CHUNK_BYTES, type EncryptedSyncFrame } from 'writer-sync/operations';
import type { Doc } from '@/db/schema';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { prepareFramePayload } from './attachmentFramePayload';
import {
  makeDeleteFrame,
  makePutFrame,
  signAuthoredFrames,
} from './writerOperationFactory';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import { applyInboundFrame } from './writerOperationMaterializer';
import { writerJournalIdentity } from './writerJournalDeps';
import { runUnderSyncApplyLock } from '@/lib/reconcile';
import { refreshInboundDocs } from './inboundDocRefresh';
import { sweepUnappliedFrames } from './frameIngestion';

/**
 * The refresh reaches into the app's own database to put an arrived body
 * through the mount gate; these sweeps run against a database of their own. The
 * seam between them is where the two suites part company.
 */
vi.mock('./inboundDocRefresh', () => ({
  refreshInboundDocs: vi.fn(() => Promise.resolve()),
}));

const DEVICE_REMOTE = asDeviceId('remote-device');

let db: LoremDB;
/** The remote device's identity, as its pairing left it recorded here. */
let remote: DeviceIdentityKeys;

/** Sign a frame as the remote device: the sweep applies nothing unattributed. */
const authoredByRemote = async (
  frame: EncryptedSyncFrame,
): Promise<EncryptedSyncFrame> => (await signAuthoredFrames(remote.privateKey, [frame]))[0];

const note = (): Note => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-n1'),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  id: 'n1',
  spaceId: 's1',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'from-remote',
  createdAt: 1000,
});

const doc = (overrides: Partial<Doc> = {}): Doc => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-d1'),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'A document',
  body: 'from-remote',
  meta: { wordCount: 2 },
  updatedAt: 1000,
  ...overrides,
});

const docFrame = async (ring: SyncKeyRing, overrides: Partial<Doc> = {}) =>
  authoredByRemote(
    await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'docs',
      row: doc(overrides),
    }),
  );

const keyedRing = async (): Promise<SyncKeyRing> => {
  const ring = await deriveKeyRing(generateRootSecret(), 1);
  await saveDeviceKeyRing({ accountId: null, ring });
  return ring;
};

const attachmentFrame = async (ring: SyncKeyRing) => {
  const bytes = new Uint8Array(TRANSFER_CHUNK_BYTES + 3);
  const row: NoteAttachment = {
    accessScopeId: 's1',
    createdBy: asPrincipalId('me'),
    updatedBy: asPrincipalId('me'),
    mutationId: asOperationId('op-a1'),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    id: 'a1',
    noteId: 'n1',
    spaceId: 's1',
    name: 'figure.png',
    mime: 'image/png',
    size: bytes.length,
    blob: new Blob([bytes], { type: 'image/png' }),
    createdAt: 1000,
  };
  const prepared = await prepareFramePayload({
    entityTable: 'noteAttachments',
    row: { ...row },
    ring,
  });
  return {
    chunks: prepared.chunks,
    frame: await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'noteAttachments',
        row: prepared.row,
      }),
    ),
  };
};

beforeEach(async () => {
  db = new LoremDB('frame-ingestion-test');
  await db.open();
  // The sweep attributes every frame before applying it, so the device these
  // fixtures speak for is one this database has paired with.
  remote = await generateDeviceIdentity();
  await createTrustedDeviceStore(db).trust({
    deviceId: DEVICE_REMOTE,
    publicIdentityJwk: await publicJwkOf(remote.publicKey),
    principalId: asPrincipalId('me'),
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
  vi.restoreAllMocks();
});

describe('sweepUnappliedFrames', () => {
  it('applies nothing while the device is keyless — frames wait in the journal', async () => {
    const remoteRing = await deriveKeyRing(generateRootSecret(), 1);
    const frame = await authoredByRemote(
      await makePutFrame({
        ring: remoteRing,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.notes.get('n1')).toBeUndefined();
  });

  it('materialises a provider-replicated frame through the shared inbox path', async () => {
    const master = generateRootSecret();
    const ring = await deriveKeyRing(master, 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const frame = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );
    // A durable provider (Dexie Cloud) lands the frame straight in the journal.
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    // A second sweep re-applies nothing.
    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.syncInbox.count()).toBe(1);
  });

  it('waits for the shared sync-apply lock before touching any state', async () => {
    // The cloud reconciler snapshots documents up front; a sweep interleaving
    // with it can hand back a stale body as the winner. Both paths therefore
    // serialise on one lock — a sweep must not start while it is held.
    const ring = await keyedRing();
    const frame = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );
    await db.syncOperations.put(frame);

    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holder = runUnderSyncApplyLock(() => held);

    const sweep = sweepUnappliedFrames(db);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await db.notes.get('n1')).toBeUndefined();

    release();
    await holder;
    expect(await sweep).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
  });

  it('applies once when the same frame arrives through Dexie and a second provider', async () => {
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const frame = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );

    // Path one: a fake second provider hands the frame over directly.
    await applyInboundFrame({
      db,
      frame: JSON.parse(JSON.stringify(frame)),
      ring,
      verifySignature: createWriterFrameVerifier(db),
    });
    // Path two: Dexie replicated the identical frame into the journal.
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.syncInbox.count()).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
  });

  it('quietly retries an incomplete attachment after its chunks arrive', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const { frame, chunks } = await attachmentFrame(ring);
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.syncInbox.count()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();

    await db.syncAttachmentChunks.bulkPut(chunks);
    expect(await sweepUnappliedFrames(db)).toBe(1);
    expect(await db.noteAttachments.get('a1')).toBeDefined();
    expect(await db.syncInbox.count()).toBe(1);
  });

  describe('bringing arrived documents back on screen', () => {
    /**
     * A document renders from its CRDT log, which no frame touches, so applying
     * the row is only half the job — the other half is telling the gate that
     * decides what an open editor should show.
     */
    it('refreshes each document a peer wrote to, once', async () => {
      const ring = await keyedRing();
      await db.syncOperations.put(await docFrame(ring));
      await db.syncOperations.put(
        await docFrame(ring, {
          mutationId: asOperationId('op-d1-2'),
          logicalUpdatedAt: { millis: 2000, counter: 0 },
          body: 'from-remote, later',
        }),
      );

      await sweepUnappliedFrames(db);

      expect(refreshInboundDocs).toHaveBeenCalledTimes(1);
      expect(refreshInboundDocs).toHaveBeenCalledWith({ db, docIds: ['d1'] });
    });

    it('leaves this device to its own writing', async () => {
      const ring = await keyedRing();
      const own = await writerJournalIdentity();
      await db.syncOperations.put(
        (
          await signAuthoredFrames(own.privateKey, [
            await makePutFrame({
              ring,
              deviceId: own.deviceId,
              entityTable: 'docs',
              row: doc(),
            }),
          ])
        )[0],
      );

      await sweepUnappliedFrames(db);

      // This device already shows what it typed; re-applying it would fight the
      // editor the words are being written in.
      expect(refreshInboundDocs).not.toHaveBeenCalled();
    });

    it('says nothing for other tables, or for a document being deleted', async () => {
      const ring = await keyedRing();
      await db.syncOperations.put(
        await authoredByRemote(
          await makePutFrame({
            ring,
            deviceId: DEVICE_REMOTE,
            entityTable: 'notes',
            row: note(),
          }),
        ),
      );
      await db.syncOperations.put(
        await authoredByRemote(
          makeDeleteFrame({
            ring,
            deviceId: DEVICE_REMOTE,
            entityTable: 'docs',
            entityId: 'd1',
            accessScopeId: 's1',
          }),
        ),
      );

      await sweepUnappliedFrames(db);

      // A note refreshes itself through its live query, and a deleted document
      // takes its own surface down with the row.
      expect(refreshInboundDocs).not.toHaveBeenCalled();
    });

    it('says nothing for a document write a deletion already beat', async () => {
      const ring = await keyedRing();
      await db.syncTombstones.put({
        entityId: 'd1',
        entityTable: 'docs',
        accessScopeId: 's1',
        operationId: asOperationId('op-gone'),
        deviceId: DEVICE_REMOTE,
        logicalAt: { millis: 9000, counter: 0 },
        acknowledgedBy: [],
      });
      await db.syncOperations.put(await docFrame(ring));

      await sweepUnappliedFrames(db);

      expect(refreshInboundDocs).not.toHaveBeenCalled();
    });
  });

  /**
   * The retry contract for account-authorised authors reuses the ingestion
   * loop's existing events — a rejected frame stays in the journal, every
   * settled provider round and key-ring change sweeps again with a fresh
   * verifier — so an identity row and an operation frame may arrive in any
   * order, or straddle an unlock, and still converge without a timer.
   */
  describe('account identity ordering', () => {
    let cloudDb: LoremDB;
    let device: { keys: DeviceIdentityKeys; deviceId: DeviceId; jwk: JsonWebKey };

    const mintDevice = async () => {
      const keys = await generateDeviceIdentity();
      return {
        keys,
        deviceId: await deviceIdFor(keys.publicKey),
        jwk: await publicJwkOf(keys.publicKey),
      };
    };

    const publishIdentity = (): Promise<void> =>
      createAccountDeviceIdentityStore(cloudDb).put({
        id: accountDeviceIdentityId(device.deviceId),
        accessScopeId: ACCOUNT_IDENTITY_SCOPE,
        deviceId: device.deviceId,
        publicIdentityJwk: device.jwk,
        authorisedAt: 1723000000000,
      });

    const accountFrame = async (
      ring: SyncKeyRing,
      overrides: Partial<Note> = {},
    ): Promise<EncryptedSyncFrame> =>
      (
        await signAuthoredFrames(device.keys.privateKey, [
          await makePutFrame({
            ring,
            deviceId: device.deviceId,
            entityTable: 'notes',
            row: { ...note(), ...overrides },
          }),
        ])
      )[0];

    beforeEach(async () => {
      cloudDb = new LoremDB(`frame-ingestion-account-${crypto.randomUUID()}`, {
        cloud: true,
      });
      cloudDb.use(createEncryptionMiddleware(deviceKeyProvider));
      await cloudDb.open();
      device = await mintDevice();
    });

    afterEach(async () => {
      await cloudDb.delete();
    });

    it('leaves an operation waiting until its author’s identity replicates', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const ring = await keyedRing();
      await cloudDb.syncOperations.put(await accountFrame(ring));

      // The author is unknown: nothing applies, nothing is marked accepted —
      // marking it would silence the retry the next settle is entitled to.
      expect(await sweepUnappliedFrames(cloudDb)).toBe(0);
      expect(await cloudDb.syncInbox.count()).toBe(0);
      expect(await cloudDb.syncOperations.count()).toBe(1);
      expect(await cloudDb.notes.get('n1')).toBeUndefined();

      // The identity row replicates; the next settled round's sweep sees both.
      await publishIdentity();
      expect(await sweepUnappliedFrames(cloudDb)).toBe(1);
      expect((await cloudDb.notes.get('n1'))?.body).toBe('from-remote');
      expect(await cloudDb.syncInbox.count()).toBe(1);
      expect(consoleError).toHaveBeenCalled();
    });

    it('applies when the operation and the identity land in one settled round', async () => {
      const ring = await keyedRing();
      await publishIdentity();
      await cloudDb.syncOperations.put(await accountFrame(ring));

      expect(await sweepUnappliedFrames(cloudDb)).toBe(1);
      expect((await cloudDb.notes.get('n1'))?.body).toBe('from-remote');
    });

    it('holds identity-authorised work while keyless and applies it on key acquisition', async () => {
      const ring = await keyedRing();
      await publishIdentity();
      const frame = await accountFrame(ring);
      await forgetDeviceKeyRing();
      await cloudDb.syncOperations.put(frame);

      expect(await sweepUnappliedFrames(cloudDb)).toBe(0);
      expect(await cloudDb.notes.get('n1')).toBeUndefined();

      // The key-ring change is one of the sweep triggers; its sweep converges.
      await saveDeviceKeyRing({ accountId: null, ring });
      expect(await sweepUnappliedFrames(cloudDb)).toBe(1);
      expect((await cloudDb.notes.get('n1'))?.body).toBe('from-remote');
    });

    it('applies once when Cloud delivers first and a peer repeats the frame', async () => {
      const ring = await keyedRing();
      await publishIdentity();
      // The device is also QR-paired under the same identity — the one state
      // where both routes legitimately carry its frames.
      await createTrustedDeviceStore(cloudDb).trust({
        deviceId: device.deviceId,
        publicIdentityJwk: device.jwk,
        principalId: asPrincipalId('me'),
        addedAt: 1_700_000_000_000,
        lastSessionAt: 1_700_000_000_000,
        displayName: 'Paired and cloud',
        status: TrustedDeviceStatus.Active,
        acknowledgedOperations: {},
      });
      const frame = await accountFrame(ring);

      await cloudDb.syncOperations.put(frame);
      expect(await sweepUnappliedFrames(cloudDb)).toBe(1);
      // The peer session hands over the identical frame afterwards.
      await applyInboundFrame({
        db: cloudDb,
        frame: JSON.parse(JSON.stringify(frame)) as EncryptedSyncFrame,
        ring,
        verifySignature: createWriterFrameVerifier(cloudDb),
      });

      expect(await cloudDb.syncInbox.count()).toBe(1);
      expect(await cloudDb.notes.where('id').equals('n1').count()).toBe(1);
    });

    it('applies once when a peer delivers first and Cloud repeats the frame', async () => {
      const ring = await keyedRing();
      await publishIdentity();
      await createTrustedDeviceStore(cloudDb).trust({
        deviceId: device.deviceId,
        publicIdentityJwk: device.jwk,
        principalId: asPrincipalId('me'),
        addedAt: 1_700_000_000_000,
        lastSessionAt: 1_700_000_000_000,
        displayName: 'Paired and cloud',
        status: TrustedDeviceStatus.Active,
        acknowledgedOperations: {},
      });
      const frame = await accountFrame(ring);

      await applyInboundFrame({
        db: cloudDb,
        frame: JSON.parse(JSON.stringify(frame)) as EncryptedSyncFrame,
        ring,
        verifySignature: createWriterFrameVerifier(cloudDb),
      });
      await cloudDb.syncOperations.put(frame);

      expect(await sweepUnappliedFrames(cloudDb)).toBe(0);
      expect(await cloudDb.syncInbox.count()).toBe(1);
      expect(await cloudDb.notes.where('id').equals('n1').count()).toBe(1);
    });
  });

  it('contains an invalid frame instead of blocking the rest of the journal', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const good = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );
    await db.syncOperations.put({ ...good, operationId: asOperationId('op-bad'), payload: btoa('junk') });
    await db.syncOperations.put(good);

    expect(await sweepUnappliedFrames(db)).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    expect(consoleError).toHaveBeenCalled();
  });
});
