import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { deviceKeyProvider } from './crypto/keyStore';
import { deviceRevokedState } from './deviceRevoked';
import { planDeviceRegistration, type DeviceRegistrationPlan } from './devicePolicy';

/**
 * Dexie IO for the account's device registry. {@link ./devicePolicy} decides what
 * a run should do; {@link ./deviceRegistrar} decides when a run happens.
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

/** Apply a plan. Nothing is written when the plan asks for nothing — the property
 *  the whole sync-loop fix rests on. */
const applyPlan = async (
  db: LoremDB,
  plan: DeviceRegistrationPlan,
): Promise<void> => {
  if (plan.evict.length > 0) await db.cloudDevices.bulkDelete(plan.evict);
  if (plan.write) await db.cloudDevices.put(plan.write);
};

/**
 * Register this device on the account, refresh its slot when it is genuinely due,
 * and reclaim slots left behind by devices that are gone.
 *
 * Gated on holding a key, the pull being confirmed, and the client identity
 * existing (it is minted by the first post-login sync), so a keyless device can
 * never register itself past the limit — nor prune anyone else's row.
 *
 * Idempotent in the strong sense: a run that finds nothing to change performs no
 * write at all. That matters because `cloudDevices` is a synced table, so an
 * unconditional write would push, settle the sync round, re-trigger this
 * registrar and write again, for ever.
 */
export const registerThisDevice = async (db: LoremDB = appDb): Promise<void> => {
  const id = clientIdentityOf(db);
  if (id === null) return;
  if (deviceKeyProvider.current() === null) return;
  if (!isPullComplete(db)) return;

  const plan = planDeviceRegistration({
    rows: await db.cloudDevices.toArray(),
    ownId: id,
    now: Date.now(),
  });
  deviceRevokedState.set(plan.revoked);
  await applyPlan(db, plan);
};

/** Free this device's slot (sign-out). A no-op before an identity exists. */
export const releaseThisDevice = async (db: LoremDB = appDb): Promise<void> => {
  const id = clientIdentityOf(db);
  if (id === null) return;
  await db.cloudDevices.delete(id);
};
