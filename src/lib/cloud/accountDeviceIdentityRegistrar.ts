import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { publicJwkOf } from 'writer-sync/crypto';
import {
  ACCOUNT_IDENTITY_SCOPE,
  accountDeviceIdentityId,
} from '@/lib/writerSyncIntegration/accountDeviceIdentity.types';
import {
  AccountIdentityConflictError,
  createAccountDeviceIdentityStore,
  hasAccountIdentityTable,
  type AccountDeviceIdentityStore,
} from '@/lib/writerSyncIntegration/accountDeviceIdentityStore';
import { deviceIdentityStore } from './crypto/deviceIdentityStore';
import { deviceKeyProvider } from './crypto/keyStore';
import { fingerprintsEqual, ESCROW_ID } from './crypto/keys';
import { keyMismatchState } from './crypto/keyMismatch';
import {
  startCloudLifecycleRunner,
  type CloudLifecycleDeps,
} from './cloudLifecycleRunner';

/**
 * Publishes this device's signing identity to the account registry — but only
 * once the account key it would seal under is proven authoritative. "A key
 * exists" is not enough: a device may hold a locally-minted ring while signing
 * into an account whose escrow wraps a different master, and publishing then
 * would assert an identity the account's key holders never authorised. The
 * eligibility gates mirror what the escrow reconciler establishes: signed in,
 * initial pull complete, ring bound to this account, account escrow present,
 * fingerprints equal, no live mismatch.
 */

/** What one registrar run concluded. A settled account ends on
 *  `'already-registered'` — no write, so no sync feedback loop. */
export type AccountIdentityRegistrationResult =
  | 'ineligible'
  | 'published'
  | 'already-registered'
  | 'conflict';

/** Best-effort synchronous read of the signed-in account's id. Duck-typed
 *  locally — importing the cloud-client facade here would be circular. */
const readSignedInAccountId = (db: LoremDB): string | null => {
  const user = (
    db as {
      cloud?: { currentUser?: { value?: { userId?: string; isLoggedIn?: boolean } } };
    }
  ).cloud?.currentUser?.value;
  return user?.isLoggedIn ? (user.userId ?? null) : null;
};

/** Whether the signed-in account's initial pull has completed (see the note on
 *  `isAccountPullComplete` in the cloud client; read locally for the same
 *  circularity reason as {@link readSignedInAccountId}). */
const readPullComplete = (db: LoremDB): boolean => {
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

/** Dependencies of {@link registerAccountIdentity}; all injectable for tests. */
export interface AccountIdentityRegistrationDeps {
  db?: LoremDB;
  store?: AccountDeviceIdentityStore;
  isPullComplete?: () => boolean;
  signedInAccountId?: () => string | null;
  hasKeyMismatch?: () => boolean;
  now?: () => number;
}

/** Whether this run may publish at all — every gate must hold. */
const eligible = async (options: {
  db: LoremDB;
  isPullComplete: () => boolean;
  signedInAccountId: () => string | null;
  hasKeyMismatch: () => boolean;
}): Promise<boolean> => {
  const { db, isPullComplete, signedInAccountId, hasKeyMismatch } = options;
  if (!hasAccountIdentityTable(db)) return false;
  const accountId = signedInAccountId();
  if (accountId === null) return false;
  if (!isPullComplete()) return false;
  const ring = deviceKeyProvider.current();
  if (!ring) return false;
  if (deviceKeyProvider.accountId() !== accountId) return false;
  if (hasKeyMismatch()) return false;
  const escrow = await db.cloudCrypto.get(ESCROW_ID);
  if (!escrow) return false;
  return fingerprintsEqual(ring.fingerprint, escrow.fingerprint);
};

/**
 * One idempotent registrar run. Loads (creating on first use) this device's
 * cryptographic identity, exports only its public half, and publishes it once:
 * a record that is already there means no write, and a conflicting record for
 * this id fails closed rather than being overwritten.
 */
export const registerAccountIdentity = async (
  deps: AccountIdentityRegistrationDeps = {},
): Promise<AccountIdentityRegistrationResult> => {
  const {
    db = appDb,
    isPullComplete = () => readPullComplete(db),
    signedInAccountId = () => readSignedInAccountId(db),
    hasKeyMismatch = () => keyMismatchState.current(),
    now = Date.now,
  } = deps;
  if (!(await eligible({ db, isPullComplete, signedInAccountId, hasKeyMismatch }))) {
    return 'ineligible';
  }
  const store = deps.store ?? createAccountDeviceIdentityStore(db);

  const own = await deviceIdentityStore.load();
  const existing = await store.find(own.deviceId);
  // A found record has already proven (derive-and-compare) that it names this
  // device's key — same-identity is inherent, so a settled account is a no-op.
  if (existing) return 'already-registered';

  try {
    await store.put({
      id: accountDeviceIdentityId(own.deviceId),
      accessScopeId: ACCOUNT_IDENTITY_SCOPE,
      deviceId: own.deviceId,
      publicIdentityJwk: await publicJwkOf(own.keys.publicKey),
      authorisedAt: now(),
    });
  } catch (error) {
    // A slot occupied by something this device cannot prove is an integrity
    // failure: leave it exactly as it is and report, never repair.
    if (error instanceof AccountIdentityConflictError) return 'conflict';
    throw error;
  }
  return 'published';
};

/** Dependencies of {@link startAccountIdentityRegistrar}; injectable for tests. */
export type AccountIdentityRegistrarDeps = Partial<CloudLifecycleDeps>;

/**
 * Keep the account identity registry current for the whole session, on the
 * same lifecycle signals as the rest of cloud setup: every settle into
 * `in-sync`, every sign-in change, and every device-key change. Runs are
 * serialised and {@link registerAccountIdentity} is idempotent, so repeated
 * triggers settle into no-write passes. A no-op on a plain database.
 */
export const startAccountIdentityRegistrar = (
  deps: AccountIdentityRegistrarDeps = {},
): (() => void) =>
  startCloudLifecycleRunner({
    ...deps,
    run: deps.run ?? (() => registerAccountIdentity()),
  });
