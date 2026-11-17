import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

export interface RecoveryCodeDialogProps {
  code: string;
  open: boolean;
  onDone: () => void;
}

/**
 * Shows the recovery code exactly once. The dialog cannot be dismissed until the
 * user confirms they have stored it, so the code is never lost silently.
 */
export const RecoveryCodeDialog = ({ code, open, onDone }: RecoveryCodeDialogProps) => {
  const { t } = useTranslation('screens');
  const [confirmed, setConfirmed] = useState(false);
  const k = (name: string) => t(`settings.cloud.recovery.${name}`);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && confirmed) onDone();
      }}
    >
      <DialogContent data-testid="recovery-code-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{k('title')}</DialogTitle>
          <DialogDescription>{k('description')}</DialogDescription>
        </DialogHeader>
        <p
          data-testid="recovery-code"
          className="select-all border border-rule bg-paper-2 p-3 font-mono text-[14px] tracking-wide text-ink"
        >
          {code}
        </p>
        <p className="font-serif text-[13px] text-ink-2">{k('passphraseNote')}</p>
        <p className="font-serif text-[13px] text-ink-2">{k('codeNote')}</p>
        <Checkbox
          data-testid="recovery-confirm"
          label={k('confirmStored')}
          checked={confirmed}
          onChange={(e) => {
            setConfirmed(e.target.checked);
          }}
        />
        <div className="flex justify-end">
          <Button
            kind="primary"
            size="sm"
            disabled={!confirmed}
            onClick={onDone}
            data-testid="recovery-done"
          >
            {k('done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
