import { useMediaBySpace } from '@/hooks/useMedia';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaUploadButton } from '@/components/surfaces/MediaLibrary/MediaUploadButton';
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
  return (
    <div className="flex flex-col gap-2">
      <MediaUploadButton spaceId={spaceId} onUploaded={onSelect} />
      {items.length === 0 ? (
        <EmptyState
          title="No PDFs in this space yet"
          caption="Upload a PDF above to add it to this note and your library."
          data-testid="media-picker-library-empty"
        />
      ) : (
        <div
          className="flex max-h-72 flex-col gap-1 overflow-y-auto"
          data-testid="media-picker-library-list"
        >
          {items.map((item) => (
            <MediaPickerLibraryRow
              key={item.id}
              item={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
