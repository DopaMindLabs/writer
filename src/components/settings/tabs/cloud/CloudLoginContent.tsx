import type { SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';
import type { DXCUserInteraction } from '@/lib/cloud/cloudClient';

interface Field {
  name: string;
  label: string;
  type: string;
}

/** The single text field an email/OTP prompt needs, or none for other prompts. */
const inputField = (
  interaction: DXCUserInteraction,
  label: (name: string) => string,
): Field | null => {
  if (interaction.type === 'email') {
    return { name: 'email', label: label('email.label'), type: 'email' };
  }
  if (interaction.type === 'otp') {
    return { name: 'otp', label: label('otp.label'), type: 'text' };
  }
  return null;
};

/** The dialog body for an active sign-in interaction (never null here). */
export const CloudLoginContent = ({
  interaction,
}: {
  interaction: DXCUserInteraction;
}) => {
  const { t } = useTranslation('screens');
  const label = (name: string) => t(`settings.account.cloud.${name}`);
  const field = inputField(interaction, label);

  const onSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const entry = field ? new FormData(e.currentTarget).get(field.name) : null;
    const value = typeof entry === 'string' ? entry : '';
    interaction.onSubmit(field ? { [field.name]: value } : {});
  };

  return (
    <DialogContent data-testid="cloud-login-dialog" className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{interaction.title}</DialogTitle>
      </DialogHeader>
      {interaction.alerts.map((alert, i) => (
        <InlineBanner key={i} kind={alert.type}>
          {alert.message}
        </InlineBanner>
      ))}
      <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-4">
        {field ? (
          <label className="flex flex-col gap-1 text-[13px] text-ink-2">
            {field.label}
            <TextField
              name={field.name}
              type={field.type}
              aria-label={field.label}
              autoFocus
              data-testid="cloud-login-input"
            />
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            kind="secondary"
            size="sm"
            type="button"
            onClick={() => {
              interaction.onCancel();
            }}
            data-testid="cloud-login-cancel"
          >
            {interaction.cancelLabel ?? label('email.cancel')}
          </Button>
          <Button kind="primary" size="sm" type="submit" data-testid="cloud-login-submit">
            {interaction.submitLabel}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};
