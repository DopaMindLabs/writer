/** localStorage key holding the local-network sync beta opt-in (`'on'` = enabled). */
export const LOCAL_NETWORK_SYNC_FLAG_KEY = 'lipsum-local-network-sync';
/** URL query param that toggles the local-network sync beta opt-in. */
export const LOCAL_NETWORK_SYNC_FLAG_PARAM = 'local-network-sync';
/** localStorage key holding the user-facing Settings opt-in (`'on'` = enabled). */
export const LOCAL_NETWORK_SYNC_SETTING_KEY = 'lipsum-local-network-sync-setting';

/** Whether this build exposes the local-network sync beta. */
export const hasLocalNetworkSyncEnv = (): boolean =>
  import.meta.env.VITE_LOCAL_NETWORK_SYNC === 'true';

/** Whether this browser has opted into the hidden local-network sync beta. */
export const readLocalNetworkSyncFlag = (): boolean => {
  try {
    return localStorage.getItem(LOCAL_NETWORK_SYNC_FLAG_KEY) === 'on';
  } catch {
    return false;
  }
};

/** Whether the user has enabled local-network sync in Universal Settings. */
export const readLocalNetworkSyncSetting = (): boolean => {
  try {
    return localStorage.getItem(LOCAL_NETWORK_SYNC_SETTING_KEY) === 'on';
  } catch {
    return false;
  }
};

/** Persists the Universal Settings opt-in for local-network sync. */
export const writeLocalNetworkSyncSetting = (enabled: boolean): void => {
  try {
    if (enabled) localStorage.setItem(LOCAL_NETWORK_SYNC_SETTING_KEY, 'on');
    else localStorage.removeItem(LOCAL_NETWORK_SYNC_SETTING_KEY);
  } catch {
    /* storage unavailable — keep the in-memory UI state only */
  }
};

/**
 * Applies `?local-network-sync=on|off` from the current URL: persists the hidden
 * beta opt-in to localStorage and strips the param via `history.replaceState`,
 * preserving the rest of the query string and the hash route.
 */
export const applyLocalNetworkSyncFlagFromUrl = (): void => {
  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(LOCAL_NETWORK_SYNC_FLAG_PARAM);
    if (value === 'on') localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    else if (value === 'off') localStorage.removeItem(LOCAL_NETWORK_SYNC_FLAG_KEY);
    else return;
    url.searchParams.delete(LOCAL_NETWORK_SYNC_FLAG_PARAM);
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* storage or history unavailable — leave the flag untouched */
  }
};

/** The hidden local-network sync beta UI is visible only when both gates are on. */
export const isLocalNetworkSyncAvailable = (): boolean =>
  hasLocalNetworkSyncEnv() && readLocalNetworkSyncFlag();

/** Pairing and transport may start only after the user enables the setting too. */
export const canStartLocalNetworkSync = (): boolean =>
  isLocalNetworkSyncAvailable() && readLocalNetworkSyncSetting();
