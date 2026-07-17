import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { TypographyLabel } from '@/components/ui/typography';
import { CloudDeviceResetControl } from './CloudDeviceResetControl';

export interface CloudKeyErrorScreenProps {
  /** Take the user to the place they can unlock with the right passphrase. */
  onUnlock: () => void;
  /** Forget this device's key and erase its local data (destructive, awaited). */
  onReset: () => Promise<void>;
}

/**
 * Recovery surface shown when a synced row cannot be decrypted with the key this
 * device holds. One prominent way forward — unlock with the right passphrase —
 * and one guarded, destructive fallback (the reset control) for when that
 * passphrase is gone.
 */
export const CloudKeyErrorScreen = ({
  onUnlock,
  onReset,
}: CloudKeyErrorScreenProps) => {
  const { t } = useTranslation('app');
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        <TypographyLabel variant="xs">{t('cloudKeyErrorLabel')}</TypographyLabel>
        <InlineBanner
          kind="warning"
          title={t('cloudKeyErrorTitle')}
          className="mt-3"
        >
          {t('cloudKeyErrorBody')}
        </InlineBanner>
        <div className="mt-4 flex flex-col gap-2">
          <Button kind="primary" size="sm" onClick={onUnlock}>
            {t('cloudKeyErrorUnlockAction')}
          </Button>
          <CloudDeviceResetControl onReset={onReset} />
        </div>
      </div>
    </div>
  );
};
