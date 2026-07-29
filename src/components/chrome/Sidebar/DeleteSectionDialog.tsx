import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteSectionCascade } from '@/lib/sections';
import { routes } from '@/lib/routes';
import type { Section } from '@/db/schema';

interface DeleteSectionDialogProps {
  section: Section;
  /** Total documents that will be deleted (this section plus its subsections). */
  docCount: number;
  /** Whether the document currently open in the editor lives in this section. */
  containsActiveDoc: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for permanently deleting a section. When the section
 * still holds documents the copy names the count so the loss is explicit; on
 * confirm it cascades the delete (documents, annotations, revisions, CRDT
 * state) and — if the open document lived inside — navigates back to the space.
 */
export const DeleteSectionDialog = ({
  section,
  docCount,
  containsActiveDoc,
  open,
  onOpenChange,
}: DeleteSectionDialogProps) => {
  const { t } = useTranslation('chrome');
  const navigate = useNavigate();

  const runDelete = async (): Promise<void> => {
    await deleteSectionCascade(section.id);
    if (containsActiveDoc) await navigate(routes.spaceWrite(section.spaceId));
  };

  const handleConfirm = (): void => {
    void runDelete().catch((err: unknown) => {
      console.error('Failed to delete section', err);
    });
  };

  const description =
    docCount === 0
      ? t('sidebar.deleteSectionDialog.descriptionEmpty', { label: section.label })
      : t('sidebar.deleteSectionDialog.description', {
          label: section.label,
          count: docCount,
        });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('sidebar.deleteSectionDialog.title')}
      description={description}
      confirmLabel={t('sidebar.deleteSectionDialog.confirm')}
      cancelLabel={t('sidebar.deleteSectionDialog.cancel')}
      confirmKind="dangerous"
      onConfirm={handleConfirm}
    />
  );
};
