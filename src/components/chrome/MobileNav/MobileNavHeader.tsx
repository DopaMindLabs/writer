import { useTranslation } from 'react-i18next';
import { routes } from '@/lib/routes';
import { APP_VERSION_LABEL } from '@/lib/version';
import { Link } from '@/components/ui/Link';

/**
 * The drawer's top strip: the wordmark home link (a comfortable tap target) and
 * the pre-release build note shown inline. On the desktop rail this note lives
 * in a hover tooltip; touch has no hover, so the title and version are surfaced
 * as text here instead.
 */
export const MobileNavHeader = () => {
  const { t } = useTranslation('screens');
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-rule px-3 py-3">
      <Link
        to={routes.home()}
        aria-label="Home"
        className="flex h-11 w-11 items-center justify-center rounded-md font-serif text-2xl leading-none tracking-tight text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
      >
        L
      </Link>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm border border-info bg-info-bg px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-info">
            {APP_VERSION_LABEL}
          </span>
          <span className="truncate text-[12px] font-medium text-ink">
            {t('home.warningTitle')}
          </span>
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
          {t('home.versionLine', { version: APP_VERSION_LABEL })}
        </div>
      </div>
    </div>
  );
};
