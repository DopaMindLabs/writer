import { SearchField } from '@/components/ui/SearchField';

interface MediaListSearchProps {
  query: string;
  onChange: (query: string) => void;
}

export const MediaListSearch = ({ query, onChange }: MediaListSearchProps) => (
  <SearchField
    value={query}
    onChange={(e) => { onChange(e.target.value); }}
    onClear={() => { onChange(''); }}
    clearLabel="Clear search"
    placeholder="Search PDFs"
    data-testid="media-search"
  />
);
