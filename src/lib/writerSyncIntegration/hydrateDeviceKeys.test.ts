import { describe, expect, it, vi, beforeEach } from 'vitest';

const loadDeviceKeyRing = vi.fn(() => Promise.resolve(null));

vi.mock('@/lib/cloud/crypto/keyStore', () => ({
  loadDeviceKeyRing: () => loadDeviceKeyRing(),
}));

vi.mock('@/lib/appLogger', () => ({
  appLogger: { warn: vi.fn() },
}));

import { appLogger } from '@/lib/appLogger';
import { hydrateDeviceKeys } from './hydrateDeviceKeys';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hydrateDeviceKeys', () => {
  it('restores the stored ring whatever route delivered it', async () => {
    // The defect this exists for: hydration used to be gated on cloud
    // provisioning flags, so a device handed the account root over a pairing
    // never rehydrated and read every sealed row as undecryptable.
    await hydrateDeviceKeys();

    expect(loadDeviceKeyRing).toHaveBeenCalledTimes(1);
  });

  it('asks the store once, without consulting any cloud flag', async () => {
    // No flag is read here on purpose: "does this device hold key material?"
    // is answered by the keystore, not by how the material arrived.
    await hydrateDeviceKeys();
    await hydrateDeviceKeys();

    expect(loadDeviceKeyRing).toHaveBeenCalledTimes(2);
  });

  it('reports a failure rather than failing the boot it precedes', async () => {
    // A keystore that cannot be read leaves the device keyless — which is the
    // status quo for a device that never paired — so boot must still come up
    // and let the user reach the surfaces that resolve it.
    loadDeviceKeyRing.mockRejectedValueOnce(new Error('keystore unavailable'));

    await expect(hydrateDeviceKeys()).resolves.toBeUndefined();
    expect(appLogger.warn).toHaveBeenCalledWith(
      'restoring this device’s key ring failed',
      expect.any(Error),
    );
  });
});
