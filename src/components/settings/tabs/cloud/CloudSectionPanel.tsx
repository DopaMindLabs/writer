import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import {
  deviceKeyProvider,
  signInToCloud,
  signOutOfCloud,
  forgetThisDevice,
  cloudUserInteraction,
  cloudSyncState,
  cloudCurrentUser,
  type SyncState,
} from '@/lib/cloud/cloudClient';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';
import { CloudEncryptionControls } from './CloudEncryptionControls';
import { CloudSectionDialogs, type CloudDialogName } from './CloudSectionDialogs';

const INITIAL_STATE: SyncState = { status: 'not-started', phase: 'initial' };

/**
 * The active cloud-sync panel (rendered only behind both gates). Enforces
 * passphrase-before-sign-in: sign-in stays disabled until a device key ring
 * exists, so sync can never start on keyless (plaintext) data.
 */
export const CloudSectionPanel = () => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.${name}`);
  const interaction = useCloudObservable(useMemo(cloudUserInteraction, []), undefined);
  const sync = useCloudObservable(useMemo(cloudSyncState, []), INITIAL_STATE);
  const user = useCloudObservable(useMemo(cloudCurrentUser, []), undefined);

  const [dialog, setDialog] = useState<CloudDialogName>('none');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(() => deviceKeyProvider.current() !== null);

  const onForget = () => {
    void forgetThisDevice().then(() => {
      setHasKey(false);
    });
  };

  return (
    <section data-testid="cloud-section" className="mt-8 border-t border-rule pt-6">
      <h2 className="text-[15px] font-semibold text-ink">{k('title')}</h2>
      <p className="mb-4 mt-1 max-w-[540px] font-serif text-[13px] text-ink-2">
        {k('subtitle')}
      </p>

      {hasKey ? (
        <CloudSyncStatusRow phase={sync.phase} message={sync.error?.message} />
      ) : null}

      <CloudEncryptionControls
        hasKey={hasKey}
        signedIn={user?.isLoggedIn ?? false}
        onSetUp={() => {
          setDialog('setup');
        }}
        onUnlock={() => {
          setDialog('unlock');
        }}
        onSignIn={() => {
          void signInToCloud();
        }}
        onSignOut={() => {
          void signOutOfCloud();
        }}
        onForget={onForget}
      />

      <CloudPrivacyDisclosure />

      <CloudSectionDialogs
        dialog={dialog}
        setDialog={setDialog}
        recoveryCode={recoveryCode}
        setRecoveryCode={setRecoveryCode}
        onKeyAcquired={() => {
          setHasKey(true);
        }}
        interaction={interaction ?? null}
      />
    </section>
  );
};
