import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MoreVertical } from '@/components/libs/icons';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/icon';
import { Link } from '@/components/ui/Link';
import { TextField } from '@/components/ui/TextField';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WriterNotebook } from '@/db/schema';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { createWriterNotebookSdk } from '@/lib/writerNotebookIntegration';
import { useDeferredMenuAction } from '@/components/chrome/useDeferredMenuAction';
import { useInlineRename } from './useInlineRename';

interface WriterNotebookLinkProps {
  readonly notebook: WriterNotebook;
  readonly pageCount: number;
  readonly active: boolean;
}

export const WriterNotebookLink = ({ notebook, pageCount, active }: WriterNotebookLinkProps) => {
  const { t } = useTranslation('chrome');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deferred = useDeferredMenuAction();
  const rename = useInlineRename(notebook.title, async (title) => {
    await createWriterNotebookSdk(notebook.spaceId).renameNotebook(notebook.id, title);
  });
  const beginRename = (event: Event): void => {
    event.preventDefault();
    setMenuOpen(false);
    deferred.defer(rename.beginEdit);
  };
  const beginDelete = (event: Event): void => {
    event.preventDefault();
    setMenuOpen(false);
    setDeleteOpen(true);
  };
  const deleteNotebook = async (): Promise<void> => {
    await createWriterNotebookSdk(notebook.spaceId).deleteNotebook(notebook.id);
    if (active) await navigate(routes.spaceWrite(notebook.spaceId));
  };
  const confirmDelete = (): void => {
    void deleteNotebook().catch((error: unknown) => {
      console.error('Failed to delete notebook', error);
    });
  };
  return (
    <>
      <div className={cn('group -ml-px flex items-center gap-2 border-l-2 pl-5', active ? 'border-ink bg-paper' : 'border-transparent hover:bg-paper')}>
        {rename.editing ? (
          <TextField autoFocus variant="bare" value={rename.draft} aria-label={t('sidebar.notebookRenameAria', { name: notebook.title })} onChange={(event) => { rename.setDraft(event.target.value); }} onBlur={() => { void rename.commit(); }} onKeyDown={rename.onKeyDown} className="min-w-0 flex-1 py-1.5 text-[13px]" />
        ) : (
          <Link to={routes.writerNotebook(notebook.spaceId, notebook.id)} data-testid={`sidebar-writer-notebook-${notebook.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
            <span className={cn('flex-1 truncate text-[13px]', active ? 'font-medium text-ink' : 'text-ink-2')}>{notebook.title}</span>
            <span aria-label={t('sidebar.notebookPageCount', { count: pageCount })} className="inline-flex h-3 min-w-3 items-center justify-center font-mono text-[10px] text-ink-4">{pageCount > 0 ? pageCount : '◌'}</span>
          </Link>
        )}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild><IconButton icon={MoreVertical} iconSize="xs" strokeWidth={1.25} label={t('sidebar.notebookMenuAria', { name: notebook.title })} className="text-ink-4 transition-opacity hover:bg-transparent data-[state=open]:bg-transparent md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={deferred.onCloseAutoFocus}>
            <DropdownMenuItem onSelect={beginRename}>{t('sidebar.sectionRename')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={beginDelete}>{t('sidebar.notebookDelete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('sidebar.deleteNotebookDialog.title')}
        description={t('sidebar.deleteNotebookDialog.description', { name: notebook.title })}
        confirmLabel={t('sidebar.deleteNotebookDialog.confirm')}
        cancelLabel={t('sidebar.deleteNotebookDialog.cancel')}
        confirmKind="dangerous"
        onConfirm={confirmDelete}
      />
    </>
  );
};
