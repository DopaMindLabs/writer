import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Link } from '@/components/ui/Link';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import { isCloudSyncEnabled, cloudCurrentUser } from '@/lib/cloud/cloudClient';
import { routes } from '@/lib/routes';

/**
 * A Home header action inviting sign-in to cloud sync, so the option is visible
 * before a space is created. Self-gating: it renders only when the cloud-sync
 * beta is enabled and the device is signed out — nothing changes for ordinary
 * users, and once signed in the status lives in Settings.
 */
export const HomeCloudSignInButton = () => {
  const { t } = useTranslation('screens');
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);
  if (!isCloudSyncEnabled() || user?.isLoggedIn) return null;
  return (
    <Button asChild kind="secondary" size="sm">
      <Link to={routes.settings('account')} data-testid="home-cloud-sign-in">
        {t('home.signInToSync')}
      </Link>
    </Button>
  );
};
