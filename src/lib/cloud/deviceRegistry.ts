import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { deviceKeyProvider } from './crypto/keyStore';

/**
 * Dexie IO for the account's device registry. {@link ./devicePolicy} defines what
 * a row is and what the beta limit is; {@link ./deviceRegistrar} decides when
 * this module runs.
 */

/** The slice of `db.cloud` the registry reads. Duck-typed locally (like
 *  `setup.ts`) — the cloud-client facade imports this module for sign-out, so
 *  importing it back would be circular. */
interface CloudSlice {
  currentUser?: { value?: { isLoggedIn?: boolean } };
  persistedSyncState?: {
    value?: { initiallySynced?: boolean; clientIdentity?: string };
  };
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
 * Register this device on the account — idempotent. Gated on holding a key, the
 * pull being confirmed, and the client identity existing (it is minted by the
 * first post-login sync), so a blocked keyless device can never register itself
 * past the limit.
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
