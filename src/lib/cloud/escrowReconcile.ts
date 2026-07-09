import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import type { SyncState } from 'dexie-cloud-addon';
import { SYNCED_TABLES } from './crypto/tableRules';
import { fingerprintsEqual } from './crypto/keys';
import {
  deviceKeyProvider,
  clearPendingEscrow,
  loadPendingEscrow,
} from './crypto/keyStore';
import { keyMismatchState } from './crypto/keyMismatch';
import { publishPendingEscrow } from './setup';
import { cloudSyncState, isAccountPullComplete } from './cloudClient';
import type { CloudObservable } from './cloudObservable';

const ESCROW_ID = 'v1';

export type EscrowReconcileResult =
  | 'idle'
  | 'published'
  | 'deferred'
  | 'matched'
  | 'mismatch';

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * A gated breadcrumb for the one case a user cannot self-diagnose: a genuine
 * fingerprint mismatch. Prints both fingerprints so a reproduction on a preview
 * build reports whether the account escrow is a real other-device key or stale
 * residue. Dev/E2E only — never noise in a production console.
 */
const warnMismatch = (
  serverFingerprint: Uint8Array,
  ringFingerprint: Uint8Array,
  hasPendingEscrow: boolean,
): void => {
  if (!(import.meta.env.DEV || import.meta.env.VITE_E2E === '1')) return;
  console.warn(
    `[cloud] escrow fingerprint mismatch — server=${toHex(serverFingerprint)} ` +
      `ring=${toHex(ringFingerprint)} hasPendingEscrow=${String(hasPendingEscrow)}`,
  );
};

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
 * - **no account escrow (pull confirmed complete)** → publish this device's, so
 *   its key becomes the account key (add-only: there was nothing to overwrite);
 * - **no account escrow (pull not yet confirmed)** → **defer**: an absent row may
 *   just mean the account's escrow has not been pulled yet, and publishing now
 *   would clobber it. Reconciliation re-runs on the next sync settle;
 * - **fingerprints match** → the account already holds this device's key, so
 *   there is nothing to do;
 * - **fingerprints differ** → the account is protected by a different key; flag
 *   a mismatch for the UI and the write lock, and never publish over the
 *   account's escrow.
 */
export const reconcileEscrow = async (
  db: LoremDB = appDb,
  isPullComplete: () => boolean = isAccountPullComplete,
): Promise<EscrowReconcileResult> => {
  const ring = deviceKeyProvider.current();
  if (!ring) return 'idle';
  let serverEscrow = await db.cloudCrypto.get(ESCROW_ID);
  if (!serverEscrow) {
    // Only publish once the initial pull is confirmed complete; otherwise a
    // not-yet-pulled account escrow would be overwritten by ours.
    if (!isPullComplete()) return 'deferred';
    const result = await publishPendingEscrow(db);
    if (result !== 'kept-server') {
      keyMismatchState.set(false);
      return 'published';
    }
    // A foreign escrow raced into the slot between our read and the publish;
    // re-read it and fall through to the mismatch handling below.
    serverEscrow = await db.cloudCrypto.get(ESCROW_ID);
    if (!serverEscrow) {
      keyMismatchState.set(false);
      return 'published';
    }
  }
  // The account escrow is ours if it carries the ring's fingerprint — or the
  // pending escrow's. The two share a master, so they normally match, but the
  // pending copy is checked explicitly to cover a device that published its
  // escrow, then re-derived its ring from the keystore on a later boot: without
  // this the surviving server row would read as a foreign key and spuriously
  // lock the device out. Either way there is nothing to resolve.
  const pending = await loadPendingEscrow();
  const isOurs =
    fingerprintsEqual(serverEscrow.fingerprint, ring.fingerprint) ||
    (pending !== null &&
      fingerprintsEqual(serverEscrow.fingerprint, pending.fingerprint));
  if (isOurs) {
    await clearPendingEscrow();
    keyMismatchState.set(false);
    return 'matched';
  }
  warnMismatch(serverEscrow.fingerprint, ring.fingerprint, pending !== null);
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
