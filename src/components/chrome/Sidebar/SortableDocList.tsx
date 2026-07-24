import {
  SortableContext,
  verticalListSortingStrategy,
} from '@/components/libs/dnd';
import type { Doc } from '@/db/schema';
import { SortableDoc } from './SortableDoc';

interface SortableDocListProps {
  docs: Doc[];
  activeDocId: string | null;
  canManage: boolean;
  docHref: (docId: string) => string;
}

/**
 * A section's sortable document list. It is a sortable context only — the
 * enclosing {@link SortableSectionList} owns the single DndContext, so a
 * document can be dragged from here into another section.
 */
export const SortableDocList = ({
  docs,
  activeDocId,
  canManage,
  docHref,
}: SortableDocListProps) => (
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
);
