import type { LoremDB } from '@/db/LoremDB';
import { onDeviceKeyRingChange, deviceKeyProvider } from '@/lib/cloud/crypto/keyStore';
import type { DeviceId, SyncObservable } from 'writer-sync/core';
import {
  AttachmentChunksPendingError,
  applyInboundFrame,
} from './writerOperationMaterializer';
import { refreshInboundDocs } from './inboundDocRefresh';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import { writerJournalIdentity } from './writerJournalDeps';

/**
 * Materialises frames a durable provider replicated into `syncOperations`.
 *
 * A provider (Dexie Cloud today) lands whole frames in the journal; this
 * ingester sweeps for operation ids the inbox has not accepted and applies each
 * through {@link applyInboundFrame} — the same idempotent path every provider
 * shares, so the same frame arriving twice (or through two providers) can never
 * apply twice. Sweeps run after every settled sync round and whenever the
 * device key ring changes (a keyless device cannot decrypt payloads, so frames
 * simply wait in the journal until unlock).
 *
 * A provider decides what lands in the journal, never what is applied: one
 * verifier is built per sweep and every frame is attributed through it before
 * {@link applyInboundFrame} touches any state, so a provider that writes a
 * forged frame into `syncOperations` has written something inert.
 */
interface TouchedDoc {
  entityId: string;
  deviceId: DeviceId;
}

/**
 * Which documents another device's writing just changed, each named once.
 *
 * This device's own frames are dropped: it is already showing what it typed,
 * and putting it back through the gate would fight the editor the words are
 * being written in. The identity is asked for only when there is something to
 * ask about — reading it mints one on a device that has never had one.
 */
const foreignDocIds = async (touched: TouchedDoc[]): Promise<string[]> => {
  if (touched.length === 0) return [];
  const here = String((await writerJournalIdentity()).deviceId);
  const foreign = touched.filter((doc) => String(doc.deviceId) !== here);
  return [...new Set(foreign.map((doc) => doc.entityId))];
};

export const sweepUnappliedFrames = async (db: LoremDB): Promise<number> => {
  const ring = deviceKeyProvider.current();
  if (!ring) return 0;
  const frames = await db.syncOperations.toArray();
  const verifySignature = createWriterFrameVerifier(db);
  const touched: TouchedDoc[] = [];
  let applied = 0;
  for (const frame of frames) {
    const accepted = await db.syncInbox.get(String(frame.operationId));
    if (accepted) continue;
    try {
      const result = await applyInboundFrame({ db, frame, ring, verifySignature });
      applied += 1;
      if (frame.entityTable === 'docs' && frame.kind === 'put' && result === 'applied') {
        touched.push({ entityId: frame.entityId, deviceId: frame.deviceId });
      }
    } catch (error) {
      if (error instanceof AttachmentChunksPendingError) continue;
      // One invalid frame must not block the rest of the journal.
      console.error('Rejected an inbound sync frame', {
        operationId: frame.operationId,
        error,
      });
    }
  }
  // A row is not a document on screen: the editor renders from a CRDT log no
  // frame touches, so an arrived body stays invisible until the two are
  // reconciled.
  const docIds = await foreignDocIds(touched);
  if (docIds.length > 0) await refreshInboundDocs({ db, docIds });
  return applied;
};

/**
 * Start sweeping on every settled provider round and key-ring change. Returns
 * the teardown. Failures are contained per sweep: one bad frame must not stop
 * later rounds (`applyInboundFrame` rejects invalid frames individually).
 */
export const startFrameIngestion = (options: {
  db: LoremDB;
  syncComplete: SyncObservable<void>;
}): (() => void) => {
  const { db, syncComplete } = options;
  const sweep = (): void => {
    void sweepUnappliedFrames(db).catch((error: unknown) => {
      console.error('Frame ingestion sweep failed', error);
    });
  };
  const subscription = syncComplete.subscribe(sweep);
  const offRingChange = onDeviceKeyRingChange(sweep);
  sweep();
  return () => {
    subscription.unsubscribe();
    offRingChange();
  };
};
