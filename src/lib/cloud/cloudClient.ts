import { db } from '@/db/db';
import type { DXCUserInteraction, SyncState, UserLogin } from 'dexie-cloud-addon';
import type { CloudObservable } from './cloudObservable';
import { hasCloudEnv } from './env';
import { readCloudFlag, wasCloudProvisioned } from './flag';
import { loadDeviceKeyRing } from './crypto/keyStore';

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
export { EscrowMissingError } from './crypto/errors';
export { WrongPassphraseError } from './crypto/keys';
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

/**
 * Whether the signed-in user's initial account pull has fully completed — the
 * addon's own websocket gate: `initiallySynced` is set and the user's private
 * realm (whose id equals the userId) is among the pulled realms. Escrow
 * publication is held until this is true, so a not-yet-pulled account escrow can
 * never be clobbered by this device's. `false` on a plain database.
 */
export const isAccountPullComplete = (): boolean => {
  const cloud = (
    db as {
      cloud?: {
        currentUser?: { value?: { isLoggedIn?: boolean; userId?: string } };
        persistedSyncState?: {
          value?: { initiallySynced?: boolean; realms?: string[] };
        };
      };
    }
  ).cloud;
  const user = cloud?.currentUser?.value;
  const synced = cloud?.persistedSyncState?.value;
  return (
    user?.isLoggedIn === true &&
    typeof user.userId === 'string' &&
    synced?.initiallySynced === true &&
    (synced.realms ?? []).includes(user.userId)
  );
};

export const signInToCloud = (): Promise<void> =>
  cloudApi()?.login() ?? Promise.resolve();

export const signOutOfCloud = (): Promise<void> =>
  cloudApi()?.logout() ?? Promise.resolve();

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
