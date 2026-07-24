import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSpace } from '@/hooks/useSpaces';
import { useSections } from '@/hooks/useDocuments';
import { useNotes } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import type { SidebarProps } from './Sidebar.types';
import { inferModeSuffix } from './sidebarHelpers';
import { SpaceHeader } from './SpaceHeader';
import { SidebarNav } from './SidebarNav';

export const Sidebar = ({ spaceId, activeDocId, className }: SidebarProps) => {
  const { t } = useTranslation('chrome');
  const space = useSpace(spaceId);
  const sections = useSections(spaceId) ?? [];
  const notes = useNotes(spaceId);
  const location = useLocation();
  const modeSuffix = inferModeSuffix(location.pathname);
  const onBrainSpace = location.pathname.endsWith('/brain-space');

  return (
    <aside
      aria-label={t('sidebar.landmarkLabel')}
      className={cn(
        'flex w-56 shrink-0 flex-col border-r border-rule bg-paper-2',
        className,
      )}
    >
      <SpaceHeader spaceId={spaceId} space={space} />
      <SidebarNav
        spaceId={spaceId}
        activeDocId={activeDocId}
        sections={sections}
        notesCount={notes.length}
        onBrainSpace={onBrainSpace}
        modeSuffix={modeSuffix}
        space={space}
      />
    </aside>
  );
};
