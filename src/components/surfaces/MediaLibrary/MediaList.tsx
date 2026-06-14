import type { MediaItem } from '@/db/schema';
import { MediaListRow } from './MediaListRow';

interface MediaListProps {
  items: MediaItem[];
  selectedId: string | null;
  onSelect: (mediaItemId: string) => void;
  onDelete: (mediaItemId: string) => void;
}

export const MediaList = ({
  items,
  selectedId,
  onSelect,
  onDelete,
}: MediaListProps) => (
  <div className="flex flex-col gap-1" data-testid="media-list">
    {items.map((item) => (
      <MediaListRow
        key={item.id}
        item={item}
        active={item.id === selectedId}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    ))}
  </div>
);
