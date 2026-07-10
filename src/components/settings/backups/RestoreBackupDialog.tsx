import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

interface RestoreBackupDialogProps {
  open: boolean;
  busy: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
}

export const RestoreBackupDialog = ({
  open,
  busy,
  onOpenChange,
  onConfirm,
}: RestoreBackupDialogProps) => {
  const { t } = useTranslation('screens');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {t('settings.space.backups.restoreDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.space.backups.restoreDialogBody')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2">
          <Button
            data-testid="restore-backup-dialog-cancel"
            kind="secondary"
            disabled={busy}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('settings.space.backups.restoreCancel')}
          </Button>
          <Button
            data-testid="restore-backup-dialog-confirm"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy
              ? t('settings.space.backups.restoring')
              : t('settings.space.backups.restoreConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
