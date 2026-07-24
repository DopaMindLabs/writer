import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { reorderSection } from '@/lib/sections';
import type { Doc, Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SortableSection } from './SortableSection';
import { useSortableSensors } from './useSortableSensors';

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
 * The draggable list of top-level sections. A drop reorders them via
 * {@link reorderSection}; the target index is the position of the section
 * dropped onto (the `arrayMove` convention).
 */
export const SortableSectionList = (props: SortableSectionListProps) => {
  const { topSections, docsForSection } = props;
  const sensors = useSortableSensors();
  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const overIndex = topSections.findIndex((s) => s.id === over.id);
    if (overIndex < 0) return;
    void reorderSection(String(active.id), overIndex).catch((err: unknown) => {
      console.error('Failed to reorder section', err);
    });
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={topSections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        {topSections.map((sec) => (
          <SortableSection
            key={sec.id}
            sec={sec}
            docs={docsForSection.get(sec.id) ?? []}
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
