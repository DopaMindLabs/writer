import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import type { EscrowPresence } from '@/lib/cloud/cloudClient';

export interface CloudKeylessAccountSectionProps {
  /** The account's escrow presence, once its pull is confirmed. */
  presence: EscrowPresence;
  /** Open the passphrase-unlock dialog (adopt the account key). */
  onUnlock: () => void;
  /** Open the set-up dialog (this account has no key yet). */
  onSetUp: () => void;
}

/**
 * The guidance shown to a device that has signed in before it holds a key. Once
 * the account pull is confirmed it steers the user to the one correct next step:
 * unlock with the passphrase created on another device (the account already has
 * a key), or set one up (it does not). Until the pull settles it offers no
 * key-minting action, so a Set-up can never race ahead and diverge from the
 * account key.
 */
export const CloudKeylessAccountSection = ({
  presence,
  onUnlock,
  onSetUp,
}: CloudKeylessAccountSectionProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.keyless.${name}`);

  if (presence === 'unknown') {
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
