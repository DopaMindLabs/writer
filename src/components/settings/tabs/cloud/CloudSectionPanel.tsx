import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import {
  cloudUserInteraction,
  cloudSyncState,
  cloudCurrentUser,
  cloudEscrowPresence,
  type SyncState,
  type EscrowPresence,
} from '@/lib/cloud/cloudClient';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useKeyMismatch } from '@/hooks/useKeyMismatch';
import { useCloudPanelState } from './useCloudPanelState';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';
import { CloudEncryptionControls } from './CloudEncryptionControls';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';
import { CloudSectionDialogs } from './CloudSectionDialogs';
import { CloudKeyConflictSection } from './CloudKeyConflictSection';
import { CloudBackupNudge } from './CloudBackupNudge';

const INITIAL_STATE: SyncState = { status: 'not-started', phase: 'initial' };
const INITIAL_PRESENCE: EscrowPresence = 'unknown';

/** Acquiring a key does not re-run mounted live queries (they still hold dropped
 *  rows), so a full reload re-hydrates the key and re-reads everything decrypted. */
const reloadPage = () => {
  window.location.reload();
};

/**
 * The active cloud-sync panel (rendered only behind both gates). A clean device
 * may sign in before setting a passphrase; a device with unencrypted writing is
 * turned back by the sign-in guard (surfaced here as a warning banner) so sync
 * never starts on keyless plaintext data.
 */
export const CloudSectionPanel = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.${name}`);
  const interaction = useCloudObservable(useMemo(cloudUserInteraction, []), undefined);
  const sync = useCloudObservable(useMemo(cloudSyncState, []), INITIAL_STATE);
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);

  const presence = useCloudObservable(useMemo(cloudEscrowPresence, []), INITIAL_PRESENCE);
  const panel = useCloudPanelState();
  const mismatch = useKeyMismatch();
  const signedIn = user?.isLoggedIn ?? false;
  const keylessSignedIn = signedIn && !panel.hasKey;
  return (
    <section data-testid="cloud-section" className="mt-8 border-t border-rule pt-6">
      <h2 className="text-[15px] font-semibold text-ink">{k('title')}</h2>
      <p className="mb-4 mt-1 max-w-[540px] font-serif text-[13px] text-ink-2">
        {k('subtitle')}
      </p>
      {panel.hasKey ? (
        <CloudSyncStatusRow phase={sync.phase} message={sync.error?.message} />
      ) : null}
      {mismatch ? <CloudKeyConflictSection onResolved={panel.refreshKey} /> : null}
      {keylessSignedIn ? (
        <CloudKeylessAccountSection
          presence={presence}
          onUnlock={panel.openUnlock}
          onSetUp={panel.openSetup}
        />
      ) : null}
      <CloudBackupNudge hasKey={panel.hasKey} />
      <CloudEncryptionControls
        hasKey={panel.hasKey}
        signedIn={signedIn}
        onSetUp={panel.openSetup}
        onUnlock={panel.openUnlock}
        onSignIn={panel.onSignIn}
        onSignOut={panel.onSignOut}
        onForget={panel.onForget}
      />
      {panel.signInError ? (
        <InlineBanner kind="warning" className="mt-2" data-testid="cloud-sign-in-error">
          {panel.signInError}
        </InlineBanner>
      ) : null}
      <CloudPrivacyDisclosure />
      <CloudSectionDialogs
        dialog={panel.dialog}
        setDialog={panel.setDialog}
        recoveryCode={panel.recoveryCode}
        setRecoveryCode={panel.setRecoveryCode}
        onKeyAcquired={keylessSignedIn ? reloadPage : panel.onKeyAcquired}
        interaction={interaction ?? null}
      />
    </section>
  );
};
