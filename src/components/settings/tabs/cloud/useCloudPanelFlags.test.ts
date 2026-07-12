import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UserLogin } from 'dexie-cloud-addon';

const blocked = { value: false };
vi.mock('./useDeviceSlots', () => ({
  useDeviceLimitBlocked: () => blocked.value,
}));

import { useCloudPanelFlags } from './useCloudPanelFlags';

const signedInUser = { isLoggedIn: true } as unknown as UserLogin;

describe('useCloudPanelFlags', () => {
  it('derives the signed-in-keyless and status flags', () => {
    const { result } = renderHook(() =>
      useCloudPanelFlags(signedInUser, false, 'present'),
    );
    expect(result.current).toEqual({
      signedIn: true,
      keylessSignedIn: true,
      showStatus: true,
      deviceLimitBlocked: false,
    });
  });

  it('shows status for a keyed signed-out device and never marks it keyless', () => {
    const { result } = renderHook(() => useCloudPanelFlags(undefined, true, 'none'));
    expect(result.current).toEqual({
      signedIn: false,
      keylessSignedIn: false,
      showStatus: true,
      deviceLimitBlocked: false,
    });
  });

  it('passes the device-limit block through', () => {
    blocked.value = true;
    const { result } = renderHook(() =>
      useCloudPanelFlags(signedInUser, false, 'present'),
    );
    expect(result.current.deviceLimitBlocked).toBe(true);
    blocked.value = false;
  });
});
