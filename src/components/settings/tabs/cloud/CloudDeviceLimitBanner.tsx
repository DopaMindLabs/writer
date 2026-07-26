import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * The hard block shown to a third device while the sync beta runs: the account's
 * device registry is full, so this device is offered no key action at all — it
 * cannot unlock or set up until a slot is freed. The device list can free a
 * peer's capacity without claiming to sign it out; local sign-out (rendered by
 * the controls row below) stays available.
 */
export const CloudDeviceLimitBanner = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.deviceLimit.${name}`);
  return (
    <InlineBanner
      kind="warning"
      className="mt-4"
      title={k('title')}
      data-testid="cloud-device-limit"
    >
      {k('body')}
    </InlineBanner>
  );
};
