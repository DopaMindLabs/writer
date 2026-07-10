import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Space } from '@/db/schema';

export type NavShellVariant = 'global' | 'space';

interface NavShellHeaderProps {
  variant: NavShellVariant;
  space: Space | null;
  subtitleOverride?: string;
}

export const NavShellHeader = ({
  variant,
  space,
  subtitleOverride,
}: NavShellHeaderProps) => {
  const { t } = useTranslation('screens');
  const isSpace = variant === 'space';
  const title = isSpace ? space?.name ?? '…' : 'LIpsum Writer';
  const subtitle =
    subtitleOverride ??
    (isSpace ? t('settings.space.shellSubtitle') : t('settings.shellSubtitle'));
  const badge = isSpace ? space?.tag ?? '·' : 'L';

  return (
    <div className="flex items-center gap-3 border-b border-rule px-6 pb-4 pt-5">
      <div
        className={cn(
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md',
          isSpace
            ? 'bg-ink font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-paper'
            : 'border border-rule font-serif text-[16px] text-ink',
        )}
        aria-hidden
      >
        {badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[20px] font-medium leading-none -tracking-[0.01em] text-ink">
          {title}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.089em] text-ink-3">
          {subtitle}
        </div>
      </div>
    </div>
  );
};
