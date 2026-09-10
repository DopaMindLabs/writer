import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  signInToCloud,
  signOutOfCloud,
  requestCloudSync,
  KeylessSignInBlockedError,
} from '@/lib/cloud/cloudClient';
import { useDeviceKeyState, type DeviceKeyState } from './useDeviceKeyState';
import type { CloudDialogName } from './CloudSectionDialogs';

export interface CloudPanelState extends DeviceKeyState {
  dialog: CloudDialogName;
  setDialog: (dialog: CloudDialogName) => void;
  recoveryCode: string | null;
  setRecoveryCode: (code: string | null) => void;
  openSetup: () => void;
  openUnlock: () => void;
  signInError: string | null;
  onSignIn: () => void;
  onSignInConfirmed: () => void;
  onSignOut: () => void;
  onRetry: () => void;
}

/**
 * Local state and action handlers for {@link CloudSectionPanel}: the open dialog,
 * the recovery code being shown, whether a device key exists, and sign-in — which
 * first opens the evaluation-account acknowledgement and, once confirmed,
 * surfaces the "set up first" guard (a device with unencrypted writing may not
 * sign in) as a resolved error string. Keeps the panel component a thin render.
 */
export const useCloudPanelState = (): CloudPanelState => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.${name}`);
  const [dialog, setDialog] = useState<CloudDialogName>('none');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const deviceKey = useDeviceKeyState();

  const openSetup = () => {
    setDialog('setup');
  };
  const openUnlock = () => {
    setDialog('unlock');
  };
  const onSignOut = () => {
    void signOutOfCloud();
  };
  const onRetry = () => {
    void requestCloudSync();
  };
  const onSignIn = () => {
    setSignInError(null);
    setDialog('signInAck');
  };
  const onSignInConfirmed = () => {
    setDialog('none');
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
    ...deviceKey,
    openSetup,
    openUnlock,
    signInError,
    onSignIn,
    onSignInConfirmed,
    onSignOut,
    onRetry,
  };
};
