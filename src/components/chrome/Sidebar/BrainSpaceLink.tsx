import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export const BrainSpaceLink = ({
  spaceId,
  active,
  count,
}: {
  spaceId: string;
  active: boolean;
  count: number;
}) => {
  const { t } = useTranslation('common');
  return (
    <Link
      to={routes.brainSpace(spaceId)}
      data-testid="sidebar-brain-space-link"
      className={cn(
        // pr-9 reserves the trailing kebab column (w-7 + gap-2) that doc/section
        // rows carry, so the count aligns with document counts even though this
        // row has no ⋯ menu of its own.
        '-ml-px flex items-center gap-2 border-l-2 py-1.5 pl-5 pr-9 transition-colors',
        active
          ? 'border-ink bg-paper font-medium text-ink'
          : 'border-transparent text-ink-2 hover:bg-paper',
      )}
    >
      <span
        data-testid="sidebar-brain-space-link-label"
        className="flex-1 text-[13px]"
      >
        {t('brainSpace')}
      </span>
      <span
        data-testid="sidebar-brain-space-link-count"
        className="font-mono text-[10px] text-ink-4"
      >
        {count > 0 ? `${String(count)}◦` : '◌'}
      </span>
    </Link>
  );
};
