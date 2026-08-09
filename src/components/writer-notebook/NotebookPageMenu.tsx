import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotebookPageMenuProps {
  readonly canMoveEarlier: boolean;
  readonly canMoveLater: boolean;
  readonly onRotate: () => void;
  readonly onMoveEarlier: () => void;
  readonly onMoveLater: () => void;
  readonly onDelete: () => void;
}

export const NotebookPageMenu = (props: NotebookPageMenuProps) => {
  const { t } = useTranslation('screens');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const select = (run: () => void) => (event: Event): void => {
    event.preventDefault();
    setMenuOpen(false);
    run();
  };
  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild><IconButton icon={MoreHorizontal} label={t('notebook.pageActions')} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={select(props.onRotate)}>{t('notebook.rotateClockwise')}</DropdownMenuItem>
          <DropdownMenuItem disabled={!props.canMoveEarlier} onSelect={select(props.onMoveEarlier)}>{t('notebook.moveEarlier')}</DropdownMenuItem>
          <DropdownMenuItem disabled={!props.canMoveLater} onSelect={select(props.onMoveLater)}>{t('notebook.moveLater')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={select(() => { setDeleteOpen(true); })}>{t('notebook.deletePage')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={t('notebook.deletePageTitle')} description={t('notebook.deletePageDescription')} confirmLabel={t('notebook.deletePage')} cancelLabel={t('notebook.cancel')} confirmKind="dangerous" onConfirm={props.onDelete} />
    </>
  );
};
