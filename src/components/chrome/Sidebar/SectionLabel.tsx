import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/lib/utils';
import type { InlineRename } from './Sidebar.types';

interface SectionLabelProps {
  sectionId: string;
  label: string;
  /** Whether the section may be renamed (false for Workshop / locked templates). */
  canModify: boolean;
  rename: InlineRename;
}

/**
 * The section header's label: an inline rename field while editing, otherwise a
 * bare-Button trigger that starts the rename on double-click (only when the
 * section is modifiable).
 */
export const SectionLabel = ({
  sectionId,
  label,
  canModify,
  rename,
}: SectionLabelProps) => {
  const { t } = useTranslation('chrome');
  if (rename.editing) {
    const errorId = `sidebar-section-${sectionId}-rename-error`;
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
          aria-label={t('sidebar.renameSectionAria', { label })}
          aria-invalid={rename.error !== null || undefined}
          aria-describedby={rename.error !== null ? errorId : undefined}
          data-testid={`sidebar-section-${sectionId}-rename-input`}
          className="flex-1 font-mono text-[9px] uppercase tracking-[0.08em]"
        />
        {rename.error !== null && (
          <span
            id={errorId}
            role="alert"
            data-testid={`sidebar-section-${sectionId}-rename-error`}
            className="pt-0.5 font-mono text-[9px] normal-case tracking-normal text-danger"
          >
            {rename.error}
          </span>
        )}
      </div>
    );
  }
  return (
    <Button
      kind="bare"
      size="none"
      onDoubleClick={canModify ? rename.beginEdit : undefined}
      title={canModify ? t('sidebar.renameSection') : undefined}
      // The label is the header's body: pressing it may start a section drag
      // (its only press action is the double-click rename, which needs no move).
      data-drag-through=""
      data-testid={`sidebar-section-${sectionId}-label`}
      className={cn(
        'block flex-1 truncate text-left font-mono font-normal uppercase tracking-[0.08em]',
        canModify ? 'cursor-text' : 'cursor-default',
      )}
    >
      {label}
    </Button>
  );
};
