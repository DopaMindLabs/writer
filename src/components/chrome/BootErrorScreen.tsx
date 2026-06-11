import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TypographyLabel,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';

export interface BootErrorScreenProps {
  error: Error;
  onReset: () => void;
}
export const BootErrorScreen = ({ error, onReset }: BootErrorScreenProps) => {
  const { t } = useTranslation('app');
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div>
        <TypographyLabel variant="xs">{t('bootErrorLabel')}</TypographyLabel>
        <TypographyP variant="empty" className="mt-2">
          {error.message}
        </TypographyP>
        <TypographyMuted variant="xs" className="mt-4">
          {t('bootErrorResetHint')}
        </TypographyMuted>
        <Button
          kind="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            setConfirmOpen(true);
          }}
        >
          {t('bootErrorResetAction')}
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t('bootErrorResetTitle')}
          description={t('bootErrorResetBody')}
          confirmLabel={t('bootErrorResetConfirm')}
          cancelLabel={t('bootErrorResetCancel')}
          confirmKind="dangerous"
          onConfirm={onReset}
        />
      </div>
    </div>
  );
};
