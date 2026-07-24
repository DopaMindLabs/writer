import { useTranslation } from 'react-i18next';
import { ChevronDown } from '@/components/libs/icons';
import { Eyebrow } from '@/components/ui/Eyebrow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MediaSort } from '@/lib/media/libraryView';

interface MediaSortMenuProps {
  value: MediaSort;
  onChange: (sort: MediaSort) => void;
}

const OPTIONS: { value: MediaSort; labelKey: string }[] = [
  { value: 'recent', labelKey: 'mediaLibrary.list.sortRecent' },
  { value: 'name', labelKey: 'mediaLibrary.list.sortName' },
  { value: 'pages', labelKey: 'mediaLibrary.list.sortPages' },
];

/** The sort dropdown: a mono `SORT: {value} ▾` trigger over the three orders. */
export const MediaSortMenu = ({ value, onChange }: MediaSortMenuProps) => {
  const { t } = useTranslation('screens');
  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="media-library-sort"
          aria-label={t('mediaLibrary.list.sortLabel')}
          className="flex items-center gap-1 text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        >
          <Eyebrow>{t('mediaLibrary.list.sortValue', { value: t(current.labelKey) })}</Eyebrow>
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            data-testid={`media-library-sort-${option.value}`}
            onSelect={() => { onChange(option.value); }}
          >
            {t(option.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
