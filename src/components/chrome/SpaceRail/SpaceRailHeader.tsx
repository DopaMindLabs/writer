import { useTranslation } from 'react-i18next';
import { routes } from '@/lib/routes';
import { APP_VERSION_LABEL } from '@/lib/version';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/components/ui/Link';

export const SpaceRailHeader = () => {
  const { t } = useTranslation('screens');
  return (
    <>
      <Link
        to={routes.home()}
        aria-label="Home"
        className="mb-1 flex h-7 w-7 items-center justify-center rounded-md font-serif text-lg leading-none tracking-tight text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
      >
        L
      </Link>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="mb-2.5 max-w-full cursor-help truncate rounded-sm border border-info bg-info-bg px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-info"
          >
            {APP_VERSION_LABEL}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          <div className="font-medium">{t('home.warningTitle')}</div>
          <div className="mt-0.5 text-[11px] opacity-80">
            {t('home.warningBody')}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider opacity-80">
            {t('home.versionLine', { version: APP_VERSION_LABEL })}
          </div>
        </TooltipContent>
      </Tooltip>
    </>
  );
};
