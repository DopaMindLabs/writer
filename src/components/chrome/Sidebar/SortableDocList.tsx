import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { moveDoc } from '@/lib/docs';
import type { Doc } from '@/db/schema';
import { SortableDoc } from './SortableDoc';
import { useSortableSensors } from './useSortableSensors';

interface SortableDocListProps {
  docs: Doc[];
  sectionId: string;
  activeDocId: string | null;
  canManage: boolean;
  docHref: (docId: string) => string;
}

/**
 * The draggable document list for one section. A drop reorders within the
 * section via {@link moveDoc}; the target index is the position of the document
 * dropped onto (the same convention as `arrayMove`).
 */
export const SortableDocList = ({
  docs,
  sectionId,
  activeDocId,
  canManage,
  docHref,
}: SortableDocListProps) => {
  const sensors = useSortableSensors();
  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const overIndex = docs.findIndex((d) => d.id === over.id);
    if (overIndex < 0) return;
    void moveDoc({
      docId: String(active.id),
      toSectionId: sectionId,
      toIndex: overIndex,
    }).catch((err: unknown) => {
      console.error('Failed to move document', err);
    });
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={docs.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        {docs.map((d) => (
          <SortableDoc
            key={d.id}
            doc={d}
            href={docHref(d.id)}
            active={d.id === activeDocId}
            canManage={canManage}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};
