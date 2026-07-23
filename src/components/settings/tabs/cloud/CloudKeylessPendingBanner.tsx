import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { SyncPhase } from '@/lib/syncProviders/types';

export interface CloudKeylessPendingBannerProps {
  /** The sync phase, so a stalled pull can be told from one still in progress. */
  syncPhase: SyncPhase;
  /** Retry a stalled account fetch by forcing a fresh pull. */
  onRetry: () => void;
}

/**
 * The banner shown to a signed-in keyless device while the account pull has not
 * yet resolved its escrow presence. A pull that has **errored** gets a retryable
 * failure notice so the device is never stranded on "fetching your account…"; an
 * **offline** one is told sync will resume; anything else is still in progress and
 * shows the neutral checking notice. None of these offer a key-minting action, so
 * a Set-up can never race ahead of the pull and diverge from the account key.
 */
export const CloudKeylessPendingBanner = ({
  syncPhase,
  onRetry,
}: CloudKeylessPendingBannerProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.keyless.${name}`);

  if (syncPhase === SyncPhase.Error) {
    return (
      <InlineBanner
        kind="warning"
        className="mt-4"
        title={k('fetchFailedTitle')}
        action={k('fetchRetry')}
        onAction={onRetry}
        data-testid="cloud-keyless-fetch-failed"
      >
        {k('fetchFailedBody')}
      </InlineBanner>
    );
  }
  if (syncPhase === SyncPhase.Offline) {
    return (
      <InlineBanner
        kind="info"
        className="mt-4"
        title={k('offlineTitle')}
        data-testid="cloud-keyless-offline"
      >
        {k('offlineBody')}
      </InlineBanner>
    );
  }
  return (
    <InlineBanner
      kind="info"
      className="mt-4"
      title={k('checkingTitle')}
      data-testid="cloud-keyless-checking"
    >
      {k('checkingBody')}
    </InlineBanner>
  );
};
