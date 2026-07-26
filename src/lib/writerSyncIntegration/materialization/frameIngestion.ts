import type { LoremDB } from '@/db/LoremDB';
import { onDeviceKeyRingChange, deviceKeyProvider } from '@/lib/cloud/crypto/keyStore';
import type { SyncObservable } from 'writer-sync/core';
import { applyInboundFrame } from './writerOperationMaterializer';

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
 */
export const sweepUnappliedFrames = async (db: LoremDB): Promise<number> => {
  const ring = deviceKeyProvider.current();
  if (!ring) return 0;
  const frames = await db.syncOperations.toArray();
  let applied = 0;
  for (const frame of frames) {
    const accepted = await db.syncInbox.get(String(frame.operationId));
    if (accepted) continue;
    try {
      await applyInboundFrame({ db, frame, ring });
      applied += 1;
    } catch (error) {
      // One invalid frame must not block the rest of the journal.
      console.error('Rejected an inbound sync frame', {
        operationId: frame.operationId,
        error,
      });
    }
  }
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
