import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  TypographyLabel,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';
import { isCloudKeyError, resetCloudDevice } from '@/lib/cloud/cloudClient';
import { routes } from '@/lib/routes';
import { CloudKeyErrorScreen } from './CloudKeyErrorScreen';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * A full-page href for the Account tab, honouring the active router. A render
 * error keeps the router pinned on the failing location, and React Router does
 * not reset a render-time error boundary on a same-location `navigate` — so
 * "Unlock in settings" must be a hard navigation. It re-runs app boot (which
 * re-hydrates the key and re-reconciles the escrow), landing on the Account tab
 * where a genuine mismatch shows its resolvable conflict banner.
 */
const accountSettingsHref = (): string => {
  const path = routes.settings('account');
  return import.meta.env.VITE_ROUTER === 'browser' ? path : `/#${path}`;
};

/**
 * The router's `errorElement`. A cloud-encryption key failure gets the dedicated
 * recovery surface; anything else gets a plain, calm fallback with a reload —
 * replacing the framework's default stack-trace page.
 */
export const RouteErrorScreen = () => {
  const { t } = useTranslation('app');
  const error = useRouteError();

  if (isCloudKeyError(error)) {
    return (
      <CloudKeyErrorScreen
        onUnlock={() => {
          window.location.assign(accountSettingsHref());
        }}
        onReset={async () => {
          await resetCloudDevice();
          window.location.reload();
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
