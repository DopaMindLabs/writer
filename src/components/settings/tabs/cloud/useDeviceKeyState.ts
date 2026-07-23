import { useEffect, useState } from 'react';
import { deviceKeyProvider, forgetThisDevice } from '@/lib/cloud/cloudClient';
import { useDeviceKeyRevision } from '@/hooks/useDeviceKeyRevision';

export interface DeviceKeyState {
  hasKey: boolean;
  refreshKey: () => void;
  onKeyAcquired: () => void;
  onForget: () => void;
}

/**
 * Tracks whether this device holds a cloud key. Recomputes whenever the device
 * key ring changes — including a cross-tab unlock or forget, which reloads the
 * provider and bumps the revision but never touches the panel's own handlers.
 * Without this an open panel keeps showing keyless setup/unlock controls after
 * another tab has already unlocked.
 */
export const useDeviceKeyState = (): DeviceKeyState => {
  const [hasKey, setHasKey] = useState(() => deviceKeyProvider.current() !== null);

  const keyRevision = useDeviceKeyRevision();
  useEffect(() => {
    setHasKey(deviceKeyProvider.current() !== null);
  }, [keyRevision]);

  const refreshKey = () => {
    setHasKey(deviceKeyProvider.current() !== null);
  };
  const onKeyAcquired = () => {
    setHasKey(true);
  };
  const onForget = () => {
    void forgetThisDevice().then(() => {
      setHasKey(false);
    });
  };

  return { hasKey, refreshKey, onKeyAcquired, onForget };
};
