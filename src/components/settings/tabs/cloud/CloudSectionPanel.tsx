import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import {
  cloudUserInteraction,
  cloudSyncState,
  cloudCurrentUser,
  type SyncState,
} from '@/lib/cloud/cloudClient';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useKeyMismatch } from '@/hooks/useKeyMismatch';
import { useCloudPanelState } from './useCloudPanelState';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';
import { CloudEncryptionControls } from './CloudEncryptionControls';
import { CloudSectionDialogs } from './CloudSectionDialogs';
import { CloudKeyConflictSection } from './CloudKeyConflictSection';
import { CloudBackupNudge } from './CloudBackupNudge';

const INITIAL_STATE: SyncState = { status: 'not-started', phase: 'initial' };

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

  const panel = useCloudPanelState();
  const mismatch = useKeyMismatch();
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
      <CloudBackupNudge hasKey={panel.hasKey} />
      <CloudEncryptionControls
        hasKey={panel.hasKey}
        signedIn={user?.isLoggedIn ?? false}
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
