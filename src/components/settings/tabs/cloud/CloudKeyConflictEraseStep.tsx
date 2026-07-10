import { useTranslation } from 'react-i18next';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Label } from '@/components/ui/Label';
import { InlineBanner } from '@/components/ui/InlineBanner';

export interface CloudKeyConflictEraseStepProps {
  busy: boolean;
  eraseWord: string;
  confirmValue: string;
  canErase: boolean;
  onConfirmValue: (value: string) => void;
  onBack: () => void;
  onErase: () => void;
}

/** Step two (the escape hatch): erase the account's copy when the passphrase is
 *  lost. Its own surface, so the destructive action is never beside the unlock,
 *  and — because it is irreversible — it is armed only by typing a confirmation
 *  word, the same deliberate gesture used to delete a space. */
export const CloudKeyConflictEraseStep = ({
  busy,
  eraseWord,
  confirmValue,
  canErase,
  onConfirmValue,
  onBack,
  onErase,
}: CloudKeyConflictEraseStepProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.conflict.${name}`);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{k('eraseTitle')}</DialogTitle>
        <DialogDescription>{k('eraseBody')}</DialogDescription>
      </DialogHeader>

      <InlineBanner
        kind="error"
        className="mt-3"
        title={k('eraseWarningTitle')}
        data-testid="cloud-conflict-erase-warning"
      >
        {k('eraseWarningBody')}
      </InlineBanner>

      <div className="mt-4">
        <Label htmlFor="cloud-conflict-erase-input" weight="regular">
          {t('settings.account.cloud.conflict.eraseConfirmLabel', { word: eraseWord })}
        </Label>
        <TextField
          id="cloud-conflict-erase-input"
          data-testid="cloud-conflict-erase-input"
          value={confirmValue}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { onConfirmValue(e.target.value); }}
          className="mt-1"
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button kind="secondary" size="sm" onClick={onBack}>
          {k('eraseBack')}
        </Button>
        <Button
          kind="dangerous"
          size="sm"
          disabled={!canErase || busy}
          data-testid="cloud-conflict-erase"
          onClick={onErase}
        >
          {k('eraseConfirm')}
        </Button>
      </div>
    </>
  );
};
