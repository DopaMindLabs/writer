import {
  DndContext,
  SortableContext,
  closestCenter,
  verticalListSortingStrategy,
  type DragEndEvent,
  type DragStartEvent,
} from '@/components/libs/dnd';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import type { Doc, Section } from '@/db/schema';
import type { AddController } from './Sidebar.types';
import { SortableSection } from './SortableSection';
import { useSortableSensors } from './useSortableSensors';
import { useSidebarDrag } from './useSidebarDrag';
import { useDragAnnounce } from './useDragAnnounce';
import { useHiddenLiveRegionHost } from './useHiddenLiveRegionHost';

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
 *
 * dnd-kit's built-in `role="status"` live region is portaled into an
 * `aria-hidden` host (see {@link useHiddenLiveRegionHost}) so it neither
 * collides with the app's status announcers nor reads raw ids; a labelled
 * announcer ({@link useDragAnnounce}) narrates drags instead.
 */
export const SortableSectionList = (props: SortableSectionListProps) => {
  const sensors = useSortableSensors();
  const host = useHiddenLiveRegionHost();
  const { orderedSections, sectionIds, onDragStart, onDragEnd } = useSidebarDrag(
    props.topSections,
    props.docsForSection,
  );
  const { announcement, announceStart, announceEnd } = useDragAnnounce(
    props.topSections,
    props.docsForSection,
  );

  const handleStart = (event: DragStartEvent): void => {
    announceStart(event);
    onDragStart();
  };
  const handleEnd = (event: DragEndEvent): void => {
    announceEnd(event);
    onDragEnd(event);
  };

  return (
    <DndContext
      id="sidebar-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ container: host }}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
    >
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
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
