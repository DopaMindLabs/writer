import type { ComponentProps } from 'react';
import { CSS, useSortable } from '@/components/libs/dnd';
import { isWorkshopSection } from '@/lib/sections';
import { cn } from '@/lib/utils';
import { SidebarSection } from './SidebarSection';

type SortableSectionProps = Omit<
  ComponentProps<typeof SidebarSection>,
  'dragActivator'
>;

/**
 * Makes a {@link SidebarSection} draggable by its header: press the header and
 * move to reorder top-level sections (long-press on touch, or use the keyboard
 * once it is focused).
 * The whole section block is the moved node; only the header is the grab
 * surface, so dragging a document inside starts a document drag, not this one.
 * Dragging is disabled when the template locks its structure, and the reserved
 * Workshop section is never draggable so it keeps its place — but it stays a
 * drop target (object-form `disabled`), or an empty Workshop could never
 * receive a document again.
 */
export const SortableSection = (props: SortableSectionProps) => {
  const draggable = props.canManage && !isWorkshopSection(props.sec);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.sec.id,
    disabled: { draggable: !draggable, droppable: !props.canManage },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`sidebar-section-${props.sec.id}-sortable`}
      data-dragging={isDragging ? 'true' : undefined}
      className={cn('relative', isDragging && 'z-10 opacity-70')}
    >
      <SidebarSection
        {...props}
        dragActivator={
          draggable
            ? { ref: setActivatorNodeRef, attributes, listeners }
            : undefined
        }
      />
    </div>
  );
};
