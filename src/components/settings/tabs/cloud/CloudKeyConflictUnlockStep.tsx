import { type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { SecretField } from './SecretField';

export interface CloudKeyConflictUnlockStepProps {
  value: string;
  error: string | null;
  busy: boolean;
  onValue: (value: string) => void;
  onSubmit: (event: SyntheticEvent) => void;
  onNoPassphrase: () => void;
}

/** Step one of resolving a key conflict: unlock with the account passphrase. */
export const CloudKeyConflictUnlockStep = ({
  value,
  error,
  busy,
  onValue,
  onSubmit,
  onNoPassphrase,
}: CloudKeyConflictUnlockStepProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.conflict.${name}`);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{k('unlockTitle')}</DialogTitle>
        <DialogDescription>{k('unlockDescription')}</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
        <SecretField
          label={k('unlockLabel')}
          value={value}
          onValue={onValue}
          error={error !== null}
          autoFocus
          data-testid="cloud-conflict-passphrase"
        />
        {error !== null ? (
          <p role="alert" className="text-[12px] text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-[12px] text-ink-3 underline underline-offset-2"
            onClick={onNoPassphrase}
          >
            {k('noPassphrase')}
          </button>
          <Button
            kind="primary"
            size="sm"
            type="submit"
            disabled={value.length === 0 || busy}
            data-testid="cloud-conflict-unlock"
          >
            {k('unlockSubmit')}
          </Button>
        </div>
      </form>
    </>
  );
};
