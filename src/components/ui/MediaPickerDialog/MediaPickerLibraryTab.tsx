import { useMediaBySpace } from '@/hooks/useMedia';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaPickerLibraryRow } from './MediaPickerLibraryRow';

interface MediaPickerLibraryTabProps {
  spaceId: string;
  onSelect: (mediaItemId: string) => void;
}

export const MediaPickerLibraryTab = ({
  spaceId,
  onSelect,
}: MediaPickerLibraryTabProps) => {
  const items = useMediaBySpace(spaceId);
  if (items.length === 0) {
    return (
      <EmptyState
        title="No PDFs yet"
        caption="Upload PDFs in the media library, then pick them here."
        data-testid="media-picker-library-empty"
      />
    );
  }
  return (
    <div
      className="flex max-h-72 flex-col gap-1 overflow-y-auto"
      data-testid="media-picker-library-list"
    >
      {items.map((item) => (
        <MediaPickerLibraryRow key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
};
