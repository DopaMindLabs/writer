import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { TypographyP } from '@/components/ui/typography';
import { formatBytes } from '@/components/settings/sync/syncFormat';
import { cn } from '@/lib/utils';
import { MediaRowMenu } from './MediaRowMenu';
import type { MediaItem } from '@/db/schema';

interface MediaRowProps {
  item: MediaItem;
  highlightCount: number;
  onOpen: (item: MediaItem) => void;
}

// The freshest rows (added within the hour) get an ink page glyph; older rows
// an ink-3 one, so a new upload reads at a glance.
const FRESH_MS = 3_600_000;

const formatAdded = (createdAt: number): string =>
  new Date(createdAt)
    .toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    .toUpperCase();

/**
 * One library row, laid out as a scannable table line: a page glyph, the serif
 * title, then fixed-width mono columns for pages, size, highlight count and the
 * added date. The whole row opens the reader (a stretched overlay button), with
 * a hover-revealed ⋮ menu above it for Open and Delete.
 */
export const MediaRow = ({ item, highlightCount, onOpen }: MediaRowProps) => {
  const { t } = useTranslation('screens');
  const fresh = Date.now() - item.createdAt < FRESH_MS;

  return (
    <div
      data-testid={`media-row-${item.id}`}
      className="group relative flex items-center gap-4 border-b border-rule px-2 py-2.5 hover:bg-paper-2"
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-[18px] w-[14px] shrink-0 border',
          fresh ? 'border-ink' : 'border-ink-3',
        )}
      />
      <div className="min-w-0 flex-1">
        <TypographyP variant="body" title={item.name} className="truncate text-ink">
          {item.name}
        </TypographyP>
      </div>
      <Eyebrow className="w-20 shrink-0">
        {t('mediaLibrary.card.pages', { count: item.pageCount })}
      </Eyebrow>
      <Eyebrow className="w-20 shrink-0">{formatBytes(item.size)}</Eyebrow>
      <Eyebrow
        data-testid="media-row-highlights"
        className={cn('w-24 shrink-0', highlightCount > 0 ? 'text-ink' : 'text-ink-4')}
      >
        {highlightCount > 0
          ? t('mediaLibrary.row.highlights', { count: highlightCount })
          : t('mediaLibrary.row.noHighlights')}
      </Eyebrow>
      <Eyebrow className="w-20 shrink-0 text-right text-ink-4">
        {formatAdded(item.createdAt)}
      </Eyebrow>

      {/* Stretched overlay opens the reader; the ⋮ menu sits above it (z-10) so
          its own clicks are not captured. */}
      <Button
        kind="ghost"
        onClick={() => { onOpen(item); }}
        aria-label={t('mediaLibrary.card.openAria', { name: item.name })}
        data-testid={`media-row-${item.id}-open`}
        className="absolute inset-0 h-auto border-0 p-0"
      />
      <MediaRowMenu item={item} onOpen={onOpen} />
    </div>
  );
};
