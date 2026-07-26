import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export interface CloudDeviceActionProps {
  isThisDevice: boolean;
  /** The row's display name, so the action says which device it acts on. */
  name: string;
  onSignOut: () => void;
  onFreeSlot: () => void;
}

/**
 * The one action a device row offers to free its slot — but by the means that fits
 * the device.
 *
 * This device signs out, which releases its slot outright. Freeing its own row
 * would be pointless: this browser holds the session, so the registrar would
 * simply rejoin it on the next sync. Another row can only have its beta slot
 * freed; this client cannot sign that browser out.
 */
export const CloudDeviceAction = ({
  isThisDevice,
  name,
  onSignOut,
  onFreeSlot,
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
      onClick={onFreeSlot}
      aria-label={t(k('freeSlotAria'), { name })}
      data-testid="cloud-device-free-slot"
    >
      {t(k('freeSlot'))}
    </Button>
  );
};
