import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { formatSpaceAge } from './sidebarHelpers';
import { Eyebrow } from '@/components/ui/Eyebrow';

export const SpaceSubtitle = ({ space }: { space: Space | undefined }) => {
  const { t } = useTranslation('chrome');
  const base = space?.shared
    ? t('chrome:sidebar.shared')
    : t('chrome:sidebar.private');
  const age = space ? formatSpaceAge(space.createdAt, t) : null;
  return (
    <Eyebrow data-testid="sidebar-space-subtitle" className="mt-1">
      {age ? t('chrome:sidebar.subtitleWithAge', { base, age }) : base}
    </Eyebrow>
  );
};
