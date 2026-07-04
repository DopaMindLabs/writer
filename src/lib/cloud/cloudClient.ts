import { db } from '@/db/db';
import type { DXCUserInteraction, SyncState, UserLogin } from 'dexie-cloud-addon';
import type { CloudObservable } from './cloudObservable';

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
export {
  createCloudEncryption,
  unlockCloudEncryption,
  recoverCloudEncryption,
  forgetThisDevice,
} from './setup';

interface CloudApi {
  userInteraction: CloudObservable<DXCUserInteraction | undefined>;
  syncState: CloudObservable<SyncState>;
  currentUser: CloudObservable<UserLogin | undefined>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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

export const signInToCloud = (): Promise<void> =>
  cloudApi()?.login() ?? Promise.resolve();

export const signOutOfCloud = (): Promise<void> =>
  cloudApi()?.logout() ?? Promise.resolve();
