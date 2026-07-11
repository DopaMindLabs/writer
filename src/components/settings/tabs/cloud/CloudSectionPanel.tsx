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
import { CloudReconcileStatusRow } from './CloudReconcileStatusRow';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';
import { CloudEncryptionControls } from './CloudEncryptionControls';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';
import { CloudSectionDialogs } from './CloudSectionDialogs';
import { CloudKeyConflictSection } from './CloudKeyConflictSection';
import { CloudBackupNudge } from './CloudBackupNudge';

const INITIAL_STATE: SyncState = { status: 'not-started', phase: 'initial' };
const INITIAL_PRESENCE: EscrowPresence = 'unknown';

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
  // Sync and reconcile status are shown to any signed-in device — a keyless one is
  // still syncing ciphertext and its reconcile can still fail, so it must not be
  // left without diagnostics while it waits to unlock.
  const showStatus = signedIn || panel.hasKey;
  return (
    <section data-testid="cloud-section" className="mt-8 border-t border-rule pt-6">
      <h2 className="text-[15px] font-semibold text-ink">{k('title')}</h2>
      <p className="mb-4 mt-1 max-w-[540px] font-serif text-[13px] text-ink-2">
        {k('subtitle')}
      </p>
      {showStatus ? (
        <CloudSyncStatusRow phase={sync.phase} message={sync.error?.message} />
      ) : null}
      {showStatus ? <CloudReconcileStatusRow /> : null}
      {mismatch ? <CloudKeyConflictSection onResolved={panel.refreshKey} /> : null}
      {keylessSignedIn ? (
        <CloudKeylessAccountSection
          presence={presence}
          syncPhase={sync.phase}
          onUnlock={panel.openUnlock}
          onSetUp={panel.openSetup}
          onRetry={panel.onRetry}
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
        onKeyAcquired={panel.onKeyAcquired}
        interaction={interaction ?? null}
      />
    </section>
  );
};
