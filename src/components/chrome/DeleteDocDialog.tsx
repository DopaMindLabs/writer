import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteDocCascade } from '@/lib/docs';
import { routes } from '@/lib/routes';
import type { Doc } from '@/db/schema';

interface DeleteDocDialogProps {
  doc: Doc;
  /** Whether this doc is the one currently open in the editor. */
  isActiveDoc: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for permanently deleting a document. On confirm it cascades
 * the delete (annotations, revisions, CRDT state) and — if the deleted doc was
 * the open one — navigates back to the space so the first remaining doc loads.
 */
export const DeleteDocDialog = ({
  doc,
  isActiveDoc,
  open,
  onOpenChange,
}: DeleteDocDialogProps) => {
  const { t } = useTranslation('chrome');
  const navigate = useNavigate();

  const runDelete = async (): Promise<void> => {
    await deleteDocCascade(doc.id);
    if (isActiveDoc) await navigate(routes.spaceWrite(doc.spaceId));
  };

  const handleConfirm = (): void => {
    void runDelete().catch((err: unknown) => {
      console.error('Failed to delete document', err);
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('sidebar.deleteDialog.title')}
      description={t('sidebar.deleteDialog.description', { name: doc.name })}
      confirmLabel={t('sidebar.deleteDialog.confirm')}
      cancelLabel={t('sidebar.deleteDialog.cancel')}
      confirmKind="dangerous"
      onConfirm={handleConfirm}
    />
  );
};
