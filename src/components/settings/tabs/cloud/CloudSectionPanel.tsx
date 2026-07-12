import { useMemo } from 'react';
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
import { useCloudPanelFlags } from './useCloudPanelFlags';
import { CloudSectionHeader } from './CloudSectionHeader';
import { CloudDeviceLimitBanner } from './CloudDeviceLimitBanner';
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
  const interaction = useCloudObservable(useMemo(cloudUserInteraction, []), undefined);
  const sync = useCloudObservable(useMemo(cloudSyncState, []), INITIAL_STATE);
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);

  const presence = useCloudObservable(useMemo(cloudEscrowPresence, []), INITIAL_PRESENCE);
  const panel = useCloudPanelState();
  const mismatch = useKeyMismatch();
  const flags = useCloudPanelFlags(user, panel.hasKey, presence);
  return (
    <section data-testid="cloud-section" className="mt-8 border-t border-rule pt-6">
      <CloudSectionHeader />
      {flags.showStatus ? (
        <CloudSyncStatusRow phase={sync.phase} message={sync.error?.message} />
      ) : null}
      {flags.showStatus ? <CloudReconcileStatusRow /> : null}
      {mismatch ? <CloudKeyConflictSection onResolved={panel.refreshKey} /> : null}
      {flags.deviceLimitBlocked ? (
        <CloudDeviceLimitBanner />
      ) : flags.keylessSignedIn ? (
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
        signedIn={flags.signedIn}
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
