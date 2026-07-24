import type { Doc, Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SectionHeader } from './SectionHeader';
import { BrainSpaceLink } from './BrainSpaceLink';
import { DocLink } from './DocLink';
import { MaybeAddInput } from './MaybeAddInput';
import { SectionEmpty } from './SectionEmpty';

interface SidebarSectionProps {
  sec: Section;
  docs: Doc[];
  spaceId: string;
  activeDocId: string | null;
  onBrainSpace: boolean;
  notesCount: number;
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
  docHref,
  startAdd,
  add,
}: SidebarSectionProps) => {
  const isWorkshop = sec.label === 'Workshop';
  const showEmpty = docs.length === 0 && add.adding?.sectionId !== sec.id;
  return (
    <div data-testid={`sidebar-section-${sec.id}`} className="mb-2">
      <SectionHeader
        sectionId={sec.id}
        label={sec.label}
        onAdd={() => { startAdd(sec.id, sec.label, null); }}
      />
      {isWorkshop && (
        <BrainSpaceLink
          spaceId={spaceId}
          active={onBrainSpace}
          count={notesCount}
        />
      )}
      {docs.map((d) => (
        <DocLink
          key={d.id}
          doc={d}
          href={docHref(d.id)}
          active={d.id === activeDocId}
        />
      ))}
      <MaybeAddInput sectionId={sec.id} add={add} />
      {showEmpty && <SectionEmpty sectionId={sec.id} />}
    </div>
  );
};
