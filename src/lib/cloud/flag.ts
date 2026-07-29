import { cloudFlagFromEnv, hasCloudEnv } from './env';

/** localStorage key holding the local beta opt-in (`'on'` = enabled). */
export const CLOUD_FLAG_KEY = 'lipsum-cloud-sync';
/** URL query param that toggles the local beta opt-in. */
export const CLOUD_FLAG_PARAM = 'cloud-sync';
/** localStorage marker recording that this device has built the cloud database. */
export const CLOUD_PROVISIONED_KEY = 'lipsum-cloud-provisioned';

/**
 * Whether this browser has opted into the cloud-sync beta. A build-time
 * `VITE_CLOUD_SYNC_FLAG=on` (non-production only) opts in unconditionally;
 * otherwise the persisted localStorage opt-in decides.
 */
export const readCloudFlag = (): boolean => {
  if (cloudFlagFromEnv()) return true;
  try {
    return localStorage.getItem(CLOUD_FLAG_KEY) === 'on';
  } catch {
    return false;
  }
};

/**
 * Applies `?cloud-sync=on|off` from the current URL: persists the opt-in to
 * localStorage and strips the param via `history.replaceState`, preserving the
 * rest of the query string and the hash route. Any other value (or no param) is
 * ignored. Storage/history errors are swallowed (private-browsing modes).
 */
export const applyCloudFlagFromUrl = (): void => {
  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(CLOUD_FLAG_PARAM);
    if (value === 'on') localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    else if (value === 'off') localStorage.removeItem(CLOUD_FLAG_KEY);
    else return;
    // @TODO: the `?cloud-sync=on` activation URL shouldn't be there for now —
    // the beta is invite-only. Keep the param consumed-and-stripped here until
    // it is removed (or replaced by a proper invite flow).
    url.searchParams.delete(CLOUD_FLAG_PARAM);
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* storage or history unavailable — leave the flag untouched */
  }
};

/** The cloud-sync beta is active only when both gates are on. */
export const isCloudSyncEnabled = (): boolean =>
  hasCloudEnv() && readCloudFlag();

/**
 * Records that the cloud database has been constructed on this device. The
 * Dexie Cloud addon raises the native IndexedDB version, so a later plain-Dexie
 * reopen cannot reconcile and would drop the data. Persisting this marker lets
 * {@link wasCloudProvisioned} keep such a device on the cloud schema even if the
 * beta flag is later switched off — opting out hides the feature, never erases
 * local content.
 */
export const markCloudProvisioned = (): void => {
  try {
    localStorage.setItem(CLOUD_PROVISIONED_KEY, 'on');
  } catch {
    /* storage unavailable — the next build will re-mark it */
  }
};

/** Whether this device has ever built the cloud database (see {@link markCloudProvisioned}). */
export const wasCloudProvisioned = (): boolean => {
  try {
    return localStorage.getItem(CLOUD_PROVISIONED_KEY) === 'on';
  } catch {
    return false;
  }
};
