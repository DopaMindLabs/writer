import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SecretField } from './SecretField';

export interface PassphraseUnlockFieldsProps {
  value: string;
  isRecovery: boolean;
  error: string | null;
  canSubmit: boolean;
  onValue: (value: string) => void;
  onToggle: () => void;
}

/** Presentational body of the unlock form (passphrase or recovery-code mode). */
export const PassphraseUnlockFields = ({
  value,
  isRecovery,
  error,
  canSubmit,
  onValue,
  onToggle,
}: PassphraseUnlockFieldsProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.unlockDialog.${name}`);
  return (
    <>
      {error !== null ? (
        <InlineBanner kind="error" data-testid="unlock-error">
          {error}
        </InlineBanner>
      ) : null}
      <SecretField
        label={isRecovery ? k('recoveryLabel') : k('label')}
        type={isRecovery ? 'text' : 'password'}
        value={value}
        error={error !== null}
        autoFocus
        data-testid="unlock-input"
        onValue={onValue}
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          kind="ghost"
          size="sm"
          type="button"
          data-testid="unlock-use-recovery"
          onClick={onToggle}
        >
          {isRecovery ? k('cancel') : k('useRecovery')}
        </Button>
        <Button
          kind="primary"
          size="sm"
          type="submit"
          disabled={!canSubmit}
          data-testid="unlock-submit"
        >
          {isRecovery ? k('recoverySubmit') : k('submit')}
        </Button>
      </div>
    </>
  );
};
