import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { deviceKeyProvider, onDeviceKeyRingChange } from './crypto/keyStore';
import type { CloudObservable } from './cloudObservable';

/**
 * The account's device registry for the two-device beta limit. One synced,
 * **unencrypted** row per joined device (the table is deliberately outside
 * `SYNCED_TABLES`): a keyless device must be able to count rows and see ids
 * *before* it holds any key, or a third device could never be turned away. A
 * row carries only the addon's random per-device client identity — which the
 * server already receives on every sync — and two timestamps mirroring timing
 * the server already observes. Never a device name, user agent, or content.
 */
export interface DeviceRecord {
  /** The addon's stable per-device client identity. */
  id: string;
  /** When this device first registered on the account. */
  joinedAt: number;
  /** Refreshed on every registrar run, for a future stale-slot reclaim. */
  lastSeenAt: number;
}

/** How many devices an account may hold while the sync beta runs. */
export const DEVICE_LIMIT = 4;

/** The slice of `db.cloud` the registry reads. Duck-typed locally (like
 *  `setup.ts`) — the cloud-client facade imports this module for sign-out, so
 *  importing it back would be circular. */
interface CloudSlice {
  currentUser?: { value?: { isLoggedIn?: boolean } };
  persistedSyncState?: {
    value?: { initiallySynced?: boolean; clientIdentity?: string };
  };
  syncState?: CloudObservable<{ phase: string }>;
}

const cloudSlice = (db: LoremDB): CloudSlice | undefined =>
  (db as { cloud?: CloudSlice }).cloud;

/** This device's stable client identity, once the first sync has minted it. */
const clientIdentityOf = (db: LoremDB): string | null =>
  cloudSlice(db)?.persistedSyncState?.value?.clientIdentity ?? null;

/** Signed in with the initial account pull confirmed (mirrors the facade). */
const isPullComplete = (db: LoremDB): boolean => {
  const cloud = cloudSlice(db);
  return (
    cloud?.currentUser?.value?.isLoggedIn === true &&
    cloud.persistedSyncState?.value?.initiallySynced === true
  );
};

/**
 * Register this device on the account — idempotent. Gated on holding a key,
 * the pull being confirmed, and the client identity existing (it is minted by
 * the first post-login sync), so a blocked keyless device can never register
 * itself past the limit.
 */
export const registerThisDevice = async (db: LoremDB = appDb): Promise<void> => {
  const id = clientIdentityOf(db);
  if (id === null) return;
  if (deviceKeyProvider.current() === null) return;
  if (!isPullComplete(db)) return;
  const now = Date.now();
  const existing = await db.cloudDevices.get(id);
  await db.cloudDevices.put({
    id,
    joinedAt: existing?.joinedAt ?? now,
    lastSeenAt: now,
  });
};

/** Free this device's slot (sign-out). A no-op before an identity exists. */
export const releaseThisDevice = async (db: LoremDB = appDb): Promise<void> => {
  const id = clientIdentityOf(db);
  if (id === null) return;
  await db.cloudDevices.delete(id);
};

/** Dependencies of {@link startDeviceRegistrar}; all injectable for tests. */
export interface DeviceRegistrarDeps {
  syncState?: CloudObservable<{ phase: string }>;
  currentUser?: CloudObservable<{ isLoggedIn: boolean } | undefined>;
  onKeyChange?: (listener: () => void) => () => void;
  run?: () => Promise<unknown>;
}

/** An observable that never emits — the plain-database fallback. */
const never = <T,>(): CloudObservable<T> => ({
  subscribe: () => ({ unsubscribe: () => undefined }),
});

const defaultSyncState = (): CloudObservable<{ phase: string }> =>
  cloudSlice(appDb)?.syncState ?? never();

const defaultCurrentUser = (): CloudObservable<{ isLoggedIn: boolean } | undefined> => {
  // The addon's currentUser is a behaviour subject: both a `.value` snapshot
  // (read by the gates above) and a subscribable — read the observable view here.
  const cloud = (
    appDb as {
      cloud?: { currentUser?: CloudObservable<{ isLoggedIn: boolean } | undefined> };
    }
  ).cloud;
  return cloud?.currentUser ?? never();
};

/**
 * Keep the device registry current for the whole session. Serialised runs on
 * every settle into `in-sync`, every sign-in identity change, and every device
 * -key change — so an already-joined device (both existing desktops included)
 * re-registers itself on its next load, refreshing `lastSeenAt`. Returns an
 * unsubscribe for every source. A no-op on a plain (non-cloud) database.
 */
export const startDeviceRegistrar = (
  deps: DeviceRegistrarDeps = {},
): (() => void) => {
  const {
    syncState = defaultSyncState(),
    currentUser = defaultCurrentUser(),
    onKeyChange = onDeviceKeyRingChange,
    run = registerThisDevice,
  } = deps;

  let running = false;
  let rerun = false;
  const schedule = (): void => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    void Promise.resolve(run())
      .catch(() => undefined)
      .finally(() => {
        running = false;
        if (rerun) {
          rerun = false;
          schedule();
        }
      });
  };

  let prevPhase: string | undefined;
  const syncSub = syncState.subscribe((state) => {
    const enteredInSync = prevPhase !== 'in-sync' && state.phase === 'in-sync';
    prevPhase = state.phase;
    if (enteredInSync) schedule();
  });
  let prevLoggedIn: boolean | undefined;
  const userSub = currentUser.subscribe((user) => {
    const loggedIn = user?.isLoggedIn ?? false;
    if (loggedIn !== prevLoggedIn) {
      prevLoggedIn = loggedIn;
      schedule();
    }
  });
  const stopKeyChange = onKeyChange(schedule);

  return () => {
    syncSub.unsubscribe();
    userSub.unsubscribe();
    stopKeyChange();
  };
};
