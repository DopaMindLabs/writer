import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  unlockCloudEncryption,
  recoverCloudEncryption,
  EscrowMissingError,
  WrongPassphraseError,
} from '@/lib/cloud/cloudClient';
import { PassphraseUnlockFields } from './PassphraseUnlockFields';

type Mode = 'passphrase' | 'recovery';

/**
 * The i18n suffix for an unlock failure. A missing escrow (no key has arrived on
 * this device yet) is told apart from a genuinely wrong passphrase, and anything
 * unexpected gets a neutral message rather than implying the passphrase is wrong.
 */
const unlockErrorKey = (error: unknown, isRecovery: boolean): string => {
  if (error instanceof EscrowMissingError) return 'noEscrow';
  if (isRecovery) return 'recoveryWrong';
  if (error instanceof WrongPassphraseError) return 'wrong';
  return 'failed';
};

export interface PassphraseUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: () => void;
  /** Injectable for tests/stories; default to the real actions. */
  onUnlock?: (passphrase: string) => Promise<void>;
  onRecover?: (recoveryCode: string) => Promise<void>;
}

/**
 * Unlocks encryption on a device that already has an escrow. A wrong passphrase
 * (or recovery code) surfaces an inline error and leaves the device keyless; a
 * link switches to recovery-code entry.
 */
export const PassphraseUnlockDialog = ({
  open,
  onOpenChange,
  onUnlocked,
  onUnlock = unlockCloudEncryption,
  onRecover = recoverCloudEncryption,
}: PassphraseUnlockDialogProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.unlockDialog.${name}`);
  const [mode, setMode] = useState<Mode>('passphrase');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRecovery = mode === 'recovery';

  const runUnlock = async () => {
    if (value.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await (isRecovery ? onRecover(value) : onUnlock(value));
      onUnlocked();
      onOpenChange(false);
    } catch (err) {
      setError(k(unlockErrorKey(err, isRecovery)));
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void runUnlock();
  };
  const toggleMode = () => {
    setMode(isRecovery ? 'passphrase' : 'recovery');
    setValue('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="passphrase-unlock-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{k('title')}</DialogTitle>
          <DialogDescription>{k('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
          <PassphraseUnlockFields
            value={value}
            isRecovery={isRecovery}
            error={error}
            canSubmit={value.length > 0 && !busy}
            onValue={setValue}
            onToggle={toggleMode}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};
