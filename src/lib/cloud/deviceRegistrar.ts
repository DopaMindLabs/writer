import type { CloudObservable } from './cloudObservable';
import { startCloudLifecycleRunner } from './cloudLifecycleRunner';
import { registerThisDevice } from './deviceRegistry';

/**
 * Keeps the device registry current for the whole session. It owns *when* the
 * registry runs; {@link ./deviceRegistry} owns what a run does. The lifecycle
 * wiring — serialised runs on every settle into `in-sync`, every sign-in
 * identity change, and every device-key change — is the shared
 * {@link startCloudLifecycleRunner}.
 */

/** Dependencies of {@link startDeviceRegistrar}; all injectable for tests. */
export interface DeviceRegistrarDeps {
  syncState?: CloudObservable<{ phase: string }>;
  currentUser?: CloudObservable<{ isLoggedIn: boolean } | undefined>;
  onKeyChange?: (listener: () => void) => () => void;
  run?: () => Promise<unknown>;
}

/**
 * Keep the device registry current for the whole session. Serialised runs on
 * every settle into `in-sync`, every sign-in identity change, and every device
 * -key change — so an already-joined device re-registers itself on its next
 * load. Returns an unsubscribe for every source. A no-op on a plain
 * (non-cloud) database.
 */
export const startDeviceRegistrar = (
  deps: DeviceRegistrarDeps = {},
): (() => void) =>
  startCloudLifecycleRunner({ ...deps, run: deps.run ?? registerThisDevice });
