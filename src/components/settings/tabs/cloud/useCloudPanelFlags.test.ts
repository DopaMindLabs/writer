import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UserLogin } from 'dexie-cloud-addon';

const blocked = { value: false };
vi.mock('./useDeviceSlots', () => ({
  useDeviceLimitBlocked: () => blocked.value,
}));

import { deviceRevokedState } from '@/lib/cloud/deviceRevoked';
import { useCloudPanelFlags } from './useCloudPanelFlags';
import { KeyEscrowPresence } from 'writer-sync/core';

const signedInUser = { isLoggedIn: true } as unknown as UserLogin;

describe('useCloudPanelFlags', () => {
  it('derives the signed-in-keyless and status flags', () => {
    const { result } = renderHook(() =>
      useCloudPanelFlags(signedInUser, false, KeyEscrowPresence.Present),
    );
    expect(result.current).toEqual({
      signedIn: true,
      keylessSignedIn: true,
      showStatus: true,
      deviceLimitBlocked: false,
      deviceRevoked: false,
      showDeviceList: true,
    });
  });

  it('shows status for a keyed signed-out device and never marks it keyless', () => {
    const { result } = renderHook(() => useCloudPanelFlags(undefined, true, KeyEscrowPresence.None));
    expect(result.current).toEqual({
      signedIn: false,
      keylessSignedIn: false,
      showStatus: true,
      deviceLimitBlocked: false,
      deviceRevoked: false,
      // A signed-out device has no account, so there is no device list to show.
      showDeviceList: false,
    });
  });

  it('passes the device-limit block through', () => {
    blocked.value = true;
    const { result } = renderHook(() =>
      useCloudPanelFlags(signedInUser, false, KeyEscrowPresence.Present),
    );
    expect(result.current.deviceLimitBlocked).toBe(true);
    blocked.value = false;
  });

  it('still shows the device list to a blocked device', () => {
    // The blocked device is the one that most needs to free a slot, and the list
    // is the only place it can. Hiding it here would leave that user stranded on
    // the very screen that is meant to unstick them.
    blocked.value = true;
    const { result } = renderHook(() =>
      useCloudPanelFlags(signedInUser, false, KeyEscrowPresence.Present),
    );
    expect(result.current.showDeviceList).toBe(true);
    blocked.value = false;
  });

  it('reports a revoked device once the registrar has seen the tombstone', () => {
    deviceRevokedState.set(true);
    const { result } = renderHook(() =>
      useCloudPanelFlags(signedInUser, true, KeyEscrowPresence.Present),
    );
    expect(result.current.deviceRevoked).toBe(true);
    deviceRevokedState.set(false);
  });
});
