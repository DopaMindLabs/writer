import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import { isCloudSyncEnabled, cloudCurrentUser } from '@/lib/cloud/cloudClient';
import { routes } from '@/lib/routes';

/**
 * A Home action inviting sign-in to cloud sync, so the option is visible before
 * a space is created. Self-gating: it renders only when the cloud-sync beta is
 * enabled and the device is signed out — nothing changes for ordinary users, and
 * once signed in the status lives in Settings. Matches the other Home action rows.
 */
export const HomeCloudRow = () => {
  const { t } = useTranslation('screens');
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);
  if (!isCloudSyncEnabled() || user?.isLoggedIn) return null;
  return (
    <Link
      to={routes.settings('account')}
      data-testid="home-cloud-sign-in"
      className="flex items-baseline justify-between border-b border-rule px-2 py-5 transition-colors hover:bg-paper-2"
    >
      <span className="font-serif text-[18px] text-ink md:text-[22px]">
        {t('home.signInToSync')}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
        →
      </span>
    </Link>
  );
};
