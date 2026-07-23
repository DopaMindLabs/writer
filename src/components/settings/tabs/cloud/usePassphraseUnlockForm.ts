import { useState, type SyntheticEvent } from 'react';
import { EscrowMissingError } from '@/lib/cloud/crypto/errors';
import { WrongPassphraseError } from '@/lib/cloud/crypto/keys';
import type { KeyDeliveryAdapter } from '@/lib/syncProviders/types';
import { useDefaultSyncCapability } from '@/lib/writerSync/syncCoordinatorContext';

type Mode = 'passphrase' | 'recovery';

export type UnlockAction = (value: string) => Promise<void>;

export interface PassphraseUnlockForm {
  value: string;
  isRecovery: boolean;
  error: string | null;
  canSubmit: boolean;
  setValue: (value: string) => void;
  onSubmit: (event: SyntheticEvent) => void;
  toggleMode: () => void;
}

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

/**
 * The action the submit runs. An injected prop wins — that is how tests and
 * stories drive the dialog; otherwise it comes from whichever provider delivers
 * keys, and is absent when none does.
 */
const resolveSubmit = (options: {
  isRecovery: boolean;
  injected: UnlockAction | undefined;
  keyDelivery: KeyDeliveryAdapter | undefined;
}): UnlockAction | undefined => {
  const { isRecovery, injected, keyDelivery } = options;
  if (injected) return injected;
  return isRecovery ? keyDelivery?.recover : keyDelivery?.unlock;
};

/**
 * The unlock dialog's state machine: which entry mode is showing, the value, the
 * in-flight guard, and the inline error a failed attempt leaves behind. Kept
 * apart from the dialog so the component stays a render.
 */
export const usePassphraseUnlockForm = (options: {
  injected: { onUnlock?: UnlockAction; onRecover?: UnlockAction };
  onUnlocked: () => void;
  onOpenChange: (open: boolean) => void;
  errorLabel: (key: string) => string;
}): PassphraseUnlockForm => {
  const { injected, onUnlocked, onOpenChange, errorLabel } = options;
  const keyDelivery = useDefaultSyncCapability('keyDelivery');
  const [mode, setMode] = useState<Mode>('passphrase');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRecovery = mode === 'recovery';

  const submit = resolveSubmit({
    isRecovery,
    injected: isRecovery ? injected.onRecover : injected.onUnlock,
    keyDelivery,
  });

  const run = async () => {
    if (value.length === 0 || busy || !submit) return;
    setBusy(true);
    setError(null);
    try {
      await submit(value);
      onUnlocked();
      onOpenChange(false);
    } catch (err) {
      setError(errorLabel(unlockErrorKey(err, isRecovery)));
    } finally {
      setBusy(false);
    }
  };

  return {
    value,
    isRecovery,
    error,
    canSubmit: value.length > 0 && !busy,
    setValue,
    onSubmit: (event: SyntheticEvent) => {
      event.preventDefault();
      void run();
    },
    toggleMode: () => {
      setMode(isRecovery ? 'passphrase' : 'recovery');
      setValue('');
      setError(null);
    },
  };
};
