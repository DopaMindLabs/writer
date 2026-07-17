import { liveQuery } from 'dexie';
import { db } from '@/db/db';
import type { DXCUserInteraction, SyncState, UserLogin } from 'dexie-cloud-addon';
import type { CloudObservable } from './cloudObservable';
import { hasCloudEnv } from './env';
import { readCloudFlag, wasCloudProvisioned } from './flag';
import { loadDeviceKeyRing, deviceKeyProvider } from './crypto/keyStore';
import { ESCROW_ID } from './crypto/keys';
import { hasPlaintextSyncedRows } from './setup';
import { releaseThisDevice } from './deviceRegistry';
import { KeylessSignInBlockedError } from './crypto/errors';
import { startKeyRingChannel } from './crypto/keyRingChannel';
import { startCloudReconciler } from './reconcile';
import { startEscrowReconciler } from './escrowReconcile';
import { startKeylessLockMonitor } from './keylessGuard';
import { startDeviceRegistrar } from './deviceRegistrar';

/**
 * Facade over `db.cloud` (the Dexie Cloud addon API). It is the *only* module
 * the cloud UI imports for sync observables and actions, so no component depends
 * on the addon directly — they can be tested and previewed with plain fakes.
 */

export type { DXCUserInteraction, SyncState } from 'dexie-cloud-addon';
/** The phase of the sync engine, surfaced to the status row. */
export type CloudSyncPhase = SyncState['phase'];

export { isCloudSyncEnabled } from './flag';
export { deviceKeyProvider } from './crypto/keyStore';
export { EscrowMissingError, KeylessSignInBlockedError } from './crypto/errors';
export { WrongPassphraseError, canonicalisePassphrase } from './crypto/keys';
export {
  createCloudEncryption,
  unlockCloudEncryption,
  recoverCloudEncryption,
  forgetThisDevice,
  adoptAccountKey,
  eraseSyncedContent,
} from './setup';

interface CloudApi {
  userInteraction: CloudObservable<DXCUserInteraction | undefined>;
  syncState: CloudObservable<SyncState>;
  currentUser: CloudObservable<UserLogin | undefined>;
  /** Fires after every settled sync round (each HTTP/WS sync), regardless of
   *  phase — a superset of the `pulling→other` edge the reconciler also watches. */
  events?: { syncComplete: CloudObservable<void> };
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sync?: (options?: { purpose: 'push' | 'pull'; wait: boolean }) => Promise<void>;
}

/** The live addon API, or `null` on a plain (non-cloud) database. */
const cloudApi = (): CloudApi | null => {
  const api = (db as { cloud?: CloudApi }).cloud;
  return api ?? null;
};

/** An observable that emits a single fixed value — the no-cloud fallback. */
const constant = <T,>(value: T): CloudObservable<T> => ({
  subscribe: (next) => {
    next(value);
    return { unsubscribe: () => undefined };
  },
});


const INITIAL_STATE: SyncState = { status: 'not-started', phase: 'initial' };

export const cloudUserInteraction = (): CloudObservable<DXCUserInteraction | undefined> =>
  cloudApi()?.userInteraction ?? constant(undefined);

export const cloudSyncState = (): CloudObservable<SyncState> =>
  cloudApi()?.syncState ?? constant(INITIAL_STATE);

export const cloudCurrentUser = (): CloudObservable<UserLogin | undefined> =>
  cloudApi()?.currentUser ?? constant(undefined);

/**
 * Fires once after each settled sync round. The reconciler subscribes to it so a
 * successful pull that did not cross a `pulling→other` phase edge still triggers
 * reconciliation. Never emits on a plain (non-cloud) database.
 */
export const cloudSyncComplete = (): CloudObservable<void> => {
  const events = cloudApi()?.events;
  if (events) return events.syncComplete;
  // A never-emitting fallback: an event stream (unlike state) must not fire a
  // spurious value on subscribe. Typed void by the return annotation.
  return { subscribe: () => ({ unsubscribe: () => undefined }) };
};

/**
 * Whether the signed-in user's initial account pull has completed. The addon sets
 * `initiallySynced` in the very same sync round that records the pulled realms and
 * applies their rows (dexie-cloud-addon 4.4.13, `_sync`), so once it is `true` any
 * escrow the account holds — in a realm the user belongs to — is already in
 * `cloudCrypto`. Escrow publication is held until this is `true`, so a not-yet
 * -pulled account escrow can never be clobbered by this device's.
 *
 * It deliberately does **not** also require the user's private realm to appear in
 * the pulled-realm set. That realm is only enumerated once it holds a row, so a
 * brand-new account (which never wrote an escrow) would never satisfy it — leaving
 * a keyless device that signed in first stuck on "fetching your account…" forever,
 * unable to set up or publish. `false` on a plain database.
 */
export const isAccountPullComplete = (): boolean => {
  const cloud = (
    db as {
      cloud?: {
        currentUser?: { value?: { isLoggedIn?: boolean } };
        persistedSyncState?: { value?: { initiallySynced?: boolean } };
      };
    }
  ).cloud;
  return (
    cloud?.currentUser?.value?.isLoggedIn === true &&
    cloud.persistedSyncState?.value?.initiallySynced === true
  );
};

/**
 * This device's stable, random per-device client identity, minted by the first
 * post-login sync (the addon sends it to the server on every sync). `null` on a
 * plain database or before that first sync settles.
 */
export const cloudClientIdentity = (): string | null => {
  const cloud = (
    db as {
      cloud?: { persistedSyncState?: { value?: { clientIdentity?: string } } };
    }
  ).cloud;
  return cloud?.persistedSyncState?.value?.clientIdentity ?? null;
};

/** Whether the account holds an escrow, once its pull is confirmed complete. */
export type EscrowPresence = 'unknown' | 'none' | 'present';

/**
 * The account's escrow presence for a signed-in-keyless device: `'unknown'`
 * until the initial pull completes **and** the escrow-row query has resolved at
 * least once (so Set-up can't mint a divergent key before we know — on a
 * reloading device the pull-complete flag is persisted `true` while the row read
 * is still in flight, and reporting `'none'` in that gap would offer Set-up over
 * an account that has a key), then `'present'` (offer Unlock/adopt) or `'none'`
 * (offer Set-up). It re-evaluates on both `cloudCrypto` changes and sync-state
 * settles, since the escrow row and the pull-complete signal can arrive
 * independently. Constant `'none'` on a plain database.
 */
export const cloudEscrowPresence = (): CloudObservable<EscrowPresence> => {
  const api = cloudApi();
  if (!api) return constant('none');
  return {
    subscribe: (next) => {
      let hasRow = false;
      let rowResolved = false;
      const emit = (): void => {
        if (!rowResolved || !isAccountPullComplete()) {
          next('unknown');
          return;
        }
        next(hasRow ? 'present' : 'none');
      };
      const rowSub = liveQuery(() => db.cloudCrypto.get(ESCROW_ID)).subscribe((row) => {
        hasRow = row !== undefined;
        rowResolved = true;
        emit();
      });
      const syncSub = api.syncState.subscribe(() => {
        emit();
      });
      return {
        unsubscribe: () => {
          rowSub.unsubscribe();
          syncSub.unsubscribe();
        },
      };
    },
  };
};

export const signInToCloud = async (): Promise<void> => {
  const api = cloudApi();
  if (!api) return;
  // First device: it has unencrypted writing but no key. Keep it on
  // passphrase-before-sign-in so that writing is sealed before it can sync —
  // signing in now would let the addon push it in the clear. A clean device
  // (no plaintext synced rows) may sign in first and unlock afterwards.
  if (deviceKeyProvider.current() === null && (await hasPlaintextSyncedRows())) {
    throw new KeylessSignInBlockedError();
  }
  await api.login();
};

/**
 * Sign out, freeing this device's slot in the beta device registry first.
 * The addon's `logout()` never pushes pending mutations (it clears or prompts),
 * so the row deletion is flushed with an explicit push before logging out —
 * best-effort: an offline sign-out still signs out, leaking the slot until a
 * registered device frees it (the row's `lastSeenAt` supports a later reclaim).
 */
export const signOutOfCloud = async (): Promise<void> => {
  const api = cloudApi();
  if (!api) return;
  try {
    await releaseThisDevice();
    await api.sync?.({ purpose: 'push', wait: true });
  } catch {
    // Offline or mid-sync failure: the slot leaks, sign-out still proceeds.
  }
  await api.logout();
};

/**
 * Revoke another device's slot, freeing it at once.
 *
 * The row is **tombstoned, not deleted**: `revokedAt` is how the revoked device
 * learns it was removed rather than silently losing its slot, and the registrar
 * sweeps the tombstone once that device has had time to see it. The slot itself is
 * free immediately — a revoked row never counts as live.
 *
 * Refuses this device's own id: revoking yourself is meaningless while you hold
 * the session, since the registrar would simply rejoin on the next sync. Sign out
 * instead, which releases the slot outright.
 *
 * The deletion is flushed with an explicit push, best-effort: an offline revoke
 * still applies locally and travels on the next sync.
 */
export const removeCloudDevice = async (id: string): Promise<void> => {
  const api = cloudApi();
  if (!api) return;
  if (id === cloudClientIdentity()) return;
  await db.cloudDevices.update(id, { revokedAt: Date.now() });
  try {
    await api.sync?.({ purpose: 'push', wait: true });
  } catch {
    // Offline: the tombstone is written locally and pushes on the next sync.
  }
};

/**
 * Force a fresh pull from the server — the retry behind a stalled account fetch.
 * A signed-in keyless device whose initial pull failed (or never settled) is
 * otherwise stuck on "fetching your account…"; this re-runs the pull so escrow
 * presence can resolve. A no-op (resolved) on a plain database, or an addon build
 * without `sync`. Rejections propagate to the caller so the UI can surface them.
 */
export const requestCloudSync = (): Promise<void> =>
  cloudApi()?.sync?.({ purpose: 'pull', wait: true }) ?? Promise.resolve();

/**
 * Load the persisted device key ring into the middleware's synchronous provider
 * before the cloud database is used. Without this, a provisioned device that
 * reloads would read ciphertext back and — if still signed in — take the keyless
 * pass-through and enqueue plaintext until the user manually unlocked. A no-op
 * when the database is not cloud-enabled. Call it during app boot.
 */
export const hydrateCloudDevice = async (): Promise<void> => {
  if (hasCloudEnv() && (readCloudFlag() || wasCloudProvisioned())) {
    await loadDeviceKeyRing();
  }
};

/**
 * Boot the cloud session behind the facade: hydrate the persisted device key,
 * then start every background reconciler and monitor that keeps this device
 * consistent with its account — the sibling-tab key channel, the document
 * reconciler, the escrow/account reconciler, the keyless write lock, and the
 * device registrar. Returns a single stop function that tears them all down.
 *
 * The key must be hydrated before any reconciler starts so encrypted reads
 * decrypt and writes seal from the first tick; the keyless lock must be armed
 * before content writes can enter the sync queue. The boot layer owns this
 * lifecycle and never imports the individual cloud subsystems.
 */
export const startCloudSession = async (): Promise<() => void> => {
  await hydrateCloudDevice();
  const stops = [
    // Refresh this tab's key ring when a sibling tab unlocks or forgets it.
    startKeyRingChannel(() => {
      void loadDeviceKeyRing();
    }),
    // Reconcile documents pulled from other devices into the live editor/CRDT.
    startCloudReconciler(),
    // Publish or reconcile this device's escrow against the account's.
    startEscrowReconciler(),
    // Lock content writes whenever the device is signed in without a key ring.
    startKeylessLockMonitor(),
    // Keep this device's row in the account's device registry current.
    startDeviceRegistrar(),
  ];
  return () => {
    for (const stop of stops) stop();
  };
};
