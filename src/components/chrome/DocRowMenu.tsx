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
import type { Doc } from '@/db/schema';
import { RenameDocDialog } from './RenameDocDialog';

export const DocRowMenu = ({ doc }: { doc: Doc }) => {
  const { t } = useTranslation('chrome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            data-testid={`sidebar-doc-${doc.id}-menu`}
            icon={MoreVertical}
            iconSize="xs"
            strokeWidth={1.25}
            label={t('sidebar.docMenuAria', { name: doc.name })}
            className="text-ink-4 md:hidden"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid={`sidebar-doc-${doc.id}-rename`}
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setRenameOpen(true);
            }}
          >
            {t('sidebar.renameDoc')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDocDialog
        docId={doc.id}
        docName={doc.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
    </>
  );
};
