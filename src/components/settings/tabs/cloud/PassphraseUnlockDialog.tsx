import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PassphraseUnlockFields } from './PassphraseUnlockFields';
import { usePassphraseUnlockForm, type UnlockAction } from './usePassphraseUnlockForm';

export interface PassphraseUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: () => void;
  /** Injectable for tests/stories; default to the provider's key delivery. */
  onUnlock?: UnlockAction;
  onRecover?: UnlockAction;
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
  onUnlock,
  onRecover,
}: PassphraseUnlockDialogProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.unlockDialog.${name}`);
  const form = usePassphraseUnlockForm({
    injected: { onUnlock, onRecover },
    onUnlocked,
    onOpenChange,
    errorLabel: k,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="passphrase-unlock-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{k('title')}</DialogTitle>
          <DialogDescription>{k('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.onSubmit} className="mt-1 flex flex-col gap-4">
          <PassphraseUnlockFields
            value={form.value}
            isRecovery={form.isRecovery}
            error={form.error}
            canSubmit={form.canSubmit}
            onValue={form.setValue}
            onToggle={form.toggleMode}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};
