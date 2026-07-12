import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Step = 'unlock' | 'erase';

export interface KeyConflictResolutionArgs {
  onAdopt: (passphrase: string) => Promise<void>;
  onErase: () => Promise<void>;
  onResolved: () => void;
  onClose: () => void;
}

/** State machine behind {@link CloudKeyConflictDialog}: the two steps, the busy
 *  flag, and the adopt/erase actions with inline-error handling. */
export const useKeyConflictResolution = ({
  onAdopt,
  onErase,
  onResolved,
  onClose,
}: KeyConflictResolutionArgs) => {
  const { t } = useTranslation('screens');
  const [step, setStep] = useState<Step>('unlock');
  const [value, setValue] = useState('');
  const [eraseConfirm, setEraseConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Typing this word arms the destructive erase (mirrors typing a space's name to
  // delete it), so it can never fire on a single accidental click.
  const eraseWord = t('settings.account.cloud.conflict.eraseWord');
  const canErase =
    eraseConfirm.trim().toUpperCase() === eraseWord.toUpperCase() && !busy;

  const finish = (): void => {
    onResolved();
    onClose();
    setStep('unlock');
    setValue('');
    setEraseConfirm('');
    setError(null);
  };
  const submitUnlock = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (value.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    void onAdopt(value)
      .then(finish)
      .catch(() => {
        setError(t('settings.account.cloud.conflict.unlockWrong'));
      })
      .finally(() => {
        setBusy(false);
      });
  };
  const confirmErase = (): void => {
    if (!canErase) return;
    setBusy(true);
    void onErase()
      .then(finish)
      .finally(() => {
        setBusy(false);
      });
  };
  const showStep = (next: Step): void => {
    setStep(next);
    setEraseConfirm('');
    setError(null);
  };
  return {
    step, value, eraseConfirm, eraseWord, canErase, error, busy,
    setValue, setEraseConfirm, submitUnlock, confirmErase, showStep,
  };
};
