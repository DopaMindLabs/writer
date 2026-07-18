import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CloudSignInAckFields } from './CloudSignInAckFields';

export interface CloudSignInAckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * The evaluation-account acknowledgement shown before every cloud sign-in.
 * Sign-in cannot proceed until the checkbox is ticked: the user must accept
 * that this is a demo of sync only — the app has no server of its own, the
 * account is a 3-day Dexie Cloud evaluation account created automatically,
 * and synced data may be lost after it expires. The tick is forgotten between
 * openings so every attempt re-acknowledges.
 */
export const CloudSignInAckDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: CloudSignInAckDialogProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.ack.${name}`);
  const [acknowledged, setAcknowledged] = useState(false);
  const close = () => {
    setAcknowledged(false);
    onOpenChange(false);
  };
  const confirm = () => {
    setAcknowledged(false);
    onConfirm();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent data-testid="cloud-signin-ack-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{k('title')}</DialogTitle>
          <DialogDescription>{k('description')}</DialogDescription>
        </DialogHeader>
        <CloudSignInAckFields
          acknowledged={acknowledged}
          onAcknowledged={setAcknowledged}
          onCancel={close}
          onConfirm={confirm}
        />
      </DialogContent>
    </Dialog>
  );
};
