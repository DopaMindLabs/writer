import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@/components/libs/icons';
import { Link } from '@/components/ui/Link';
import { PRIMARY_NAV, routes } from '@/lib/routes';

interface PageNavProps {
  showBack?: boolean;
  backTo?: string;
}

const linkClasses = 'hover:text-ink text-ink-3';
const activeLinkClasses = 'text-ink';

export const PageNav = ({ showBack = true, backTo }: PageNavProps) => {
  const { t } = useTranslation('common');
  return (
    <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-4 md:px-12 md:py-5">
      <div className="flex min-w-[60px] items-center">
        {showBack ? (
          <Link
            to={backTo ?? routes.home()}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            {t('back')}
          </Link>
        ) : null}
      </div>
      <nav
        aria-label="Primary"
        className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider md:gap-5"
      >
        {PRIMARY_NAV.map((item) =>
          item.external ? (
            <Link
              key={item.i18nKey}
              href={item.to}
              className="hidden text-ink-3 hover:text-ink md:inline"
            >
              {t(item.i18nKey)}
            </Link>
          ) : (
            <Link
              key={item.i18nKey}
              to={item.to}
              end={item.end}
              className={linkClasses}
              activeClassName={activeLinkClasses}
            >
              {t(item.i18nKey)}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
};
