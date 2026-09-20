import { useMemo } from 'react';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import { cloudUserInteraction, cloudCurrentUser } from '@/lib/cloud/cloudClient';
import { useSyncStatus } from '@/lib/writerSyncIntegration/useSyncStatus';
import { useEscrowPresence } from '@/lib/writerSyncIntegration/useEscrowPresence';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useKeyMismatch } from '@/hooks/useKeyMismatch';
import { useCloudPanelState } from './useCloudPanelState';
import { useCloudPanelFlags } from './useCloudPanelFlags';
import { CloudSectionHeader } from './CloudSectionHeader';
import { CloudDeviceLimitBanner } from './CloudDeviceLimitBanner';
import { CloudDeviceRevokedBanner } from './CloudDeviceRevokedBanner';
import { CloudDeviceList } from './CloudDeviceList';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import { CloudReconcileStatusRow } from './CloudReconcileStatusRow';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';
import { CloudEncryptionControls } from './CloudEncryptionControls';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';
import { CloudSectionDialogs } from './CloudSectionDialogs';
import { CloudKeyConflictSection } from './CloudKeyConflictSection';
import { CloudBackupNudge } from './CloudBackupNudge';

/**
 * The active cloud-sync panel (rendered only behind both gates). A clean device
 * may sign in before setting a passphrase; a device with unencrypted writing is
 * turned back by the sign-in guard (surfaced here as a warning banner) so sync
 * never starts on keyless plaintext data.
 */
export const CloudSectionPanel = () => {
  const interaction = useCloudObservable(useMemo(cloudUserInteraction, []), undefined);
  const sync = useSyncStatus();
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);

  const presence = useEscrowPresence();
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
      {flags.deviceRevoked ? <CloudDeviceRevokedBanner /> : null}
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
      {flags.showDeviceList ? <CloudDeviceList onSignOut={panel.onSignOut} /> : null}
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
        onSignInConfirmed={panel.onSignInConfirmed}
        interaction={interaction ?? null}
      />
    </section>
  );
};
