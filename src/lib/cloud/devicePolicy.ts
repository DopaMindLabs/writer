/**
 * The account's device registry — the pure policy layer. One synced,
 * **unencrypted** row per joined device (the table is deliberately outside
 * `SYNCED_TABLES`): a keyless device must be able to count rows and see ids
 * *before* it holds any key, or a device past the limit could never be turned
 * away. A row carries only the addon's random per-device client identity — which
 * the server already receives on every sync — and timestamps mirroring timing the
 * server already observes. Never a device name, user agent, or content.
 *
 * This module holds no Dexie and no clock: every decision is a pure function of
 * the rows, this device's id, and an injected `now`. {@link ./deviceRegistry}
 * owns the IO; {@link ./deviceRegistrar} owns the subscriptions.
 */

export interface DeviceRecord {
  /** The addon's stable per-device client identity. */
  id: string;
  /** When this device first registered on the account. */
  joinedAt: number;
  /** Refreshed at most once per {@link DEVICE_REFRESH_INTERVAL_MS}; drives the reclaim. */
  lastSeenAt: number;
  /** Set when another device revoked this slot. Absent means "not revoked". */
  revokedAt?: number;
}

/** How many devices an account may hold while the sync beta runs. */
export const DEVICE_LIMIT = 4;

/**
 * The minimum age of `lastSeenAt` before a refresh write is allowed.
 *
 * This is load-bearing. `cloudDevices` is a *synced* table, so an unconditional
 * `put` of a fresh `lastSeenAt` is a real mutation: it pushes, the push settles
 * the sync round, the settle re-runs the registrar, and the registrar puts
 * again — an unbounded sync loop that saturates the main thread and reads to the
 * user as a UI that flashes and hangs. Gating the write behind this interval is
 * what makes a registrar run genuinely idempotent.
 */
export const DEVICE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * How long a slot may sit idle before another device may reclaim it. A live
 * device refreshes hourly, so it must miss ~168 consecutive refreshes to look
 * dead. Without a reclaim, a discarded browser profile holds its slot for ever —
 * sign-out is the only release — and four dead slots lock every future device out
 * of the account.
 */
export const DEVICE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether a slot has gone quiet long enough for another device to reclaim it. */
export const isStaleDevice = (device: DeviceRecord, now: number): boolean =>
  now - device.lastSeenAt > DEVICE_STALE_AFTER_MS;

/** Whether a slot was revoked from another device. */
export const isRevokedDevice = (device: DeviceRecord): boolean =>
  device.revokedAt !== undefined;

/**
 * The rows that actually occupy a slot. A revoked row frees its slot at once (its
 * tombstone lingers only so the revoked device can *see* it was removed), and a
 * stale row frees its slot the moment it goes quiet past the window. Reading the
 * count this way is what keeps a keyless device — which may read this table but
 * never writes to it — from being locked out by dead rows it cannot prune.
 */
export const liveDevices = (
  devices: readonly DeviceRecord[],
  now: number,
): DeviceRecord[] =>
  devices.filter(
    (device) => !isRevokedDevice(device) && !isStaleDevice(device, now),
  );

/** Inputs to {@link planDeviceRegistration}. */
export interface DeviceRegistrationInput {
  rows: readonly DeviceRecord[];
  ownId: string;
  now: number;
}

/**
 * What a registrar run should do. `write` is `null` on the overwhelmingly common
 * path — an already-registered device whose row is still fresh — which is exactly
 * what keeps the sync loop dead.
 */
export interface DeviceRegistrationPlan {
  /** Ids to delete: dead peers, and tombstones the revoked device has had time to see. */
  evict: string[];
  /** The row to write, or `null` when this run must not touch the registry. */
  write: DeviceRecord | null;
  /** This device's own slot was revoked from elsewhere. */
  revoked: boolean;
}

/**
 * Whether a tombstone has outlived its purpose. It is swept on `revokedAt`, never
 * on `lastSeenAt`: a revoked device stops refreshing, so its `lastSeenAt` freezes
 * at the moment of revocation and the two clocks would otherwise race.
 */
const isSpentTombstone = (device: DeviceRecord, now: number): boolean =>
  device.revokedAt !== undefined &&
  now - device.revokedAt > DEVICE_STALE_AFTER_MS;

/**
 * Which peer rows this run should delete. Only peers, and only rows observed dead
 * *in this run* — so once they are gone the next run finds nothing to delete and
 * emits no further mutations.
 */
const evictable = (
  rows: readonly DeviceRecord[],
  ownId: string,
  now: number,
): string[] =>
  rows
    .filter((row) => row.id !== ownId)
    .filter((row) => isSpentTombstone(row, now) || isStaleDevice(row, now))
    .map((row) => row.id);

/** Whether an existing own row is genuinely due a `lastSeenAt` refresh. */
const needsRefresh = (own: DeviceRecord, now: number): boolean =>
  now - own.lastSeenAt >= DEVICE_REFRESH_INTERVAL_MS ||
  // The device's clock moved backwards: the row is stamped in the future, so it
  // would never age into a refresh, and peers would eventually reclaim the slot
  // of a perfectly live device. One corrective write re-anchors it to now.
  own.lastSeenAt > now;

/** The plan for a device whose row is already on the account. */
const planForOwnRow = (
  own: DeviceRecord,
  evict: string[],
  now: number,
): DeviceRegistrationPlan => {
  if (isRevokedDevice(own)) return { evict, write: null, revoked: true };
  const write = needsRefresh(own, now) ? { ...own, lastSeenAt: now } : null;
  return { evict, write, revoked: false };
};

/** The plan for a device with no row yet: join, but only into a genuinely free slot. */
const planForNewRow = (
  { rows, ownId, now }: DeviceRegistrationInput,
  evict: string[],
): DeviceRegistrationPlan => {
  const evicted = new Set(evict);
  const survivors = rows.filter((row) => !evicted.has(row.id));
  // The capacity check matters now that a row can be reclaimed or revoked out
  // from under a *keyed* device, which would otherwise walk straight back in over
  // a full registry.
  if (liveDevices(survivors, now).length >= DEVICE_LIMIT) {
    return { evict, write: null, revoked: false };
  }
  return {
    evict,
    write: { id: ownId, joinedAt: now, lastSeenAt: now },
    revoked: false,
  };
};

/**
 * Decide a registrar run. Pure: no Dexie, no clock.
 *
 * The single most important property is that a run which changes nothing writes
 * nothing — see {@link DEVICE_REFRESH_INTERVAL_MS}.
 */
export const planDeviceRegistration = (
  input: DeviceRegistrationInput,
): DeviceRegistrationPlan => {
  const { rows, ownId, now } = input;
  const evict = evictable(rows, ownId, now);
  const own = rows.find((row) => row.id === ownId);
  return own
    ? planForOwnRow(own, evict, now)
    : planForNewRow(input, evict);
};
