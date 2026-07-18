import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  isAccountPullComplete,
  cloudClientIdentity,
} from '@/lib/cloud/cloudClient';
import {
  DEVICE_LIMIT,
  liveDevices,
  type DeviceRecord,
} from '@/lib/cloud/devicePolicy';
import type { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { deviceLimitState } from '@/lib/cloud/deviceLimit';

/** What the registry read needs to decide the blocked state. */
interface DeviceSlots {
  rows: DeviceRecord[];
  ownId: string | null;
}

/**
 * Whether this device is turned away by the beta device limit: signed in,
 * keyless, the pull confirmed, the registry full of *live* slots, and this device
 * not among them. Registry rows are readable while keyless by design (the table
 * is unencrypted), so a device past the cap can be told before it can act.
 *
 * Only live slots count. A keyless device cannot write, so it can neither prune a
 * dead row nor revoke one — if stale and revoked rows still counted, four
 * discarded browser profiles would lock every future device out of the account
 * for good. Filtering here is the escape hatch: the device can unlock, gain a key,
 * and only then prune, which is the registrar's job.
 *
 * `presence` is a dependency so the registry re-reads the moment the initial pull
 * resolves. The dev/e2e `?cloud-devices=full` affordance forces `true`.
 */
export const useDeviceLimitBlocked = (
  keylessSignedIn: boolean,
  presence: KeyEscrowPresence,
): boolean => {
  const forced = useSyncExternalStore(
    deviceLimitState.subscribe,
    deviceLimitState.current,
    deviceLimitState.current,
  );
  const slots = useLiveQuery<DeviceSlots | undefined>(
    async () => {
      if (!keylessSignedIn || !isAccountPullComplete()) return undefined;
      const rows = await db.cloudDevices.toArray();
      return { rows, ownId: cloudClientIdentity() };
    },
    [keylessSignedIn, presence],
  );
  if (forced) return true;
  if (!slots) return false;
  const live = liveDevices(slots.rows, Date.now());
  if (slots.ownId !== null && live.some((row) => row.id === slots.ownId)) {
    return false;
  }
  return live.length >= DEVICE_LIMIT;
};
