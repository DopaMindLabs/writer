import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaLibraryHeader } from '@/components/media/MediaLibraryHeader';
import { MediaLibraryDropOverlay } from '@/components/media/MediaLibraryDropOverlay';
import { MediaLibraryControls } from '@/components/media/MediaLibraryControls';
import { MediaLibraryList, type MediaSection } from '@/components/media/MediaLibraryList';
import { MediaLibraryFooter } from '@/components/media/MediaLibraryFooter';
import { useMediaItems } from '@/hooks/useMediaItems';
import { usePdfAnnotationCounts } from '@/hooks/usePdfAnnotationCounts';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useFileDrop } from '@/hooks/useFileDrop';
import {
  filterMedia,
  sortMedia,
  groupMediaByRecency,
  type MediaFilter,
  type MediaSort,
} from '@/lib/media/libraryView';
import { routes } from '@/lib/routes';
import type { MediaItem } from '@/db/schema';

interface MediaLibrarySurfaceProps {
  spaceId: string;
  /**
   * Overrides where a row's open lands. The standalone library screen
   * navigates to the full-page reader (the default); a split-view host passes
   * this so the PDF opens inside its own pane instead.
   */
  onOpenItem?: (item: MediaItem) => void;
}

/** Recent sort is grouped by date; name and pages sorts render as one flat list. */
const buildSections = (
  items: MediaItem[],
  sort: MediaSort,
  now: Date,
  labels: { today: string; week: string },
): MediaSection[] => {
  if (sort !== 'recent') {
    return items.length > 0 ? [{ key: 'flat', label: null, items }] : [];
  }
  return groupMediaByRecency(items, now).map((group) => ({
    key: group.id,
    label:
      group.kind === 'today'
        ? labels.today
        : group.kind === 'week'
          ? labels.week
          : group.monthLabel ?? '',
    items: group.items,
  }));
};

/**
 * A row's open lands on the host's override when given (a split pane keeping
 * the PDF in-pane), else navigates to the full-page reader.
 */
const openVia =
  (
    navigate: ReturnType<typeof useNavigate>,
    spaceId: string,
    onOpenItem?: (item: MediaItem) => void,
  ) =>
  (item: MediaItem): void => {
    if (onOpenItem) {
      onOpenItem(item);
      return;
    }
    void navigate(routes.mediaView(spaceId, item.id));
  };

/**
 * The library as a reading list: a counted header, a search/filter/sort control
 * row, the grouped rows, and a footer. Filtering, sorting and grouping are pure
 * (see `libraryView`); this surface owns only the view state and composition.
 */
export const MediaLibrarySurface = ({ spaceId, onOpenItem }: MediaLibrarySurfaceProps) => {
  const { t } = useTranslation('screens');
  const navigate = useNavigate();
  const items = useMediaItems(spaceId);
  const counts = usePdfAnnotationCounts(spaceId);
  const upload = useMediaUpload(spaceId);
  const drop = useFileDrop(upload.uploadFiles);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [sort, setSort] = useState<MediaSort>('recent');

  const openMedia = openVia(navigate, spaceId, onOpenItem);

  const visible = sortMedia(filterMedia(items, counts, filter, query), sort);
  const sections = buildSections(visible, sort, new Date(), {
    today: t('mediaLibrary.list.groupToday'),
    week: t('mediaLibrary.list.groupThisWeek'),
  });
  const annotationTotal = [...counts.values()].reduce((sum, n) => sum + n, 0);

  return (
    <section
      {...drop.handlers}
      data-testid="media-library-surface"
      aria-labelledby="media-library-heading"
      className="relative mx-auto min-h-full w-full max-w-5xl p-6"
    >
      {drop.dragging && <MediaLibraryDropOverlay />}
      <MediaLibraryHeader
        spaceId={spaceId}
        pdfCount={items.length}
        annotationCount={annotationTotal}
        upload={upload}
      />
      <MediaLibraryControls
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
      />
      {items.length === 0 ? (
        <EmptyState
          data-testid="media-library-empty"
          caption={t('mediaLibrary.emptyCaption')}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          data-testid="media-library-no-matches"
          caption={t('mediaLibrary.list.empty')}
        />
      ) : (
        <MediaLibraryList sections={sections} counts={counts} onOpen={openMedia} />
      )}
      <MediaLibraryFooter shown={visible.length} total={items.length} />
    </section>
  );
};
