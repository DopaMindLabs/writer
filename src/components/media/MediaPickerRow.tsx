import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { TypographyP } from '@/components/ui/typography';
import { formatBytes } from '@/components/settings/sync/syncFormat';
import type { MediaItem } from '@/db/schema';

interface MediaPickerRowProps {
  item: MediaItem;
  onChoose: (id: string) => void;
}

/** One compact library row in the picker: name, meta, and a Choose button. */
export const MediaPickerRow = ({ item, onChoose }: MediaPickerRowProps) => {
  const { t } = useTranslation('screens');
  const meta = t('mediaLibrary.card.meta', {
    pages: t('mediaLibrary.card.pages', { count: item.pageCount }),
    size: formatBytes(item.size),
  });

  return (
    <li className="flex items-center justify-between gap-3 border border-rule p-2">
      <div className="min-w-0">
        <TypographyP variant="body" className="truncate text-ink" title={item.name}>
          {item.name}
        </TypographyP>
        <Eyebrow>{meta}</Eyebrow>
      </div>
      <Button
        kind="secondary"
        size="sm"
        onClick={() => {
          onChoose(item.id);
        }}
        data-testid={`media-picker-choose-${item.id}`}
      >
        {t('mediaPicker.choose')}
      </Button>
    </li>
  );
};
