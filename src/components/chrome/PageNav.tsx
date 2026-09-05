import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@/components/libs/icons';
import { eyebrowRecipe } from '@/components/ui/Eyebrow.recipe';
import { Link } from '@/components/ui/Link';
import { PRIMARY_NAV, routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface PageNavProps {
  showBack?: boolean;
  backTo?: string;
  /** Screen-specific actions rendered at the top right, after the primary nav. */
  actions?: ReactNode;
}

const linkClasses = 'hover:text-ink text-ink-3';
const activeLinkClasses = 'text-ink';

export const PageNav = ({ showBack = true, backTo, actions }: PageNavProps) => {
  const { t } = useTranslation('common');
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-4 py-4 md:px-12 md:py-5">
      {/* The spacer keeps the nav right-aligned; it reserves width only when a
          back link can occupy it, so narrow viewports keep the full width. */}
      <div className={cn('flex items-center', showBack && 'min-w-[60px]')}>
        {showBack ? (
          <Link
            data-testid="page-nav-back"
            to={backTo ?? routes.home()}
            className={cn(
              eyebrowRecipe(),
              'inline-flex items-center gap-1.5 hover:text-ink',
            )}
          >
            <ArrowLeft className="h-3 w-3" />
            {t('back')}
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 md:gap-5">
        <nav
          data-testid="page-nav"
          aria-label="Primary"
          className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider md:gap-5"
        >
          {PRIMARY_NAV.map((item) =>
            item.external ? (
              <Link
                key={item.i18nKey}
                data-testid={`page-nav-nav-${item.i18nKey}`}
                href={item.to}
                className="hidden text-ink-3 hover:text-ink md:inline"
              >
                {t(item.i18nKey)}
              </Link>
            ) : (
              <Link
                key={item.i18nKey}
                data-testid={`page-nav-nav-${item.i18nKey}`}
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
        {actions}
      </div>
    </header>
  );
};
