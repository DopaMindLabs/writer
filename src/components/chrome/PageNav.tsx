import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@/components/libs/icons';
import { cn } from '@/lib/utils';

interface PageNavProps {
  showBack?: boolean;
  backTo?: string;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('hover:text-ink', isActive ? 'text-ink' : 'text-ink-3');

export function PageNav({ showBack = true, backTo = '/' }: PageNavProps) {
  const { t } = useTranslation('common');
  return (
    <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-4 md:px-12 md:py-5">
      <div className="flex min-w-[60px] items-center">
        {showBack ? (
          <Link
            to={backTo}
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
        <NavLink to="/" end className={linkClass}>
          {t('home')}
        </NavLink>
        <NavLink to="/about" className={linkClass}>
          {t('about')}
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          {t('settings')}
        </NavLink>
        <a
          href="https://github.com/DopaMindLabs/Writer"
          target="_blank"
          rel="noreferrer"
          className="hidden text-ink-3 hover:text-ink md:inline"
        >
          {t('github')}
        </a>
      </nav>
    </header>
  );
}
