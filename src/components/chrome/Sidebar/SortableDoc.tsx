import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { GripVertical } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import type { Doc } from '@/db/schema';
import { cn } from '@/lib/utils';
import { DocLink } from './DocLink';

interface SortableDocProps {
  doc: Doc;
  href: string;
  active: boolean;
  canManage: boolean;
}

/**
 * Wraps a {@link DocLink} as a sortable item: a hover-revealed grip (pointer +
 * keyboard draggable) reorders documents within their section. Dragging is
 * disabled when the template locks its structure.
 */
export const SortableDoc = ({ doc, href, active, canManage }: SortableDocProps) => {
  const { t } = useTranslation('chrome');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: doc.id, disabled: !canManage });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group/drag relative', isDragging && 'z-10 opacity-70')}
    >
      {canManage && (
        <IconButton
          icon={GripVertical}
          iconSize="xs"
          strokeWidth={1.25}
          label={t('sidebar.dragDoc', { name: doc.name })}
          data-testid={`sidebar-doc-${doc.id}-drag`}
          className="absolute -left-1 top-1/2 z-10 h-5 w-4 -translate-y-1/2 cursor-grab text-ink-4 opacity-0 hover:bg-transparent hover:text-ink focus-visible:opacity-100 group-hover/drag:opacity-100"
          {...attributes}
          {...listeners}
        />
      )}
      <DocLink doc={doc} href={href} active={active} />
    </div>
  );
};
