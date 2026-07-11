import { describe, it, expect, beforeEach } from 'vitest';
import { generateMasterSecret, deriveKeyRing } from './keys';
import {
  saveDeviceKeyRing,
  loadDeviceKeyRing,
  forgetDeviceKeyRing,
  deviceKeyProvider,
  onDeviceKeyRingChange,
  getDeviceKeyRevision,
} from './keyStore';

/** Prove a loaded ring's content key is usable without ever exporting it. */
const roundTripsAProbe = async (key: CryptoKey): Promise<boolean> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const probe = new TextEncoder().encode('probe payload');
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, probe);
  const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, sealed);
  return new TextDecoder().decode(opened) === 'probe payload';
};

describe('device keyStore', () => {
  beforeEach(async () => {
    await forgetDeviceKeyRing();
  });

  it('persists and reloads a usable non-extractable content key', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    await saveDeviceKeyRing(ring);

    const loaded = await loadDeviceKeyRing();
    expect(loaded).not.toBeNull();
    expect(loaded?.epoch).toBe(1);
    expect(loaded?.contentKey.extractable).toBe(false);
    expect(await roundTripsAProbe(loaded!.contentKey)).toBe(true);
  });

  it('exposes the loaded ring synchronously via deviceKeyProvider', async () => {
    expect(deviceKeyProvider.current()).toBeNull();
    const ring = await deriveKeyRing(generateMasterSecret(), 2);
    await saveDeviceKeyRing(ring);
    expect(deviceKeyProvider.current()?.epoch).toBe(2);
  });

  it('forgets the ring without leaving it retrievable', async () => {
    await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));
    await forgetDeviceKeyRing();
    expect(await loadDeviceKeyRing()).toBeNull();
    expect(deviceKeyProvider.current()).toBeNull();
  });

  it('notifies ring-change subscribers on save, load and forget', async () => {
    let calls = 0;
    const stop = onDeviceKeyRingChange(() => {
      calls += 1;
    });
    await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));
    await loadDeviceKeyRing();
    await forgetDeviceKeyRing();
    expect(calls).toBe(3);
    stop();
    await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));
    expect(calls).toBe(3); // unsubscribed
  });

  it('bumps the device-key revision on each cache transition', async () => {
    // Acquiring a key changes no IndexedDB content row, so encrypted live queries
    // need this monotonic bump to re-run. It must move on save, load, and forget.
    const before = getDeviceKeyRevision();
    await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));
    const afterSave = getDeviceKeyRevision();
    expect(afterSave).toBeGreaterThan(before);

    await loadDeviceKeyRing();
    const afterLoad = getDeviceKeyRevision();
    expect(afterLoad).toBeGreaterThan(afterSave);

    await forgetDeviceKeyRing();
    expect(getDeviceKeyRevision()).toBeGreaterThan(afterLoad);
  });
});
