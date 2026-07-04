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
