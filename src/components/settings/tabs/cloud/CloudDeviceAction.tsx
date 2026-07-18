import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export interface CloudDeviceActionProps {
  isThisDevice: boolean;
  /** The row's display name, so the action says which device it acts on. */
  name: string;
  onSignOut: () => void;
  onRevoke: () => void;
}

/**
 * The one action a device row offers to free its slot — but by the means that fits
 * the device.
 *
 * This device signs out, which releases its slot outright. Revoking your own row
 * would be pointless: this device holds the session, so the registrar would simply
 * rejoin it on the next sync. Any other device is removed.
 */
export const CloudDeviceAction = ({
  isThisDevice,
  name,
  onSignOut,
  onRevoke,
}: CloudDeviceActionProps) => {
  const { t } = useTranslation('screens');
  const k = (key: string) => `settings.account.cloud.devices.${key}`;

  if (isThisDevice) {
    return (
      <Button
        kind="ghost"
        size="sm"
        onClick={onSignOut}
        aria-label={t(k('signOutAria'))}
        data-testid="cloud-device-sign-out"
      >
        {t(k('signOut'))}
      </Button>
    );
  }
  return (
    <Button
      kind="ghost"
      size="sm"
      onClick={onRevoke}
      aria-label={t(k('revokeAria'), { name })}
      data-testid="cloud-device-revoke"
    >
      {t(k('revoke'))}
    </Button>
  );
};
