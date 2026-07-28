import { beforeEach, describe, expect, it } from 'vitest';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  isTrustedForSession,
  type TrustedDeviceRecord,
} from 'writer-sync/core';
import { db } from '@/db/db';
import { createTrustedDeviceStore } from './trustedDeviceStore';

const PRINCIPAL = asPrincipalId('person-1');
const OTHER_PRINCIPAL = asPrincipalId('person-2');
const DEVICE = asDeviceId('AAECAwQFBgcICQoLDA0ODw');

const recordFor = (
  overrides: Partial<TrustedDeviceRecord> = {},
): TrustedDeviceRecord => ({
  deviceId: DEVICE,
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
  principalId: PRINCIPAL,
  addedAt: 1_700_000_000_000,
  displayName: 'Laptop',
  status: TrustedDeviceStatus.Active,
  acknowledgedOperations: {},
  ...overrides,
});

const store = createTrustedDeviceStore(db);

beforeEach(async () => {
  await db.trustedDevices.clear();
});

describe('trust', () => {
  it('remembers a newly paired device', async () => {
    await store.trust(recordFor());
    expect(await store.find(DEVICE)).toMatchObject({
      deviceId: DEVICE,
      displayName: 'Laptop',
      status: TrustedDeviceStatus.Active,
    });
  });

  it('refuses to overwrite an existing device', async () => {
    // Re-pairing is a session, not a new trust relationship. Overwriting would
    // let a peer replace the identity key an earlier pairing established.
    await store.trust(recordFor());
    await expect(
      store.trust(recordFor({ publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'ZZ', y: 'YY' } })),
    ).rejects.toThrow();
    expect((await store.find(DEVICE))?.publicIdentityJwk).toMatchObject({ x: 'aQ' });
  });

  it('refuses to re-trust a revoked device', async () => {
    await store.trust(recordFor());
    await store.revoke({ deviceId: DEVICE, at: 1_700_000_100_000 });
    await expect(store.trust(recordFor())).rejects.toThrow();
  });
});

describe('find', () => {
  it('returns null for a device that has never paired', async () => {
    expect(await store.find(asDeviceId('unknown-device-id'))).toBeNull();
  });
});

describe('list', () => {
  it('returns only the given principal’s devices', async () => {
    await store.trust(recordFor());
    await store.trust(
      recordFor({ deviceId: asDeviceId('other'), principalId: OTHER_PRINCIPAL }),
    );
    const mine = await store.list(PRINCIPAL);
    expect(mine.map((record) => String(record.deviceId))).toEqual([String(DEVICE)]);
  });

  it('includes revoked devices, so the UI can show them as removed', async () => {
    await store.trust(recordFor());
    await store.revoke({ deviceId: DEVICE, at: 1_700_000_100_000 });
    const listed = await store.list(PRINCIPAL);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe(TrustedDeviceStatus.Revoked);
  });
});

describe('recordSession', () => {
  it('stamps the last successful session', async () => {
    await store.trust(recordFor());
    await store.recordSession({ deviceId: DEVICE, at: 1_700_000_500_000 });
    expect((await store.find(DEVICE))?.lastSessionAt).toBe(1_700_000_500_000);
  });

  it('does nothing for an unknown device rather than creating one', async () => {
    await store.recordSession({ deviceId: asDeviceId('ghost'), at: 1 });
    expect(await store.find(asDeviceId('ghost'))).toBeNull();
  });
});

describe('revoke', () => {
  it('marks the record revoked and stamps when', async () => {
    await store.trust(recordFor());
    await store.revoke({ deviceId: DEVICE, at: 1_700_000_100_000 });
    const found = await store.find(DEVICE);
    expect(found?.status).toBe(TrustedDeviceStatus.Revoked);
    expect(found?.revokedAt).toBe(1_700_000_100_000);
  });

  it('keeps the record rather than deleting it', async () => {
    // Deleting would let the same identity pair again as though it were new.
    await store.trust(recordFor());
    await store.revoke({ deviceId: DEVICE, at: 1_700_000_100_000 });
    expect(await store.find(DEVICE)).not.toBeNull();
  });

  it('makes the device fail the session check', async () => {
    await store.trust(recordFor());
    expect(isTrustedForSession(await store.find(DEVICE))).toBe(true);
    await store.revoke({ deviceId: DEVICE, at: 1_700_000_100_000 });
    expect(isTrustedForSession(await store.find(DEVICE))).toBe(false);
  });
});

const ORIGIN = asDeviceId('origin-device-a');
const OTHER_ORIGIN = asDeviceId('origin-device-b');

describe('acknowledge', () => {
  it('records how far the peer has read each origin, per scope', async () => {
    await store.trust(recordFor());
    await store.acknowledge({
      deviceId: DEVICE,
      accessScopeId: 'space-1',
      originDeviceId: ORIGIN,
      operationId: asOperationId('op-1'),
    });
    await store.acknowledge({
      deviceId: DEVICE,
      accessScopeId: 'space-2',
      originDeviceId: ORIGIN,
      operationId: asOperationId('op-2'),
    });
    expect((await store.find(DEVICE))?.acknowledgedOperations).toEqual({
      'space-1': { 'origin-device-a': 'op-1' },
      'space-2': { 'origin-device-a': 'op-2' },
    });
  });

  it('advances a scope without disturbing the others', async () => {
    await store.trust(recordFor());
    await store.acknowledge({
      deviceId: DEVICE,
      accessScopeId: 'space-1',
      originDeviceId: ORIGIN,
      operationId: asOperationId('op-1'),
    });
    await store.acknowledge({
      deviceId: DEVICE,
      accessScopeId: 'space-1',
      originDeviceId: ORIGIN,
      operationId: asOperationId('op-9'),
    });
    expect((await store.find(DEVICE))?.acknowledgedOperations).toEqual({
      'space-1': { 'origin-device-a': 'op-9' },
    });
  });

  it('advances one origin without disturbing another in the same scope', async () => {
    await store.trust(recordFor());
    await store.acknowledge({
      deviceId: DEVICE,
      accessScopeId: 'space-1',
      originDeviceId: ORIGIN,
      operationId: asOperationId('op-1'),
    });
    await store.acknowledge({
      deviceId: DEVICE,
      accessScopeId: 'space-1',
      originDeviceId: OTHER_ORIGIN,
      operationId: asOperationId('op-2'),
    });
    expect((await store.find(DEVICE))?.acknowledgedOperations).toEqual({
      'space-1': { 'origin-device-a': 'op-1', 'origin-device-b': 'op-2' },
    });
  });
});
