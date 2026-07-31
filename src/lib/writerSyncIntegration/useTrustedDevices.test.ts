import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asPrincipalId,
  type TrustedDeviceRecord,
} from 'writer-sync/core';
import { db } from '@/db/db';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import { useTrustedDevices } from './useTrustedDevices';

/**
 * What the settings list is allowed to show, and when.
 *
 * The hook resolves this device's identity and principal outside its live query
 * — both are writes, and Dexie refuses a readwrite transaction inside a
 * live-query callback — so "which of these is me" and "whose devices are these"
 * arrive on a different tick from the rows themselves.
 */

const PRINCIPAL = 'person-1';
const OTHER_PRINCIPAL = asPrincipalId('person-2');

// The factory is hoisted above every binding in this file, so the principal is
// written out rather than shared with `PRINCIPAL`.
vi.mock('@/lib/profile/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'person-1',
    displayName: 'A. Writer',
    presenceHue: 'presence-1',
  }),
}));

const recordFor = (
  overrides: Partial<TrustedDeviceRecord> = {},
): TrustedDeviceRecord => ({
  deviceId: asDeviceId('AAECAwQFBgcICQoLDA0ODw'),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
  principalId: asPrincipalId(PRINCIPAL),
  addedAt: 1_700_000_000_000,
  displayName: 'Laptop',
  status: TrustedDeviceStatus.Active,
  acknowledgedOperations: {},
  ...overrides,
});

beforeEach(async () => {
  await db.trustedDevices.clear();
  await deviceIdentityStore.forget();
});

describe('useTrustedDevices', () => {
  it('shows nothing until this device knows who it is', async () => {
    const { result } = renderHook(() => useTrustedDevices());

    // Not an empty list: a list would render "no paired devices" over a table
    // that has simply not been read yet.
    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('lists this principal’s devices oldest first, marking this one', async () => {
    const here = String((await deviceIdentityStore.load()).deviceId);
    await db.trustedDevices.bulkPut([
      recordFor({
        deviceId: asDeviceId('newer-peer'),
        displayName: 'Phone',
        addedAt: 1_700_000_002_000,
        lastSessionAt: 1_700_000_003_000,
      }),
      recordFor({ deviceId: asDeviceId(here), displayName: 'This laptop' }),
    ]);

    const { result } = renderHook(() => useTrustedDevices());

    await waitFor(() => {
      expect(result.current).toEqual([
        {
          deviceId: here,
          displayName: 'This laptop',
          addedAt: 1_700_000_000_000,
          lastSessionAt: undefined,
          isThisDevice: true,
          isRevoked: false,
        },
        {
          deviceId: 'newer-peer',
          displayName: 'Phone',
          addedAt: 1_700_000_002_000,
          lastSessionAt: 1_700_000_003_000,
          isThisDevice: false,
          isRevoked: false,
        },
      ]);
    });
  });

  it('keeps a removed device in the list rather than forgetting it', async () => {
    await db.trustedDevices.put(
      recordFor({
        status: TrustedDeviceStatus.Revoked,
        revokedAt: 1_700_000_004_000,
      }),
    );

    const { result } = renderHook(() => useTrustedDevices());

    // Hiding it would leave the user unable to tell "never paired" from
    // "paired and removed".
    await waitFor(() => {
      expect(result.current).toEqual([
        expect.objectContaining({ displayName: 'Laptop', isRevoked: true }),
      ]);
    });
  });

  it('never shows a device belonging to someone else', async () => {
    await db.trustedDevices.bulkPut([
      recordFor({ deviceId: asDeviceId('mine'), displayName: 'Mine' }),
      recordFor({
        deviceId: asDeviceId('theirs'),
        displayName: 'Theirs',
        principalId: OTHER_PRINCIPAL,
      }),
    ]);

    const { result } = renderHook(() => useTrustedDevices());

    await waitFor(() => {
      expect(result.current?.map((entry) => entry.displayName)).toEqual(['Mine']);
    });
  });
});
