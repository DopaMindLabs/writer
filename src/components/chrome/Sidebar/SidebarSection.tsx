import { isWorkshopSection } from '@/lib/sections';
import type { Doc, Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SectionHeader } from './SectionHeader';
import { BrainSpaceLink } from './BrainSpaceLink';
import { SortableDocList } from './SortableDocList';
import { MaybeAddInput } from './MaybeAddInput';
import { SectionEmpty } from './SectionEmpty';

interface SidebarSectionProps {
  sec: Section;
  docs: Doc[];
  spaceId: string;
  activeDocId: string | null;
  onBrainSpace: boolean;
  notesCount: number;
  canManage: boolean;
  docHref: (docId: string) => string;
  startAdd: (sectionId: string, parentLabel: string, subLabel: string | null) => void;
  add: AddController;
}

export const SidebarSection = ({
  sec,
  docs,
  spaceId,
  activeDocId,
  onBrainSpace,
  notesCount,
  canManage,
  docHref,
  startAdd,
  add,
}: SidebarSectionProps) => {
  const isWorkshop = isWorkshopSection(sec);
  const showEmpty = docs.length === 0 && add.adding?.sectionId !== sec.id;
  const containsActiveDoc = docs.some((d) => d.id === activeDocId);
  return (
    <div data-testid={`sidebar-section-${sec.id}`} className="mb-2">
      <SectionHeader
        section={sec}
        docCount={docs.length}
        containsActiveDoc={containsActiveDoc}
        canManage={canManage}
        onAdd={() => { startAdd(sec.id, sec.label, null); }}
      />
      {isWorkshop && (
        <BrainSpaceLink
          spaceId={spaceId}
          active={onBrainSpace}
          count={notesCount}
        />
      )}
      <SortableDocList
        docs={docs}
        sectionId={sec.id}
        activeDocId={activeDocId}
        canManage={canManage}
        docHref={docHref}
      />
      <MaybeAddInput sectionId={sec.id} add={add} />
      {showEmpty && <SectionEmpty sectionId={sec.id} />}
    </div>
  );
};
