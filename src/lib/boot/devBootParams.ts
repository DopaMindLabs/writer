import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import { keylessLockState } from '@/lib/cloud/crypto/keylessLock';
import { deviceLimitState } from '@/lib/cloud/deviceLimit';
import { devicePreviewState, PREVIEW_OWN_ID } from '@/lib/cloud/devicePreview';
import { seedDevicePreview } from '@/lib/cloud/devicePreviewSeed';
import { installRegistrarPreview } from '@/lib/cloud/devicePreviewCloud';
import { deviceRevokedState } from '@/lib/cloud/deviceRevoked';
import { pwaUpdateState } from '@/lib/pwa/updateState';
import { resetAndReseed } from '@/db/seed';

/**
 * Development- and E2E-only URL affordances, kept out of `App` so the boot
 * component stays free of the cloud internals these switches poke. The real
 * triggers all need a live sign-in — an account, a minted client identity, a
 * settled pull — that a headless run can never reach, so these parameters force
 * each state directly for tests and manual exercise.
 */

const isReseedParamEnabled = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

const stripParam = (url: URL, name: string): void => {
  url.searchParams.delete(name);
  // Preserve the hash route: a dev/E2E URL can combine a boot param with a hash
  // route (e.g. `/?reseed=1#/settings?tab=account`); dropping `url.hash` here would
  // land the app on `/` instead of the requested route, since the router mounts
  // only after boot.
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

/**
 * Drive the device surfaces, which otherwise all need a completed sign-in — an
 * account, a minted client identity, a settled pull — that a headless run can
 * never reach.
 *
 * - `list` seeds a registry covering every row state and forces the list open.
 * - `registrar` additionally stands in for the account state the registrar gates
 *   on, so its real write path runs once this device acquires a key.
 * - `revoked` reports this device's slot as revoked from elsewhere.
 * - anything else forces the device-limit block.
 */
const applyCloudDeviceParam = async (value: string): Promise<void> => {
  if (value === 'revoked') {
    deviceRevokedState.set(true);
    return;
  }
  if (value !== 'list' && value !== 'registrar') {
    deviceLimitState.set(true);
    return;
  }
  await seedDevicePreview();
  devicePreviewState.set({ ownId: PREVIEW_OWN_ID });
  if (value === 'registrar') installRegistrarPreview();
};

/**
 * Dev/E2E-only URL affordances, applied after boot wiring: `?reseed` reseeds the
 * local database, `?cloud-mismatch` forces the key-mismatch signal,
 * `?cloud-keyless` forces the signed-in-keyless lock and `?cloud-devices` drives
 * the device surfaces, so each of these can be exercised headlessly (the real
 * triggers need a live sign-in). Applied after any reseed so the reseed's own
 * writes are never blocked by a forced lock.
 */
export const applyDevBootParams = async (): Promise<void> => {
  if (!isReseedParamEnabled()) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('reseed')) {
    await resetAndReseed();
    stripParam(url, 'reseed');
  }
  if (url.searchParams.has('cloud-mismatch')) {
    keyMismatchState.set(true);
    stripParam(url, 'cloud-mismatch');
  }
  if (url.searchParams.has('cloud-keyless')) {
    keylessLockState.set(true);
    stripParam(url, 'cloud-keyless');
  }
  if (url.searchParams.has('pwa-update')) {
    // Force the update banner: a real waiting service worker needs two
    // successive production builds, which a headless run can never stage.
    pwaUpdateState.set(true);
    stripParam(url, 'pwa-update');
  }
  const devices = url.searchParams.get('cloud-devices');
  if (devices !== null) {
    await applyCloudDeviceParam(devices);
    stripParam(url, 'cloud-devices');
  }
};
