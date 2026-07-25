import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/ui/TextField';
import type { Doc } from '@/db/schema';
import type { InlineRename } from './Sidebar.types';

interface DocRenameFieldProps {
  doc: Doc;
  rename: InlineRename;
}

/**
 * The document row's inline rename field. A failed commit keeps the field open
 * and renders its message as an accessible inline error (`aria-invalid` +
 * `role="alert"`), wired to the input via `aria-describedby`.
 */
export const DocRenameField = ({ doc, rename }: DocRenameFieldProps) => {
  const { t } = useTranslation('chrome');
  const errorId = `sidebar-doc-${doc.id}-rename-error`;
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TextField
        variant="bare"
        autoFocus
        value={rename.draft}
        onChange={(e) => { rename.setDraft(e.target.value); }}
        onBlur={() => { void rename.commit(); }}
        onFocus={(e) => { e.currentTarget.select(); }}
        onKeyDown={rename.onKeyDown}
        aria-label={t('sidebar.renameDocAria', { name: doc.name })}
        aria-invalid={rename.error !== null || undefined}
        aria-describedby={rename.error !== null ? errorId : undefined}
        data-testid={`sidebar-doc-${doc.id}-rename-input`}
        className="flex-1 py-1.5 text-[13px]"
      />
      {rename.error !== null && (
        <span
          id={errorId}
          role="alert"
          data-testid={`sidebar-doc-${doc.id}-rename-error`}
          className="pb-1 text-[11px] text-danger"
        >
          {rename.error}
        </span>
      )}
    </div>
  );
};
