import { useTranslation } from 'react-i18next';
import {
  DndContext,
  SortableContext,
  closestCenter,
  verticalListSortingStrategy,
  type Announcements,
  type DragCancelEvent,
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

/**
 * dnd-kit's default announcements read raw item ids, so they are silenced at
 * the source — every callback returns undefined, leaving its live region empty
 * — while the sidebar's own labelled announcer ({@link useDragAnnounce})
 * narrates drags in human-readable terms. The region also lives in an
 * `aria-hidden` host so its `role="status"` node never collides with the app's
 * own status regions (queries and announcers alike). The keyboard instructions
 * (`screenReaderInstructions` below) share that host, which loses nothing:
 * `aria-describedby` references are resolved into a control's accessible
 * description regardless of the target's visibility, exactly as dnd-kit's own
 * `display: none` instructions element relies on.
 */
const SILENT_ANNOUNCEMENTS: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

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
  const { t } = useTranslation('chrome');
  const sensors = useSortableSensors();
  const host = useHiddenLiveRegionHost();
  const { orderedSections, sectionIds, onDragStart, onDragEnd, onDragCancel } =
    useSidebarDrag(props.topSections, props.docsForSection);
  const { announcement, announceStart, announceEnd, announceCancel } =
    useDragAnnounce(props.topSections, props.docsForSection);

  const handleStart = (event: DragStartEvent): void => {
    announceStart(event);
    onDragStart();
  };
  const handleEnd = (event: DragEndEvent): void => {
    announceEnd(event);
    onDragEnd(event);
  };
  const handleCancel = (event: DragCancelEvent): void => {
    announceCancel(event);
    onDragCancel();
  };

  return (
    <DndContext
      id="sidebar-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        container: host,
        announcements: SILENT_ANNOUNCEMENTS,
        screenReaderInstructions: {
          draggable: t('sidebar.dragInstructions'),
        },
      }}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={handleCancel}
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
