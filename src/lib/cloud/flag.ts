import { hasCloudEnv } from './env';

/** localStorage key holding the local beta opt-in (`'on'` = enabled). */
export const CLOUD_FLAG_KEY = 'lipsum-cloud-sync';
/** URL query param that toggles the local beta opt-in. */
export const CLOUD_FLAG_PARAM = 'cloud-sync';

/** Whether this browser has opted into the cloud-sync beta. */
export const readCloudFlag = (): boolean => {
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
    url.searchParams.delete(CLOUD_FLAG_PARAM);
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* storage or history unavailable — leave the flag untouched */
  }
};

/** The cloud-sync beta is active only when both gates are on. */
export const isCloudSyncEnabled = (): boolean =>
  hasCloudEnv() && readCloudFlag();
