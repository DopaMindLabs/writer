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
import { useDeferredMenuAction } from './useDeferredMenuAction';
import { DeleteDocDialog } from './DeleteDocDialog';
import { MoveDocSubmenu } from './MoveDocSubmenu';

interface DocRowMenuProps {
  doc: Doc;
  /** Whether this row's doc is the one currently open in the editor. */
  active: boolean;
  /** Begins the row's inline rename (the same one double-click opens). */
  onRename: () => void;
}

export const DocRowMenu = ({ doc, active, onRename }: DocRowMenuProps) => {
  const { t } = useTranslation('chrome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deferred = useDeferredMenuAction();

  const select = (run: () => void) => (e: Event) => {
    e.preventDefault();
    setMenuOpen(false);
    run();
  };

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
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={deferred.onCloseAutoFocus}
        >
          <DropdownMenuItem
            data-testid={`sidebar-doc-${doc.id}-rename`}
            onSelect={select(() => {
              deferred.defer(onRename);
            })}
          >
            {t('sidebar.renameDoc')}
          </DropdownMenuItem>
          <MoveDocSubmenu doc={doc} />
          <DropdownMenuItem
            data-testid={`sidebar-doc-${doc.id}-delete`}
            onSelect={select(() => {
              setDeleteOpen(true);
            })}
          >
            {t('sidebar.deleteDoc')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDocDialog
        doc={doc}
        isActiveDoc={active}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
};
