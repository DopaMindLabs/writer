import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { onDeviceKeyRingChange } from './crypto/keyStore';
import type { CloudObservable } from './cloudObservable';

/**
 * The shared "run on every meaningful cloud lifecycle signal" harness: a
 * serialised runner scheduled on every settle into `in-sync`, every change of
 * sign-in state, and every device-key change. The device registrar and the
 * account identity registrar both keep account state current on exactly these
 * signals; the wiring lives once here so their retry semantics cannot drift.
 */

/** The slice of `db.cloud` the runner subscribes to. Duck-typed locally — this
 *  module must not import the cloud-client facade (which imports its callers). */
interface CloudSlice {
  syncState?: CloudObservable<{ phase: string }>;
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
  // and a subscribable — read the observable view here.
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

/** Dependencies of {@link startCloudLifecycleRunner}; all injectable for tests. */
export interface CloudLifecycleDeps {
  syncState?: CloudObservable<{ phase: string }>;
  currentUser?: CloudObservable<{ isLoggedIn: boolean } | undefined>;
  onKeyChange?: (listener: () => void) => () => void;
  run: () => Promise<unknown>;
}

/**
 * Run `deps.run` (serialised) on every settle into `in-sync`, every sign-in
 * state change, and every device-key change. Returns an unsubscribe for every
 * source. A no-op on a plain (non-cloud) database whose observables never emit.
 */
export const startCloudLifecycleRunner = (deps: CloudLifecycleDeps): (() => void) => {
  const {
    syncState = defaultSyncState(),
    currentUser = defaultCurrentUser(),
    onKeyChange = onDeviceKeyRingChange,
    run,
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
