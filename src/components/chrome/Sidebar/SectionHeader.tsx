import { useTranslation } from 'react-i18next';
import { Plus } from '@/components/libs/icons';
import { TextField } from '@/components/ui/TextField';
import { renameSection } from '@/lib/sections';
import { cn } from '@/lib/utils';
import { useInlineRename } from './useInlineRename';

export const SectionHeader = ({
  sectionId,
  label,
  indented = false,
  onAdd,
}: {
  sectionId: string;
  label: string;
  indented?: boolean;
  onAdd: () => void;
}) => {
  const { t } = useTranslation('chrome');
  const rename = useInlineRename(label, (next) =>
    renameSection(sectionId, next),
  );
  return (
    <div
      data-testid={`sidebar-section-${sectionId}-header`}
      className={cn(
        'group flex items-center gap-1 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4',
        indented ? 'pl-7' : 'pl-5',
      )}
    >
      {rename.editing ? (
        <TextField
          variant="bare"
          autoFocus
          value={rename.draft}
          onChange={(e) => { rename.setDraft(e.target.value); }}
          onBlur={() => { void rename.commit(); }}
          onFocus={(e) => { e.currentTarget.select(); }}
          onKeyDown={rename.onKeyDown}
          aria-label={t('sidebar.renameSectionAria', { label })}
          data-testid={`sidebar-section-${sectionId}-rename-input`}
          className="flex-1 font-mono text-[9px] uppercase tracking-[0.08em]"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={rename.beginEdit}
          title={t('sidebar.renameSection')}
          data-testid={`sidebar-section-${sectionId}-label`}
          className="flex-1 cursor-text truncate text-left uppercase"
        >
          {label}
        </button>
      )}
      <button
        type="button"
        onClick={onAdd}
        aria-label={t('sidebar.addDocAria', { label })}
        data-testid={`sidebar-section-${sectionId}-add`}
        className="rounded-sm text-ink-4 opacity-0 transition-opacity hover:text-ink focus:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
};
