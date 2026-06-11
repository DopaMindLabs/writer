import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { renameDoc } from '@/lib/doc-actions';

interface RenameDocDialogProps {
  docId: string;
  docName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RenameDocFormProps {
  docId: string;
  docName: string;
  onClose: () => void;
}

const RenameDocForm = ({ docId, docName, onClose }: RenameDocFormProps) => {
  const { t } = useTranslation('chrome');
  const [name, setName] = useState(docName);

  const onSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    void renameDoc(docId, name).catch((err: unknown) => {
      console.error('Failed to rename document', err);
    });
    onClose();
  };

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4">
      <TextField
        data-testid="rename-doc-input"
        aria-label={t('sidebar.renameDialog.label')}
        value={name}
        onChange={(e) => { setName(e.target.value); }}
        onFocus={(e) => { e.currentTarget.select(); }}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button kind="secondary" size="sm" data-testid="rename-doc-cancel">
            {t('sidebar.renameDialog.cancel')}
          </Button>
        </DialogClose>
        <Button
          kind="primary"
          size="sm"
          type="submit"
          data-testid="rename-doc-submit"
        >
          {t('sidebar.renameDialog.save')}
        </Button>
      </div>
    </form>
  );
};

/**
 * Renames a document via a small DS dialog. Opened from the sidebar
 * doc-row menu on mobile, where the topbar double-click rename and the
 * desktop inspector are unavailable.
 */
export const RenameDocDialog = ({
  docId,
  docName,
  open,
  onOpenChange,
}: RenameDocDialogProps) => {
  const { t } = useTranslation('chrome');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="rename-doc-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('sidebar.renameDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('sidebar.renameDialog.description')}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RenameDocForm
            docId={docId}
            docName={docName}
            onClose={() => { onOpenChange(false); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
