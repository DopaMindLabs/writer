import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import type { EscrowPresence, CloudSyncPhase } from '@/lib/cloud/cloudClient';
import { CloudKeylessPendingBanner } from './CloudKeylessPendingBanner';

export interface CloudKeylessAccountSectionProps {
  /** The account's escrow presence, once its pull is confirmed. */
  presence: EscrowPresence;
  /** The sync phase, so a stalled pull can be told from one still in progress. */
  syncPhase: CloudSyncPhase;
  /** Open the passphrase-unlock dialog (adopt the account key). */
  onUnlock: () => void;
  /** Open the set-up dialog (this account has no key yet). */
  onSetUp: () => void;
  /** Retry a stalled account fetch by forcing a fresh pull. */
  onRetry: () => void;
}

/**
 * The guidance shown to a device that has signed in before it holds a key. Once
 * the account pull is confirmed it steers the user to the one correct next step:
 * unlock with the passphrase created on another device (the account already has
 * a key), or set one up (it does not). While the pull is still unresolved it
 * defers to {@link CloudKeylessPendingBanner} — checking, offline, or a retryable
 * failure — which offers no key-minting action.
 */
export const CloudKeylessAccountSection = ({
  presence,
  syncPhase,
  onUnlock,
  onSetUp,
  onRetry,
}: CloudKeylessAccountSectionProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.keyless.${name}`);

  if (presence === 'unknown') {
    return <CloudKeylessPendingBanner syncPhase={syncPhase} onRetry={onRetry} />;
  }
  if (presence === 'present') {
    return (
      <InlineBanner
        kind="warning"
        className="mt-4"
        title={k('lockedTitle')}
        action={k('lockedAction')}
        onAction={onUnlock}
        data-testid="cloud-keyless-locked"
      >
        {k('lockedBody')}
      </InlineBanner>
    );
  }
  return (
    <InlineBanner
      kind="info"
      className="mt-4"
      title={k('noKeyTitle')}
      action={k('noKeyAction')}
      onAction={onSetUp}
      data-testid="cloud-keyless-nokey"
    >
      {k('noKeyBody')}
    </InlineBanner>
  );
};
