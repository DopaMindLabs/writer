import { useTranslation } from 'react-i18next';
import { useNavigate, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  TypographyLabel,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';
import { isCloudKeyError } from '@/lib/cloud/crypto/errors';
import { forgetThisDevice } from '@/lib/cloud/cloudClient';
import { resetAndReseed } from '@/db/seed';
import { routes } from '@/lib/routes';
import { CloudKeyErrorScreen } from './CloudKeyErrorScreen';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The router's `errorElement`. A cloud-encryption key failure gets the dedicated
 * recovery surface; anything else gets a plain, calm fallback with a reload —
 * replacing the framework's default stack-trace page.
 */
export const RouteErrorScreen = () => {
  const { t } = useTranslation('app');
  const error = useRouteError();
  const navigate = useNavigate();

  if (isCloudKeyError(error)) {
    return (
      <CloudKeyErrorScreen
        onUnlock={() => {
          void navigate(routes.settings('account'));
        }}
        onReset={() => {
          void (async () => {
            await forgetThisDevice();
            await resetAndReseed();
            window.location.reload();
          })();
        }}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div>
        <TypographyLabel variant="xs">{t('routeErrorLabel')}</TypographyLabel>
        <TypographyP variant="empty" className="mt-2">
          {messageOf(error)}
        </TypographyP>
        <TypographyMuted variant="xs" className="mt-4">
          {t('routeErrorHint')}
        </TypographyMuted>
        <Button
          kind="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t('routeErrorReload')}
        </Button>
      </div>
    </div>
  );
};
