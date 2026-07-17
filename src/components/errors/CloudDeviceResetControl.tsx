import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CloudResetErrorBanner } from './CloudResetErrorBanner';

/**
 * The guarded, destructive "reset this device" control: a confirmation dialog, an
 * in-flight disabled state, and a retryable error banner when the awaited reset
 * fails. Owns its own pending/failed state so the parent stays presentational.
 */
export const CloudDeviceResetControl = ({
  onReset,
}: {
  onReset: () => Promise<void>;
}) => {
  const { t } = useTranslation('app');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const runReset = async (): Promise<void> => {
    setPending(true);
    setFailed(false);
    try {
      await onReset();
      // On success the caller reloads; leave pending set so nothing re-arms.
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <>
      {failed && !pending ? (
        <CloudResetErrorBanner
          onRetry={() => {
            void runReset();
          }}
        />
      ) : null}
      <Button
        kind="secondary"
        size="sm"
        disabled={pending}
        onClick={() => {
          setConfirmOpen(true);
        }}
      >
        {t('cloudKeyErrorResetAction')}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('cloudKeyErrorResetTitle')}
        description={t('cloudKeyErrorResetBody')}
        confirmLabel={t('cloudKeyErrorResetConfirm')}
        cancelLabel={t('cloudKeyErrorResetCancel')}
        confirmKind="dangerous"
        onConfirm={() => {
          void runReset();
        }}
      />
    </>
  );
};
