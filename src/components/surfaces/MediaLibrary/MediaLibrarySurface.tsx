import { useMemo, useState } from 'react';
import { useMediaBySpace } from '@/hooks/useMedia';
import { deleteMediaItem } from '@/lib/media';
import { MediaUploadButton } from './MediaUploadButton';
import { MediaListSearch } from './MediaListSearch';
import { MediaList } from './MediaList';
import { MediaViewerPane } from './MediaViewerPane';
import { MediaEmptyState } from './MediaEmptyState';

interface MediaLibrarySurfaceProps {
  spaceId: string;
}

export const MediaLibrarySurface = ({ spaceId }: MediaLibrarySurfaceProps) => {
  const items = useMediaBySpace(spaceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const handleDelete = (id: string) => {
    void deleteMediaItem(id).then(() => {
      setSelectedId((cur) => (cur === id ? null : cur));
    });
  };

  return (
    <div className="flex min-h-0 flex-1" data-testid="media-library">
      <div className="flex w-80 shrink-0 flex-col gap-3 border-r border-rule p-3">
        <MediaUploadButton spaceId={spaceId} onUploaded={setSelectedId} />
        {items.length > 0 ? (
          <>
            <MediaListSearch query={query} onChange={setQuery} />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <MediaList
                items={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDelete={handleDelete}
              />
            </div>
          </>
        ) : (
          <MediaEmptyState />
        )}
      </div>
      <MediaViewerPane item={selected} />
    </div>
  );
};
