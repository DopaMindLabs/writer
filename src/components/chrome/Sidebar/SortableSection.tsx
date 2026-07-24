import type { ComponentProps } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { GripVertical } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { SidebarSection } from './SidebarSection';

type SortableSectionProps = ComponentProps<typeof SidebarSection>;

/**
 * Wraps a {@link SidebarSection} as a sortable item: a hover-revealed grip
 * (pointer + keyboard draggable) reorders top-level sections. Dragging is
 * disabled when the template locks its structure.
 */
export const SortableSection = (props: SortableSectionProps) => {
  const { t } = useTranslation('chrome');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.sec.id, disabled: !props.canManage });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group/drag relative', isDragging && 'z-10 opacity-70')}
    >
      {props.canManage && (
        <IconButton
          icon={GripVertical}
          iconSize="xs"
          strokeWidth={1.25}
          label={t('sidebar.dragSection', { label: props.sec.label })}
          data-testid={`sidebar-section-${props.sec.id}-drag`}
          className="absolute -left-1 top-1.5 z-10 h-5 w-4 cursor-grab text-ink-4 opacity-0 hover:bg-transparent hover:text-ink focus-visible:opacity-100 group-hover/drag:opacity-100"
          {...attributes}
          {...listeners}
        />
      )}
      <SidebarSection {...props} />
    </div>
  );
};
