import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteMediaCascade } from '@/lib/media';
import type { MediaItem } from '@/db/schema';

interface MediaRowMenuProps {
  item: MediaItem;
  onOpen: (item: MediaItem) => void;
}

/**
 * The library row's hover-revealed ⋮ menu: Open and Delete…. Mirrors
 * `DocRowMenu` (Radix dropdown + confirm dialog) and reuses the card's delete
 * copy and the `deleteMediaCascade` facade, so a row deletes exactly as a card did.
 */
export const MediaRowMenu = ({ item, onOpen }: MediaRowMenuProps) => {
  const { t } = useTranslation('screens');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            data-testid={`media-row-${item.id}-menu`}
            icon={MoreVertical}
            iconSize="xs"
            strokeWidth={1.25}
            label={t('mediaLibrary.row.menuAria', { name: item.name })}
            className="relative z-10 text-ink-4 transition-opacity hover:bg-transparent data-[state=open]:bg-transparent md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid={`media-row-${item.id}-menu-open`}
            onSelect={() => { onOpen(item); }}
          >
            {t('mediaLibrary.row.menuOpen')}
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid={`media-row-${item.id}-menu-delete`}
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            {t('mediaLibrary.row.menuDelete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('mediaLibrary.card.deleteTitle')}
        description={t('mediaLibrary.card.deleteDescription')}
        confirmLabel={t('mediaLibrary.card.deleteConfirm')}
        cancelLabel={t('mediaLibrary.card.deleteCancel')}
        confirmKind="dangerous"
        onConfirm={() => { void deleteMediaCascade(item.id); }}
      />
    </>
  );
};
