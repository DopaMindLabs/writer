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
 * Makes a {@link DocLink} draggable: press and hold the row to reorder documents
 * within their section (or use the keyboard once the row is focused). A quick
 * click still follows the link — the pointer sensor only engages on a hold.
 * Dragging is disabled when the template locks its structure.
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
      <DocLink doc={doc} href={href} active={active} />
    </div>
  );
};
