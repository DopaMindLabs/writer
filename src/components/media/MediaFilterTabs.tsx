import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MediaFilter } from '@/lib/media/libraryView';

interface MediaFilterTabsProps {
  value: MediaFilter;
  onChange: (filter: MediaFilter) => void;
}

const TABS: { value: MediaFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'mediaLibrary.list.filterAll' },
  { value: 'unread', labelKey: 'mediaLibrary.list.filterUnread' },
  { value: 'annotated', labelKey: 'mediaLibrary.list.filterAnnotated' },
];

const tabClass = (active: boolean): string =>
  cn(
    'border-b-2 pb-1 font-sans text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
    active ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink',
  );

/**
 * The library's filter tabs: All / Unread / Annotated, plus a Cited tab that is
 * inert (aria-disabled, not clickable) with a tooltip explaining why — citation
 * links do not exist yet, and a disabled tab keeps the design's geometry honest.
 */
export const MediaFilterTabs = ({ value, onChange }: MediaFilterTabsProps) => {
  const { t } = useTranslation('screens');

  return (
    <div
      role="tablist"
      aria-label={t('mediaLibrary.list.filtersLabel')}
      className="flex items-center gap-4"
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          data-testid={`media-library-filter-${tab.value}`}
          onClick={() => { onChange(tab.value); }}
          className={tabClass(value === tab.value)}
        >
          {t(tab.labelKey)}
        </button>
      ))}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="tab"
              aria-selected={false}
              aria-disabled
              data-testid="media-library-filter-cited"
              className={cn(tabClass(false), 'cursor-not-allowed text-ink-4 hover:text-ink-4')}
            >
              {t('mediaLibrary.list.filterCited')}
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('mediaLibrary.list.citedUnavailable')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
