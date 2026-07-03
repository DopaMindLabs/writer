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
import { DeleteDocDialog } from './DeleteDocDialog';

interface DocRowMenuProps {
  doc: Doc;
  /** Whether this row's doc is the one currently open in the editor. */
  active: boolean;
}

export const DocRowMenu = ({ doc, active }: DocRowMenuProps) => {
  const { t } = useTranslation('chrome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
            className="text-ink-4 transition-opacity hover:bg-transparent data-[state=open]:bg-transparent md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
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
          <DropdownMenuItem
            data-testid={`sidebar-doc-${doc.id}-delete`}
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            {t('sidebar.deleteDoc')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDocDialog
        docId={doc.id}
        docName={doc.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteDocDialog
        doc={doc}
        isActiveDoc={active}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
};
