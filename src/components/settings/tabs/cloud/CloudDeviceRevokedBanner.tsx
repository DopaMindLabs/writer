import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * Shown once this device's own slot has been revoked from another device.
 *
 * The device is not cut off — the registry is a client-side courtesy, not a
 * security boundary, so it keeps its session and its writing. What it has lost is
 * its slot, and it will not silently take another. Saying so is the whole point:
 * a device that quietly stopped holding a slot, with no explanation, is precisely
 * the sort of thing users read as the sync being broken.
 */
export const CloudDeviceRevokedBanner = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.revoked.${name}`);
  return (
    <InlineBanner
      kind="warning"
      className="mt-4"
      title={k('title')}
      data-testid="cloud-device-revoked"
    >
      {k('body')}
    </InlineBanner>
  );
};
