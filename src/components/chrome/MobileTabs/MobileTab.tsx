import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { cn } from '@/lib/utils';
import type { TabItem } from './useTabItems';

export const MobileTab = ({ item, active }: { item: TabItem; active: boolean }) => {
  const { t } = useTranslation('chrome');
  const className = cn(
    'flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors',
    active ? 'text-ink' : 'text-ink-3 hover:text-ink',
  );
  const inner = (
    <>
      <item.Icon className="h-4 w-4" aria-hidden />
      <span className="font-mono text-[9px] uppercase tracking-wider">
        {t(`mobileTabs.${item.key}`)}
      </span>
    </>
  );
  if (item.href) {
    return (
      <Link
        data-testid={`mobile-tabs-${item.key}`}
        to={item.href}
        aria-current={active ? 'page' : undefined}
        className={className}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      data-testid={`mobile-tabs-${item.key}`}
      type="button"
      onClick={item.onClick}
      aria-pressed={active}
      className={className}
    >
      {inner}
    </button>
  );
};
