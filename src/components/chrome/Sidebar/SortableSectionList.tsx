import {
  DndContext,
  SortableContext,
  closestCenter,
  verticalListSortingStrategy,
} from '@/components/libs/dnd';
import type { Doc, Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SortableSection } from './SortableSection';
import { useSortableSensors } from './useSortableSensors';
import { useSidebarDrag } from './useSidebarDrag';

interface SortableSectionListProps {
  topSections: Section[];
  docsForSection: Map<string, Doc[]>;
  spaceId: string;
  activeDocId: string | null;
  onBrainSpace: boolean;
  notesCount: number;
  canManage: boolean;
  docHref: (docId: string) => string;
  startAdd: (sectionId: string, parentLabel: string, subLabel: string | null) => void;
  add: AddController;
}

/**
 * One drag space for the whole nav: sections reorder among themselves and
 * documents reorder within or move across sections. Positions come from
 * {@link useSidebarDrag}, which keeps an optimistic order so a drop lands
 * without a flash while it persists.
 */
export const SortableSectionList = (props: SortableSectionListProps) => {
  const sensors = useSortableSensors();
  const { orderedSections, sectionIds, onDragStart, onDragEnd } = useSidebarDrag(
    props.topSections,
    props.docsForSection,
  );
  return (
    <DndContext
      id="sidebar-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        {orderedSections.map(({ section, docs }) => (
          <SortableSection
            key={section.id}
            sec={section}
            docs={docs}
            spaceId={props.spaceId}
            activeDocId={props.activeDocId}
            onBrainSpace={props.onBrainSpace}
            notesCount={props.notesCount}
            canManage={props.canManage}
            docHref={props.docHref}
            startAdd={props.startAdd}
            add={props.add}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};
