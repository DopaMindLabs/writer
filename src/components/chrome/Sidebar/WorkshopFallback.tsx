import { useTranslation } from 'react-i18next';
import { BrainSpaceLink } from './BrainSpaceLink';
import { SectionLabel } from '@/components/ui/SectionLabel';

export const WorkshopFallback = ({
  spaceId,
  onBrainSpace,
  notesCount,
}: {
  spaceId: string;
  onBrainSpace: boolean;
  notesCount: number;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <div
      data-testid="sidebar-workshop-fallback"
      className="mt-4 border-t border-rule pt-2"
    >
      <SectionLabel
        size={9}
        tone="ink4"
        data-testid="sidebar-workshop-fallback-label"
        className="px-5 pb-1 pt-2"
      >
        {t('sidebar.workshop')}
      </SectionLabel>
      <BrainSpaceLink spaceId={spaceId} active={onBrainSpace} count={notesCount} />
    </div>
  );
};
