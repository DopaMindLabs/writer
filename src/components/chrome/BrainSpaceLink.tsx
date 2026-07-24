import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface BrainSpaceLinkProps {
  spaceId: string;
  active: boolean;
  count: number;
}

export const BrainSpaceLink = ({
  spaceId,
  active,
  count,
}: BrainSpaceLinkProps) => {
  const { t } = useTranslation('common');
  return (
    <Link
      to={routes.brainSpace(spaceId)}
      data-testid="sidebar-brain-space-link"
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 px-5 py-1.5 transition-colors',
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
