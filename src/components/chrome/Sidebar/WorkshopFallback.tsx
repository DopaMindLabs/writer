import { useTranslation } from 'react-i18next';
import { BrainSpaceLink } from './BrainSpaceLink';

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
      <div
        data-testid="sidebar-workshop-fallback-label"
        className="px-5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4"
      >
        {t('sidebar.workshop')}
      </div>
      <BrainSpaceLink spaceId={spaceId} active={onBrainSpace} count={notesCount} />
    </div>
  );
};
