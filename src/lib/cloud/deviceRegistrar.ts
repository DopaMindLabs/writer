import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { onDeviceKeyRingChange } from './crypto/keyStore';
import type { CloudObservable } from './cloudObservable';
import { registerThisDevice } from './deviceRegistry';

/**
 * Keeps the device registry current for the whole session. It owns *when* the
 * registry runs; {@link ./deviceRegistry} owns what a run does.
 */

/** The slice of `db.cloud` the registrar subscribes to. Duck-typed locally, like
 *  the registry's own — importing the cloud-client facade would be circular. */
interface CloudSlice {
  syncState?: CloudObservable<{ phase: string }>;
}

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

const cloudSlice = (db: LoremDB): CloudSlice | undefined =>
  (db as { cloud?: CloudSlice }).cloud;

const defaultSyncState = (): CloudObservable<{ phase: string }> =>
  cloudSlice(appDb)?.syncState ?? never();

const defaultCurrentUser = (): CloudObservable<{ isLoggedIn: boolean } | undefined> => {
  // The addon's currentUser is a behaviour subject: both a `.value` snapshot
  // (read by the registry's gates) and a subscribable — read the observable view
  // here.
  const cloud = (
    appDb as {
      cloud?: { currentUser?: CloudObservable<{ isLoggedIn: boolean } | undefined> };
    }
  ).cloud;
  return cloud?.currentUser ?? never();
};

/** Serialise runs: never overlap, but always run once more if asked while one was
 *  in flight, so the latest sync/login state is reflected. */
const createRunner = (run: () => Promise<unknown>): (() => void) => {
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
  return schedule;
};

/**
 * Keep the device registry current for the whole session. Serialised runs on
 * every settle into `in-sync`, every sign-in identity change, and every device
 * -key change — so an already-joined device re-registers itself on its next load.
 * Returns an unsubscribe for every source. A no-op on a plain (non-cloud)
 * database.
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

  const schedule = createRunner(run);

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
