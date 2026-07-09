import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/ui/SearchField';
import { MediaFilterTabs } from './MediaFilterTabs';
import { MediaSortMenu } from './MediaSortMenu';
import type { MediaFilter, MediaSort } from '@/lib/media/libraryView';

interface MediaLibraryControlsProps {
  query: string;
  onQueryChange: (query: string) => void;
  filter: MediaFilter;
  onFilterChange: (filter: MediaFilter) => void;
  sort: MediaSort;
  onSortChange: (sort: MediaSort) => void;
}

/** The control row under the header: search, the filter tabs, and the sort menu,
 * seated on a single hairline. */
export const MediaLibraryControls = ({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: MediaLibraryControlsProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule pb-3">
      <SearchField
        value={query}
        onChange={(event) => { onQueryChange(event.target.value); }}
        onClear={() => { onQueryChange(''); }}
        placeholder={t('mediaLibrary.list.searchPlaceholder')}
        aria-label={t('mediaLibrary.list.searchLabel')}
        data-testid="media-library-search"
        className="w-full md:w-[260px]"
      />
      <MediaFilterTabs value={filter} onChange={onFilterChange} />
      <div className="ml-auto">
        <MediaSortMenu value={sort} onChange={onSortChange} />
      </div>
    </div>
  );
};
