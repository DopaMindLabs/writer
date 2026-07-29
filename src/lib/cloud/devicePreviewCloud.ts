import { db } from '@/db/db';
import { PREVIEW_OWN_ID } from './devicePreview';

/**
 * Stand in for the account state the device registrar gates on, so its **real**
 * write path can be driven headlessly.
 *
 * The registrar refuses to touch the registry until the device holds a key, the
 * initial pull is confirmed, and the addon has minted a client identity. All three
 * arrive only from a completed sign-in — an account, an OTP, a settled sync — which
 * a headless run cannot reach. Without this, the code that actually decides when to
 * write a slot (and, crucially, when *not* to) could never be exercised outside a
 * real account, and the sync loop it guards against would be reachable only by hand.
 *
 * It writes to the addon's own snapshot fields rather than replacing `db.cloud`, so
 * the addon itself is left intact. Dev/E2E only — {@link import('@/App')} gates the
 * caller.
 */
/**
 * The addon publishes these as behaviour subjects: `value` is a getter, and `next`
 * is the way to move them. Pushing through `next` also notifies subscribers, which
 * is what makes the registrar actually run rather than merely find a state it
 * missed.
 */
interface Subject {
  next?: (value: unknown) => void;
}

interface CloudSnapshot {
  currentUser?: Subject;
  persistedSyncState?: Subject;
}

export const installRegistrarPreview = (): void => {
  const cloud = (db as { cloud?: CloudSnapshot }).cloud;
  if (!cloud) return;
  cloud.currentUser?.next?.({ isLoggedIn: true });
  cloud.persistedSyncState?.next?.({
    initiallySynced: true,
    clientIdentity: PREVIEW_OWN_ID,
  });
};
