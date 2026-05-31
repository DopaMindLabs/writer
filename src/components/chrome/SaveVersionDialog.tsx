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
import { useUI } from '@/store/ui';
import { db } from '@/db/db';
import { createRevision } from '@/lib/revisions';

interface SaveVersionDialogProps {
  docId: string;
}

interface SaveVersionFormProps {
  docId: string;
  onClose: () => void;
}

const saveLabelledVersion = (docId: string, label: string): void => {
  const trimmed = label.trim();
  void (async () => {
    const doc = await db.docs.get(docId);
    if (!doc) return;
    await createRevision(docId, doc.body, {
      kind: 'manual',
      label: trimmed || undefined,
    });
  })().catch((err: unknown) => {
    console.error('Failed to save version', err);
  });
};

const SaveVersionForm = ({ docId, onClose }: SaveVersionFormProps) => {
  const { t } = useTranslation('chrome');
  const [label, setLabel] = useState('');

  const onSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    saveLabelledVersion(docId, label);
    onClose();
  };

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-4">
      <TextField
        data-testid="save-version-label"
        aria-label={t('saveVersion.label')}
        placeholder={t('saveVersion.placeholder')}
        value={label}
        onChange={(e) => { setLabel(e.target.value); }}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button kind="secondary" size="sm" data-testid="save-version-cancel">
            {t('saveVersion.cancel')}
          </Button>
        </DialogClose>
        <Button
          kind="primary"
          size="sm"
          type="submit"
          data-testid="save-version-submit"
        >
          {t('saveVersion.save')}
        </Button>
      </div>
    </form>
  );
};

/**
 * Collects an optional label for a manual version snapshot via a DS dialog
 * (replacing the native `window.prompt`). Driven by the transient
 * `saveVersionOpen` flag in the UI store, mirroring `versionModalOpen`.
 */
export const SaveVersionDialog = ({ docId }: SaveVersionDialogProps) => {
  const { t } = useTranslation('chrome');
  const open = useUI((s) => s.saveVersionOpen);
  const setOpen = useUI((s) => s.setSaveVersionOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="save-version-dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('saveVersion.title')}</DialogTitle>
          <DialogDescription>{t('saveVersion.description')}</DialogDescription>
        </DialogHeader>
        {open && (
          <SaveVersionForm docId={docId} onClose={() => { setOpen(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
};
