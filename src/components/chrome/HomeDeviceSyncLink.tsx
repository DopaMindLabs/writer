import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { TypographyLabel } from '@/components/ui/typography';
import { routes } from '@/lib/routes';

/**
 * A Home header link to device sync, so pairing is findable before anyone has
 * opened Settings looking for it.
 *
 * Unconditional on purpose. The action this replaced hid behind the cloud-sync
 * beta, which left the one form of sync that needs no account — two devices and
 * a code — with no way in from Home at all.
 *
 * It carries no live state, in the nav's own voice rather than as a call to
 * action: whether a paired device is currently connected belongs beside the
 * device it describes, in Settings, not in a header on every screen.
 */
export const HomeDeviceSyncLink = () => {
  const { t } = useTranslation('screens');
  return (
    <TypographyLabel asChild variant="wide">
      <Link
        to={routes.settings('deviceSync')}
        data-testid="home-device-sync"
        className="hover:text-ink"
      >
        {t('home.deviceSync')}
      </Link>
    </TypographyLabel>
  );
};
