/**
 * The build-time gate for the cloud-sync beta: the Dexie Cloud database URL.
 * Absent (or non-https) in ordinary builds, so the app never constructs a cloud
 * database. This is one of two gates — see {@link isCloudSyncEnabled}.
 */
export const cloudDatabaseUrl = (): string | null => {
  const url = import.meta.env.VITE_DEXIE_CLOUD_URL;
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
};

export const hasCloudEnv = (): boolean => cloudDatabaseUrl() !== null;

/**
 * Build-time opt-in for the cloud-sync beta, mirroring the runtime
 * `?cloud-sync=on` flag. Set `VITE_CLOUD_SYNC_FLAG=on` in a non-production
 * environment (local `.env.local`, Vercel preview) to surface the beta without
 * the URL dance. Absent (or any value but `'on'`) leaves the runtime flag in
 * sole control, so ordinary production builds stay opted out.
 */
export const cloudFlagFromEnv = (): boolean =>
  import.meta.env.VITE_CLOUD_SYNC_FLAG === 'on';

/**
 * Read a build-time duration given in **seconds**, in milliseconds. Anything not
 * a positive finite number — unset, blank, or malformed — falls back to the
 * default rather than throwing: a mistyped deployment variable must not brick the
 * app, and the defaults are always safe.
 */
const durationFromEnv = (raw: unknown, fallbackMs: number): number => {
  const seconds = typeof raw === 'string' ? Number(raw) : Number.NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : fallbackMs;
};

/**
 * How often a registered device may refresh its registry slot, and how long a
 * slot may sit idle before another device reclaims it — both overridable per
 * deployment so the reclaim can be exercised in seconds rather than days.
 *
 * Keep refresh **far** below stale. A live device must be able to miss several
 * refreshes (a closed laptop, a flaky network) without a peer declaring it dead;
 * the defaults leave a 168× margin. Shortening them is for testing, where losing
 * a slot costs nothing.
 */
export const deviceRefreshIntervalMs = (fallbackMs: number): number =>
  durationFromEnv(import.meta.env.VITE_DEVICE_REFRESH_SECONDS, fallbackMs);

export const deviceStaleAfterMs = (fallbackMs: number): number =>
  durationFromEnv(import.meta.env.VITE_DEVICE_STALE_SECONDS, fallbackMs);
