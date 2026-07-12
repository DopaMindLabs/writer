import type { DXCUserInteraction } from '@/lib/cloud/cloudClient';
import { CloudLoginDialog } from './CloudLoginDialog';
import { PassphraseSetupDialog } from './PassphraseSetupDialog';
import { PassphraseUnlockDialog } from './PassphraseUnlockDialog';
import { RecoveryCodeDialog } from './RecoveryCodeDialog';

export type CloudDialogName = 'none' | 'setup' | 'unlock';

export interface CloudSectionDialogsProps {
  dialog: CloudDialogName;
  setDialog: (dialog: CloudDialogName) => void;
  recoveryCode: string | null;
  setRecoveryCode: (code: string | null) => void;
  onKeyAcquired: () => void;
  interaction: DXCUserInteraction | null;
}

/** The dialog stack behind the cloud section: set-up, unlock, recovery, login. */
export const CloudSectionDialogs = ({
  dialog,
  setDialog,
  recoveryCode,
  setRecoveryCode,
  onKeyAcquired,
  interaction,
}: CloudSectionDialogsProps) => (
  <>
    <PassphraseSetupDialog
      open={dialog === 'setup'}
      onOpenChange={(open) => {
        setDialog(open ? 'setup' : 'none');
      }}
      onRecoveryCode={(code) => {
        onKeyAcquired();
        setRecoveryCode(code);
      }}
    />
    <PassphraseUnlockDialog
      open={dialog === 'unlock'}
      onOpenChange={(open) => {
        setDialog(open ? 'unlock' : 'none');
      }}
      onUnlocked={onKeyAcquired}
    />
    <RecoveryCodeDialog
      open={recoveryCode !== null}
      code={recoveryCode ?? ''}
      onDone={() => {
        setRecoveryCode(null);
      }}
    />
    <CloudLoginDialog interaction={interaction} />
  </>
);
