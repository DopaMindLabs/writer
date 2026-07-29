import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const {
  current,
  signInToCloud,
  signOutOfCloud,
  forgetThisDevice,
  requestCloudSync,
  revision,
} = vi.hoisted(() => ({
  current: vi.fn<() => unknown>(() => null),
  signInToCloud: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  signOutOfCloud: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  forgetThisDevice: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  requestCloudSync: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  revision: { value: 0 },
}));

vi.mock('@/lib/cloud/cloudClient', () => {
  class KeylessSignInBlockedError extends Error {}
  return {
    deviceKeyProvider: { current },
    signInToCloud,
    signOutOfCloud,
    forgetThisDevice,
    requestCloudSync,
    KeylessSignInBlockedError,
  };
});

vi.mock('@/hooks/useDeviceKeyRevision', () => ({
  useDeviceKeyRevision: () => revision.value,
}));

import { KeylessSignInBlockedError } from '@/lib/cloud/cloudClient';
import { useCloudPanelState } from './useCloudPanelState';

describe('useCloudPanelState', () => {
  beforeEach(() => {
    current.mockReturnValue(null);
    revision.value = 0;
    signInToCloud.mockResolvedValue(undefined);
    signOutOfCloud.mockResolvedValue(undefined);
    forgetThisDevice.mockResolvedValue(undefined);
  });

  it('seeds hasKey from the device key provider', () => {
    current.mockReturnValue({ id: 'k' });
    const keyed = renderHook(() => useCloudPanelState());
    expect(keyed.result.current.hasKey).toBe(true);

    current.mockReturnValue(null);
    const keyless = renderHook(() => useCloudPanelState());
    expect(keyless.result.current.hasKey).toBe(false);
  });

  it('recomputes hasKey when the device key ring changes in another tab', () => {
    current.mockReturnValue(null);
    const { result, rerender } = renderHook(() => useCloudPanelState());
    expect(result.current.hasKey).toBe(false);

    // Another tab unlocks: the shared provider now holds a key and the device-key
    // revision bumps — the open panel must flip to the keyed state on its own.
    current.mockReturnValue({ id: 'k' });
    act(() => {
      revision.value = 1;
    });
    rerender();
    expect(result.current.hasKey).toBe(true);

    // And back to keyless when a tab forgets the key.
    current.mockReturnValue(null);
    act(() => {
      revision.value = 2;
    });
    rerender();
    expect(result.current.hasKey).toBe(false);
  });

  it('opens the setup and unlock dialogs and lets the dialog be set directly', () => {
    const { result } = renderHook(() => useCloudPanelState());
    expect(result.current.dialog).toBe('none');

    act(() => {
      result.current.openSetup();
    });
    expect(result.current.dialog).toBe('setup');

    act(() => {
      result.current.openUnlock();
    });
    expect(result.current.dialog).toBe('unlock');

    act(() => {
      result.current.setDialog('none');
    });
    expect(result.current.dialog).toBe('none');
  });

  it('tracks the recovery code being shown', () => {
    const { result } = renderHook(() => useCloudPanelState());
    expect(result.current.recoveryCode).toBeNull();
    act(() => {
      result.current.setRecoveryCode('WORD-WORD');
    });
    expect(result.current.recoveryCode).toBe('WORD-WORD');
  });

  it('marks a key acquired and refreshes hasKey from the provider', () => {
    const { result } = renderHook(() => useCloudPanelState());
    expect(result.current.hasKey).toBe(false);

    act(() => {
      result.current.onKeyAcquired();
    });
    expect(result.current.hasKey).toBe(true);

    current.mockReturnValue(null);
    act(() => {
      result.current.refreshKey();
    });
    expect(result.current.hasKey).toBe(false);
  });

  it('forgets the device and clears hasKey', async () => {
    current.mockReturnValue({ id: 'k' });
    const { result } = renderHook(() => useCloudPanelState());
    expect(result.current.hasKey).toBe(true);

    act(() => {
      result.current.onForget();
    });
    await waitFor(() => {
      expect(result.current.hasKey).toBe(false);
    });
    expect(forgetThisDevice).toHaveBeenCalledTimes(1);
  });

  it('signs out through the facade', () => {
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onSignOut();
    });
    expect(signOutOfCloud).toHaveBeenCalledTimes(1);
  });

  it('retries a stalled fetch through the facade', () => {
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onRetry();
    });
    expect(requestCloudSync).toHaveBeenCalledTimes(1);
  });

  it('opens the acknowledgement dialog on sign-in instead of calling the facade', () => {
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onSignIn();
    });
    expect(result.current.dialog).toBe('signInAck');
    expect(signInToCloud).not.toHaveBeenCalled();
  });

  it('signs in through the facade once the acknowledgement is confirmed', async () => {
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onSignIn();
    });
    act(() => {
      result.current.onSignInConfirmed();
    });
    expect(result.current.dialog).toBe('none');
    await waitFor(() => {
      expect(signInToCloud).toHaveBeenCalledTimes(1);
    });
    expect(result.current.signInError).toBeNull();
  });

  it('maps a blocked sign-in to the "set up first" message', async () => {
    signInToCloud.mockRejectedValue(new KeylessSignInBlockedError());
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onSignInConfirmed();
    });
    await waitFor(() => {
      expect(result.current.signInError).toMatch(/unencrypted writing/i);
    });
  });

  it('maps any other sign-in failure to the generic message', async () => {
    signInToCloud.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onSignInConfirmed();
    });
    await waitFor(() => {
      expect(result.current.signInError).toMatch(/Couldn't sign in/i);
    });
  });

  it('clears a prior error at the start of a fresh sign-in attempt', async () => {
    signInToCloud.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useCloudPanelState());
    act(() => {
      result.current.onSignInConfirmed();
    });
    await waitFor(() => {
      expect(result.current.signInError).not.toBeNull();
    });

    act(() => {
      result.current.onSignIn();
    });
    expect(result.current.signInError).toBeNull();
    expect(result.current.dialog).toBe('signInAck');
  });
});
