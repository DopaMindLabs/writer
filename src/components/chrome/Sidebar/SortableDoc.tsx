import { CSS, useSortable } from '@/components/libs/dnd';
import type { Doc } from '@/db/schema';
import { cn } from '@/lib/utils';
import { DocLink } from './DocLink';
import { surfaceDragProps } from './dragListeners';

interface SortableDocProps {
  doc: Doc;
  href: string;
  active: boolean;
  canManage: boolean;
}

/**
 * Makes a {@link DocLink} draggable: press the row and move to reorder documents
 * within their section (long-press on touch, or use the keyboard once the row is
 * focused). A click or double-click still reaches the link — the mouse sensor
 * only engages once the pointer travels, and presses on the row's interactive
 * children never start a drag. Dragging is disabled when the template locks its
 * structure.
 */
export const SortableDoc = ({ doc, href, active, canManage }: SortableDocProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: doc.id, disabled: !canManage });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragProps = canManage ? surfaceDragProps(attributes, listeners) : {};
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`sidebar-doc-${doc.id}-sortable`}
      data-dragging={isDragging ? 'true' : undefined}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
        canManage && 'cursor-grab active:cursor-grabbing',
        isDragging && 'relative z-10 opacity-70',
      )}
      {...dragProps}
    >
      <DocLink doc={doc} href={href} active={active} canManage={canManage} />
    </div>
  );
};
