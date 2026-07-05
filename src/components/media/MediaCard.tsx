import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2 } from '@/components/libs/icons';
import { Icon, IconButton } from '@/components/ui/icon';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TypographyP } from '@/components/ui/typography';
import { formatBytes } from '@/components/settings/sync/syncFormat';
import { deleteMediaCascade } from '@/lib/media';
import type { MediaItem } from '@/db/schema';

interface MediaCardProps {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
}

export const MediaCard = ({ item, onOpen }: MediaCardProps) => {
  const { t } = useTranslation('screens');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const meta = t('mediaLibrary.card.meta', {
    pages: t('mediaLibrary.card.pages', { count: item.pageCount }),
    size: formatBytes(item.size),
  });

  return (
    <div
      data-testid={`media-card-${item.id}`}
      className="group relative flex items-start gap-3 border border-rule bg-paper p-4"
    >
      <Icon icon={FileText} size="md" className="mt-0.5 shrink-0 text-ink-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pr-6">
        <TypographyP
          variant="body"
          title={item.name}
          data-testid={`media-card-${item.id}-name`}
          className="truncate text-ink"
        >
          {item.name}
        </TypographyP>
        <Eyebrow data-testid={`media-card-${item.id}-meta`}>{meta}</Eyebrow>
      </div>

      {/* Stretched overlay: the whole card opens the document, while the delete
          button below sits above it (z-index) so its own clicks are not
          captured. Stage PC wires the destination route; until then onOpen. */}
      <Button
        kind="ghost"
        onClick={() => {
          onOpen(item);
        }}
        aria-label={t('mediaLibrary.card.openAria', { name: item.name })}
        data-testid={`media-card-${item.id}-open`}
        className="absolute inset-0 h-auto border-0 p-0"
      />
      <IconButton
        icon={Trash2}
        label={t('mediaLibrary.card.deleteAria', { name: item.name })}
        data-testid={`media-card-${item.id}-delete`}
        iconSize="xs"
        onClick={() => {
          setConfirmOpen(true);
        }}
        className="absolute right-2 top-2 z-10 text-ink-4 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('mediaLibrary.card.deleteTitle')}
        description={t('mediaLibrary.card.deleteDescription')}
        confirmLabel={t('mediaLibrary.card.deleteConfirm')}
        cancelLabel={t('mediaLibrary.card.deleteCancel')}
        confirmKind="dangerous"
        onConfirm={() => {
          void deleteMediaCascade(item.id);
        }}
      />
    </div>
  );
};
