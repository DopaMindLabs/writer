import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export interface CloudEncryptionControlsProps {
  hasKey: boolean;
  signedIn: boolean;
  onSetUp: () => void;
  onUnlock: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onForget: () => void;
}

/**
 * The action buttons for the cloud section. Before a key ring exists, set-up and
 * unlock are offered alongside sign-in — a clean device may sign in first, while
 * a device with unencrypted writing is turned back by the sign-in guard with a
 * "set up first" message. Once keyed, sign-in/out and forget-this-device show.
 */
export const CloudEncryptionControls = ({
  hasKey,
  signedIn,
  onSetUp,
  onUnlock,
  onSignIn,
  onSignOut,
  onForget,
}: CloudEncryptionControlsProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.account.cloud.${name}`);
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {hasKey ? (
        <>
          <Button
            kind="primary"
            size="sm"
            disabled={signedIn}
            onClick={onSignIn}
            data-testid="cloud-sign-in"
          >
            {k('signIn')}
          </Button>
          {signedIn ? (
            <Button kind="secondary" size="sm" onClick={onSignOut} data-testid="cloud-sign-out">
              {k('signOut')}
            </Button>
          ) : null}
          <Button kind="ghost" size="sm" onClick={onForget} data-testid="cloud-forget">
            {k('forgetDevice')}
          </Button>
        </>
      ) : (
        <>
          <Button kind="primary" size="sm" onClick={onSetUp} data-testid="cloud-setup">
            {k('setUp')}
          </Button>
          <Button kind="secondary" size="sm" onClick={onUnlock} data-testid="cloud-unlock">
            {k('unlock')}
          </Button>
          {signedIn ? (
            <Button kind="ghost" size="sm" onClick={onSignOut} data-testid="cloud-sign-out">
              {k('signOut')}
            </Button>
          ) : (
            <Button kind="ghost" size="sm" onClick={onSignIn} data-testid="cloud-sign-in">
              {k('signIn')}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
