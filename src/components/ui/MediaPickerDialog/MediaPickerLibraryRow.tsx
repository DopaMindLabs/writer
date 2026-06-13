import type { MediaItem } from '@/db/schema';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface MediaPickerLibraryRowProps {
  item: MediaItem;
  onSelect: (mediaItemId: string) => void;
}

export const MediaPickerLibraryRow = ({
  item,
  onSelect,
}: MediaPickerLibraryRowProps) => (
  <button
    type="button"
    onClick={() => { onSelect(item.id); }}
    data-testid={`media-picker-row-${item.id}`}
    className="flex w-full items-center justify-between gap-3 border border-rule bg-paper px-3 py-2 text-left hover:border-ink"
  >
    <span className="min-w-0 flex-1 truncate font-serif text-[14px] text-ink-2" title={item.name}>
      {item.name}
    </span>
    <Eyebrow size={9} tone="ink4" className="shrink-0">
      {`${String(item.pageCount)} pages`}
    </Eyebrow>
  </button>
);
