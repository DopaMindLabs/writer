import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import type { SyncState } from 'dexie-cloud-addon';
import { SYNCED_TABLES } from './crypto/tableRules';
import { fingerprintsEqual } from './crypto/keys';
import { deviceKeyProvider, clearPendingEscrow } from './crypto/keyStore';
import { keyMismatchState } from './crypto/keyMismatch';
import { publishPendingEscrow } from './setup';
import { cloudSyncState } from './cloudClient';
import type { CloudObservable } from './cloudObservable';

const ESCROW_ID = 'v1';

export type EscrowReconcileResult =
  | 'idle'
  | 'published'
  | 'matched'
  | 'mismatch';

/** Whether any synced table holds at least one row on this device. */
export const hasLocalSyncedData = async (
  db: LoremDB = appDb,
): Promise<boolean> => {
  for (const table of SYNCED_TABLES) {
    if ((await db.table(table).count()) > 0) return true;
  }
  return false;
};

/**
 * Reconcile the device's held-back escrow against the account's, once sign-in
 * has pulled the account escrow (if any):
 *
 * - **no account escrow** → publish this device's, so its key becomes the
 *   account key (add-only: there was nothing to overwrite);
 * - **fingerprints match** → the account already holds this device's key, so
 *   there is nothing to do;
 * - **fingerprints differ** → the account is protected by a different key; flag
 *   a mismatch for the UI and the write lock, and never publish over the
 *   account's escrow.
 */
export const reconcileEscrow = async (
  db: LoremDB = appDb,
): Promise<EscrowReconcileResult> => {
  const ring = deviceKeyProvider.current();
  if (!ring) return 'idle';
  const serverEscrow = await db.cloudCrypto.get(ESCROW_ID);
  if (!serverEscrow) {
    await publishPendingEscrow(db);
    keyMismatchState.set(false);
    return 'published';
  }
  if (fingerprintsEqual(serverEscrow.fingerprint, ring.fingerprint)) {
    await clearPendingEscrow();
    keyMismatchState.set(false);
    return 'matched';
  }
  keyMismatchState.set(true);
  return 'mismatch';
};

/**
 * Subscribe to the cloud sync engine and reconcile escrows once the first sync
 * settles (`in-sync`) — the point at which the account's escrow, if it has one,
 * has been pulled. Returns an unsubscribe. A no-op on a plain (non-cloud)
 * database whose sync state never leaves `initial`.
 */
export const startEscrowReconciler = (
  observable: CloudObservable<SyncState> = cloudSyncState(),
  run: () => Promise<unknown> = reconcileEscrow,
): (() => void) => {
  let ran = false;
  const subscription = observable.subscribe((state) => {
    if (!ran && state.phase === 'in-sync') {
      ran = true;
      void run();
    }
  });
  return () => {
    subscription.unsubscribe();
  };
};
