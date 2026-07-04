import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { createCloudEncryption } from '@/lib/cloud/cloudClient';
import { PassphraseSetupFields } from './PassphraseSetupFields';

const MIN_LENGTH = 12;

export interface PassphraseSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecoveryCode: (code: string) => void;
  /** Injectable for tests/stories; defaults to the real setup action. */
  onCreate?: (passphrase: string) => Promise<string>;
}

/** Rough strength band from length and character variety. */
const strengthOf = (pw: string): 'Weak' | 'Fair' | 'Strong' => {
  let score = 0;
  if (pw.length >= MIN_LENGTH) score += 1;
  if (pw.length >= 16) score += 1;
  const varied = /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
  if (varied || /[^a-zA-Z0-9]/.test(pw)) score += 1;
  return score >= 3 ? 'Strong' : score === 2 ? 'Fair' : 'Weak';
};

/**
 * Creates the encryption passphrase on the first device. The passphrase must be
 * at least {@link MIN_LENGTH} characters and match its confirmation before the
 * submit enables; on success the recovery code is handed up.
 */
export const PassphraseSetupDialog = ({
  open,
  onOpenChange,
  onRecoveryCode,
  onCreate = createCloudEncryption,
}: PassphraseSetupDialogProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.passphrase.${name}`);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = passphrase.length > 0 && passphrase.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== passphrase;
  const valid = passphrase.length >= MIN_LENGTH && passphrase === confirm;
  const feedback = tooShort
    ? k('tooShort')
    : mismatch
      ? k('mismatch')
      : `${k('strength')}: ${passphrase ? k(`hint${strengthOf(passphrase)}`) : ''}`;

  const runCreate = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      onRecoveryCode(await onCreate(passphrase));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void runCreate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="passphrase-setup-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{k('title')}</DialogTitle>
          <DialogDescription>{k('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
          <PassphraseSetupFields
            passphrase={passphrase}
            confirm={confirm}
            feedback={feedback}
            tooShort={tooShort}
            mismatch={mismatch}
            canSubmit={valid && !busy}
            onPassphrase={setPassphrase}
            onConfirm={setConfirm}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};
