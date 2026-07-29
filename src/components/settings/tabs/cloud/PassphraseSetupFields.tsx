import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SecretField } from './SecretField';

export interface PassphraseSetupFieldsProps {
  passphrase: string;
  confirm: string;
  feedback: string;
  tooShort: boolean;
  mismatch: boolean;
  canSubmit: boolean;
  onPassphrase: (value: string) => void;
  onConfirm: (value: string) => void;
}

/** Presentational body of the passphrase set-up form. */
export const PassphraseSetupFields = ({
  passphrase,
  confirm,
  feedback,
  tooShort,
  mismatch,
  canSubmit,
  onPassphrase,
  onConfirm,
}: PassphraseSetupFieldsProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.passphrase.${name}`);
  return (
    <>
      <SecretField
        label={k('label')}
        placeholder={k('placeholder')}
        value={passphrase}
        error={tooShort}
        autoFocus
        data-testid="passphrase-input"
        onValue={onPassphrase}
      />
      <SecretField
        label={k('confirmLabel')}
        value={confirm}
        error={mismatch}
        data-testid="passphrase-confirm"
        onValue={onConfirm}
      />
      <p className="text-[12px] text-ink-3" data-testid="passphrase-feedback">
        {feedback}
      </p>
      <div className="flex justify-end">
        <Button
          kind="primary"
          size="sm"
          type="submit"
          disabled={!canSubmit}
          data-testid="passphrase-submit"
        >
          {k('submit')}
        </Button>
      </div>
    </>
  );
};
