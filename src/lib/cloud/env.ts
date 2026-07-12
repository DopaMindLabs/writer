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
