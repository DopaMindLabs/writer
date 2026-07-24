import type { ComponentProps } from 'react';
import { CSS, useSortable } from '@/components/libs/dnd';
import { cn } from '@/lib/utils';
import { SidebarSection } from './SidebarSection';

type SortableSectionProps = Omit<
  ComponentProps<typeof SidebarSection>,
  'dragActivator'
>;

/**
 * Makes a {@link SidebarSection} draggable by its header: press and hold the
 * header to reorder top-level sections (or use the keyboard once it is focused).
 * The whole section block is the moved node; only the header is the grab
 * surface, so dragging a document inside starts a document drag, not this one.
 * Dragging is disabled when the template locks its structure.
 */
export const SortableSection = (props: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.sec.id, disabled: !props.canManage });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`sidebar-section-${props.sec.id}-sortable`}
      className={cn('relative', isDragging && 'z-10 opacity-70')}
    >
      <SidebarSection
        {...props}
        dragActivator={
          props.canManage
            ? { ref: setActivatorNodeRef, attributes, listeners }
            : undefined
        }
      />
    </div>
  );
};
