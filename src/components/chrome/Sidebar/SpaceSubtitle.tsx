import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { formatSpaceAge } from './sidebarHelpers';

export const SpaceSubtitle = ({ space }: { space: Space | undefined }) => {
  const { t } = useTranslation('chrome');
  const base = space?.shared
    ? t('chrome:sidebar.shared')
    : t('chrome:sidebar.private');
  const age = space ? formatSpaceAge(space.createdAt, t) : null;
  return (
    <div
      data-testid="sidebar-space-subtitle"
      className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3"
    >
      {age ? t('chrome:sidebar.subtitleWithAge', { base, age }) : base}
    </div>
  );
};
