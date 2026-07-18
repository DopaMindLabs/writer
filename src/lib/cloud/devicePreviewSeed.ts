import { db } from '@/db/db';
import { DEVICE_STALE_AFTER_MS } from './devicePolicy';
import { PREVIEW_OWN_ID } from './devicePreview';

/**
 * Seed a registry covering every state a device row can be in, so the list can be
 * driven headlessly: this device, a healthy peer, a peer quiet long enough that
 * its slot is already reclaimable, and a peer someone has revoked.
 *
 * The revoked row matters as much as the rest: it must be *absent* from the list
 * and must not count against the limit, and a bug in either direction is invisible
 * without a row to prove it.
 */
export const seedDevicePreview = async (): Promise<void> => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  await db.cloudDevices.bulkPut([
    { id: PREVIEW_OWN_ID, joinedAt: now - 30 * day, lastSeenAt: now },
    { id: 'preview-live-peer', joinedAt: now - 20 * day, lastSeenAt: now - 3600_000 },
    {
      id: 'preview-stale-peer',
      joinedAt: now - 10 * day,
      lastSeenAt: now - DEVICE_STALE_AFTER_MS - 1,
    },
    {
      id: 'preview-revoked-peer',
      joinedAt: now - 5 * day,
      lastSeenAt: now - 3600_000,
      revokedAt: now - 3600_000,
    },
  ]);
};
