import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TypographyP } from '@/components/ui/typography';
import { useMediaItems } from '@/hooks/useMediaItems';
import { MediaUploadButton } from './MediaUploadButton';
import { MediaPickerRow } from './MediaPickerRow';
import type { MediaItem } from '@/db/schema';

interface MediaPickerDialogProps {
  spaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mediaItemId: string) => void;
}

/**
 * Picks a library PDF to attach to a note. Composes the DS dialog with the
 * media library's own upload button and item list; uploading inside the picker
 * selects the new item immediately. Single tab — URL attachment is deferred.
 */
export const MediaPickerDialog = ({
  spaceId,
  open,
  onOpenChange,
  onSelect,
}: MediaPickerDialogProps) => {
  const { t } = useTranslation('screens');
  const items = useMediaItems(spaceId);

  const select = useCallback(
    (id: string) => {
      onSelect(id);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  const handleUploaded = useCallback(
    (item: MediaItem) => {
      select(item.id);
    },
    [select],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="media-picker" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('mediaPicker.title')}</DialogTitle>
          <DialogDescription>{t('mediaPicker.description')}</DialogDescription>
        </DialogHeader>
        <MediaUploadButton spaceId={spaceId} onUploaded={handleUploaded} />
        {items.length === 0 ? (
          <TypographyP variant="caption" data-testid="media-picker-empty" className="text-ink-3">
            {t('mediaPicker.empty')}
          </TypographyP>
        ) : (
          <ul data-testid="media-picker-list" className="flex max-h-72 flex-col gap-2 overflow-auto">
            {items.map((item) => (
              <MediaPickerRow key={item.id} item={item} onChoose={select} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
