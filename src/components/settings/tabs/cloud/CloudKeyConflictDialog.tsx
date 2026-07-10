import { Dialog, DialogContent } from '@/components/ui/dialog';
import { adoptAccountKey, eraseSyncedContent } from '@/lib/cloud/cloudClient';
import { CloudKeyConflictUnlockStep } from './CloudKeyConflictUnlockStep';
import { CloudKeyConflictEraseStep } from './CloudKeyConflictEraseStep';
import { useKeyConflictResolution } from './useKeyConflictResolution';

export interface CloudKeyConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
  /** Injectable for tests/stories; default to the real actions. */
  onAdopt?: (passphrase: string) => Promise<void>;
  onErase?: () => Promise<void>;
}

/**
 * Resolves a key mismatch: the account already holds encrypted notes protected
 * by a passphrase created on another device. One prominent path — unlock with
 * that passphrase and adopt the account key — and a separate, destructive escape
 * hatch for when it is lost. One decision per step.
 */
export const CloudKeyConflictDialog = ({
  open,
  onOpenChange,
  onResolved,
  onAdopt = (passphrase) => adoptAccountKey(passphrase, passphrase),
  onErase = eraseSyncedContent,
}: CloudKeyConflictDialogProps) => {
  const {
    step,
    value,
    eraseConfirm,
    eraseWord,
    canErase,
    error,
    busy,
    setValue,
    setEraseConfirm,
    submitUnlock,
    confirmErase,
    showStep,
  } = useKeyConflictResolution({
    onAdopt,
    onErase,
    onResolved,
    onClose: () => {
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cloud-conflict-dialog" className="max-w-md">
        {step === 'unlock' ? (
          <CloudKeyConflictUnlockStep
            value={value}
            error={error}
            busy={busy}
            onValue={setValue}
            onSubmit={submitUnlock}
            onNoPassphrase={() => {
              showStep('erase');
            }}
          />
        ) : (
          <CloudKeyConflictEraseStep
            busy={busy}
            eraseWord={eraseWord}
            confirmValue={eraseConfirm}
            canErase={canErase}
            onConfirmValue={setEraseConfirm}
            onBack={() => {
              showStep('unlock');
            }}
            onErase={confirmErase}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
