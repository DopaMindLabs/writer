import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

export interface CloudSignInAckFieldsProps {
  acknowledged: boolean;
  onAcknowledged: (acknowledged: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Body of the sign-in acknowledgement: the terms, the tick, and the actions. */
export const CloudSignInAckFields = ({
  acknowledged,
  onAcknowledged,
  onCancel,
  onConfirm,
}: CloudSignInAckFieldsProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.ack.${name}`);
  return (
    <>
      <p className="font-serif text-[13px] text-ink-2">{k('noServer')}</p>
      <p className="font-serif text-[13px] text-ink-2">{k('evaluation')}</p>
      <Checkbox
        data-testid="cloud-signin-ack-checkbox"
        label={k('confirmLabel')}
        checked={acknowledged}
        onChange={(e) => {
          onAcknowledged(e.target.checked);
        }}
      />
      <div className="flex justify-end gap-2">
        <Button
          kind="secondary"
          size="sm"
          onClick={onCancel}
          data-testid="cloud-signin-ack-cancel"
        >
          {k('cancel')}
        </Button>
        <Button
          kind="primary"
          size="sm"
          disabled={!acknowledged}
          onClick={onConfirm}
          data-testid="cloud-signin-ack-continue"
        >
          {k('continue')}
        </Button>
      </div>
    </>
  );
};
