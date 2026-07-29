import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { generateMasterSecret, deriveKeyRing } from './keys';
import {
  saveDeviceKeyRing,
  loadDeviceKeyRing,
  bindDeviceKeyRing,
  forgetDeviceKeyRing,
  invalidateCachedRing,
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
    await saveDeviceKeyRing({ accountId: null, ring });

    const loaded = await loadDeviceKeyRing();
    expect(loaded).not.toBeNull();
    expect(loaded?.epoch).toBe(1);
    expect(loaded?.contentKey.extractable).toBe(false);
    expect(await roundTripsAProbe(loaded!.contentKey)).toBe(true);
  });

  it('exposes the loaded ring synchronously via deviceKeyProvider', async () => {
    expect(deviceKeyProvider.current()).toBeNull();
    const ring = await deriveKeyRing(generateMasterSecret(), 2);
    await saveDeviceKeyRing({ accountId: null, ring });
    expect(deviceKeyProvider.current()?.epoch).toBe(2);
  });

  it('forgets the ring without leaving it retrievable', async () => {
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
    await forgetDeviceKeyRing();
    expect(await loadDeviceKeyRing()).toBeNull();
    expect(deviceKeyProvider.current()).toBeNull();
  });

  it('notifies ring-change subscribers on save, load and forget', async () => {
    let calls = 0;
    const stop = onDeviceKeyRingChange(() => {
      calls += 1;
    });
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
    await loadDeviceKeyRing();
    await forgetDeviceKeyRing();
    expect(calls).toBe(3);
    stop();
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
    expect(calls).toBe(3); // unsubscribed
  });

  it('bumps the device-key revision on each cache transition', async () => {
    // Acquiring a key changes no IndexedDB content row, so encrypted live queries
    // need this monotonic bump to re-run. It must move on save, load, and forget.
    const before = getDeviceKeyRevision();
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
    const afterSave = getDeviceKeyRevision();
    expect(afterSave).toBeGreaterThan(before);

    await loadDeviceKeyRing();
    const afterLoad = getDeviceKeyRevision();
    expect(afterLoad).toBeGreaterThan(afterSave);

    await forgetDeviceKeyRing();
    expect(getDeviceKeyRevision()).toBeGreaterThan(afterLoad);
  });
});

describe('device keyStore account binding', () => {
  beforeEach(async () => {
    await forgetDeviceKeyRing();
  });

  it('stores and exposes the ring account binding synchronously', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    await saveDeviceKeyRing({ accountId: 'acct-a', ring });
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
    await forgetDeviceKeyRing();
    expect(deviceKeyProvider.accountId()).toBeNull();
  });

  it('keeps an unbound (pre-sign-in) ring null until it is claimed', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    expect(deviceKeyProvider.accountId()).toBeNull();

    await bindDeviceKeyRing('acct-a');
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
    // Persisted, not just cached.
    await loadDeviceKeyRing();
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
  });

  it('never rebinds a ring already bound to a different account', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    await saveDeviceKeyRing({ accountId: 'acct-a', ring });
    await bindDeviceKeyRing('acct-b');
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
  });

  it('invalidateCachedRing drops the cache synchronously without deleting the row', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    await saveDeviceKeyRing({ accountId: 'acct-a', ring });

    invalidateCachedRing();
    expect(deviceKeyProvider.current()).toBeNull();
    // The persisted row survives — a reload restores it.
    expect(await loadDeviceKeyRing()).not.toBeNull();
    expect(deviceKeyProvider.accountId()).toBe('acct-a');
  });

  it('rejects a stored ring whose accountId binding is missing (no silent repair)', async () => {
    const ring = await deriveKeyRing(generateMasterSecret(), 1);
    // Write a malformed row directly (no accountId) into the keystore database.
    const raw = new Dexie('lipsum-cloud-keystore');
    raw.version(1).stores({ rings: 'id' });
    raw.version(2).stores({ rings: 'id', pendingEscrows: 'id' });
    await raw.table('rings').put({ id: 'device', ring });
    raw.close();

    await expect(loadDeviceKeyRing()).rejects.toThrow(/accountId/);
  });
});
