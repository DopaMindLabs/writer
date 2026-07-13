/**
 * The account's device registry — the pure policy layer. One synced,
 * **unencrypted** row per joined device (the table is deliberately outside
 * `SYNCED_TABLES`): a keyless device must be able to count rows and see ids
 * *before* it holds any key, or a device past the limit could never be turned
 * away. A row carries only the addon's random per-device client identity — which
 * the server already receives on every sync — and two timestamps mirroring timing
 * the server already observes. Never a device name, user agent, or content.
 *
 * This module holds no Dexie and no clock, so its rules can be reasoned about and
 * tested in isolation. {@link ./deviceRegistry} owns the IO;
 * {@link ./deviceRegistrar} owns the subscriptions.
 */

export interface DeviceRecord {
  /** The addon's stable per-device client identity. */
  id: string;
  /** When this device first registered on the account. */
  joinedAt: number;
  /** Refreshed on every registrar run, for a future stale-slot reclaim. */
  lastSeenAt: number;
}

/** How many devices an account may hold while the sync beta runs. */
export const DEVICE_LIMIT = 4;
