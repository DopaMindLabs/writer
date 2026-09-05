import { asDeviceId, type DeviceId } from 'writer-sync/core';
import {
  deviceIdFor,
  generateDeviceIdentity,
  type DeviceIdentityKeys,
} from 'writer-sync/crypto';
import { DEVICE_RECORD, DeviceVaultDb } from './deviceVaultDb';

/**
 * This device's persistent signing identity — the key that signs pairing
 * payloads and the id every trusted-device record is keyed by.
 *
 * The private half is generated non-extractable and stored as a `CryptoKey`
 * through IndexedDB's structured clone, so it never exists as raw or JWK bytes
 * anywhere in the application. It is created on first use rather than at boot:
 * a device that never pairs never generates one.
 *
 * The id is *derived* from the public key (pairing protocol §9), never minted.
 * That is what stops a device asserting an identity its key does not produce.
 */

export interface DeviceIdentity {
  deviceId: DeviceId;
  keys: DeviceIdentityKeys;
}

const createDeviceIdentityStore = () => {
  // Held in the factory rather than at module scope, and opened lazily, so
  // importing this module never touches IndexedDB.
  let database: DeviceVaultDb | null = null;
  const db = (): DeviceVaultDb => (database ??= new DeviceVaultDb());

  const create = async (): Promise<DeviceIdentity> => {
    const keys = await generateDeviceIdentity();
    const deviceId = await deviceIdFor(keys.publicKey);
    await db().identity.put({
      id: DEVICE_RECORD,
      deviceId: String(deviceId),
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    return { deviceId, keys };
  };

  const stored = async (): Promise<DeviceIdentity | null> => {
    const row = await db().identity.get(DEVICE_RECORD);
    if (row?.privateKey === undefined || row.publicKey === undefined) return null;
    return {
      deviceId: asDeviceId(row.deviceId),
      keys: { privateKey: row.privateKey, publicKey: row.publicKey },
    };
  };

  return {
    /** The stored identity, creating one on first use. */
    load: async (): Promise<DeviceIdentity> => (await stored()) ?? create(),

    /**
     * The stored identity, or `null`. For readers that must not bring one into
     * existence: a device with no identity has authored nothing, so asking
     * whether a frame is its own must not be what mints its first key.
     */
    current: stored,

    /**
     * Discard the identity. Every trusted-device record naming it becomes
     * unverifiable, which is the point: this is device reset, not a cache clear.
     */
    forget: async (): Promise<void> => {
      await db().identity.delete(DEVICE_RECORD);
    },
  };
};

export const deviceIdentityStore = createDeviceIdentityStore();
