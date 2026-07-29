import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import { cloudCurrentUser } from '@/lib/cloud/cloudClient';
import { useHasLocalSyncedData } from '@/hooks/useHasLocalSyncedData';
import { InlineBanner } from '@/components/ui/InlineBanner';

export interface CloudBackupNudgeProps {
  hasKey: boolean;
}

/**
 * Reminds the user that their notes live only on this device until they sign
 * in — shown once encryption is set up, sign-in has not happened, and there is
 * local content to lose. Self-gating: renders nothing otherwise.
 */
export const CloudBackupNudge = ({ hasKey }: CloudBackupNudgeProps) => {
  const { t } = useTranslation('screens');
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);
  const hasLocalData = useHasLocalSyncedData();
  const signedIn = user?.isLoggedIn ?? false;
  if (!hasKey || signedIn || !hasLocalData) return null;
  const k = (name: string) => t(`settings.account.cloud.backupNudge.${name}`);
  return (
    <InlineBanner kind="warning" className="mt-4" title={k('title')}>
      {k('body')}
    </InlineBanner>
  );
};
