import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  deviceKeyProvider,
  signInToCloud,
  signOutOfCloud,
  forgetThisDevice,
  KeylessSignInBlockedError,
} from '@/lib/cloud/cloudClient';
import { useDeviceKeyRevision } from '@/hooks/useDeviceKeyRevision';
import type { CloudDialogName } from './CloudSectionDialogs';

export interface CloudPanelState {
  dialog: CloudDialogName;
  setDialog: (dialog: CloudDialogName) => void;
  recoveryCode: string | null;
  setRecoveryCode: (code: string | null) => void;
  hasKey: boolean;
  refreshKey: () => void;
  openSetup: () => void;
  openUnlock: () => void;
  onKeyAcquired: () => void;
  signInError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onForget: () => void;
}

/**
 * Local state and action handlers for {@link CloudSectionPanel}: the open dialog,
 * the recovery code being shown, whether a device key exists, and sign-in — which
 * surfaces the "set up first" guard (a device with unencrypted writing may not
 * sign in) as a resolved error string. Keeps the panel component a thin render.
 */
export const useCloudPanelState = (): CloudPanelState => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.${name}`);
  const [dialog, setDialog] = useState<CloudDialogName>('none');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(() => deviceKeyProvider.current() !== null);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Recompute whenever the device key ring changes — including a cross-tab unlock
  // or forget, which reloads the provider and bumps the revision but never touches
  // this panel's own handlers. Without this the open panel keeps showing keyless
  // setup/unlock controls after another tab has already unlocked.
  const keyRevision = useDeviceKeyRevision();
  useEffect(() => {
    setHasKey(deviceKeyProvider.current() !== null);
  }, [keyRevision]);

  const refreshKey = () => {
    setHasKey(deviceKeyProvider.current() !== null);
  };
  const openSetup = () => {
    setDialog('setup');
  };
  const openUnlock = () => {
    setDialog('unlock');
  };
  const onKeyAcquired = () => {
    setHasKey(true);
  };
  const onForget = () => {
    void forgetThisDevice().then(() => {
      setHasKey(false);
    });
  };
  const onSignOut = () => {
    void signOutOfCloud();
  };
  const onSignIn = () => {
    setSignInError(null);
    void signInToCloud().catch((error: unknown) => {
      setSignInError(
        k(error instanceof KeylessSignInBlockedError ? 'signInBlocked' : 'signInFailed'),
      );
    });
  };

  return {
    dialog,
    setDialog,
    recoveryCode,
    setRecoveryCode,
    hasKey,
    refreshKey,
    openSetup,
    openUnlock,
    onKeyAcquired,
    signInError,
    onSignIn,
    onSignOut,
    onForget,
  };
};
