import { loadDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import { appLogger } from '@/lib/appLogger';

/**
 * Restore this device's key ring into the synchronous key provider, before
 * anything reads or writes a sealed row.
 *
 * **Why boot owns this.** A device acquires key material by one of two routes:
 * it mints the account itself, or it is handed the root secret over a pairing
 * (`rootSecretHandover`). Hydration used to live behind the Dexie Cloud
 * provider's session start, gated on cloud-provisioning flags — so it ran only
 * for the first route, and only when that provider was configured at all. A
 * device paired over QR therefore came back from a reload with no ring: its
 * rows were all present and correctly sealed, and the middleware's keyless read
 * path dropped every one of them, silently, with nothing in the console. The
 * account simply looked empty.
 *
 * Whether this device holds key material is a question for the keystore, not
 * for a flag describing how the material arrived, and not for whichever
 * providers happen to be enabled — so it is asked here, unconditionally, for
 * every device on every boot. A device that has never paired has nothing
 * stored, and this is a no-op for it.
 *
 * A keystore that cannot be read leaves the device keyless — the ordinary state
 * of a device that never paired — so a failure is reported and boot continues.
 * Failing the boot would strand the user short of the very surfaces that
 * resolve a key problem.
 */
export const hydrateDeviceKeys = async (): Promise<void> => {
  try {
    await loadDeviceKeyRing();
  } catch (error: unknown) {
    appLogger.warn('restoring this device’s key ring failed', error);
  }
};
