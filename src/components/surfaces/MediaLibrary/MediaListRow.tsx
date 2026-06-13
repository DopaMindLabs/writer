import type { MediaItem } from '@/db/schema';
import { Trash2 } from '@/components/libs/icons';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { IconButton } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface MediaListRowProps {
  item: MediaItem;
  active: boolean;
  onSelect: (mediaItemId: string) => void;
  onDelete: (mediaItemId: string) => void;
}

export const MediaListRow = ({
  item,
  active,
  onSelect,
  onDelete,
}: MediaListRowProps) => (
  <div
    data-testid={`media-row-${item.id}`}
    className={cn(
      'flex items-center justify-between gap-2 border bg-paper px-3 py-2',
      active ? 'border-ink' : 'border-rule hover:border-ink',
    )}
  >
    <button
      type="button"
      onClick={() => { onSelect(item.id); }}
      aria-current={active ? 'true' : undefined}
      data-testid={`media-row-${item.id}-select`}
      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
    >
      <span
        className="w-full truncate font-serif text-[14px] text-ink-2"
        title={item.name}
      >
        {item.name}
      </span>
      <Eyebrow size={9} tone="ink4">{`${String(item.pageCount)} pages`}</Eyebrow>
    </button>
    <IconButton
      icon={Trash2}
      iconSize="xs"
      label={`Delete ${item.name}`}
      onClick={() => { onDelete(item.id); }}
      data-testid={`media-row-${item.id}-delete`}
    />
  </div>
);
