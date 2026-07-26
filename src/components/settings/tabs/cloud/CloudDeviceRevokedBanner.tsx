import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * Shown once another browser has freed this device's beta slot.
 *
 * The device is not cut off — the registry is a client-side courtesy, not a
 * security boundary, so it keeps its session and may keep syncing. What it has
 * lost is only its slot, and it will not silently take another. Saying so avoids
 * presenting a client-side registry tombstone as access revocation.
 */
export const CloudDeviceRevokedBanner = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.revoked.${name}`);
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
