import { useTranslation } from 'react-i18next';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

export interface CloudKeyConflictEraseStepProps {
  busy: boolean;
  onBack: () => void;
  onErase: () => void;
}

/** Step two (the escape hatch): erase the account's copy when the passphrase is
 *  lost. Its own surface, so the destructive action is never beside the unlock. */
export const CloudKeyConflictEraseStep = ({
  busy,
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
      <div className="mt-2 flex justify-end gap-2">
        <Button kind="secondary" size="sm" onClick={onBack}>
          {k('eraseBack')}
        </Button>
        <Button
          kind="dangerous"
          size="sm"
          disabled={busy}
          data-testid="cloud-conflict-erase"
          onClick={onErase}
        >
          {k('eraseConfirm')}
        </Button>
      </div>
    </>
  );
};
