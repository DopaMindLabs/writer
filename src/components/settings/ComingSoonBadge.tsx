import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ComingSoonBadgeProps {
  className?: string;
}

export function ComingSoonBadge({ className }: ComingSoonBadgeProps) {
  const { t } = useTranslation('screens');
  return (
    <span
      data-testid="coming-soon-badge"
      className={cn(
        'inline-block rounded-sm bg-paper-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-3',
        className,
      )}
    >
      {t('settings.comingSoonBadge')}
    </span>
  );
}
