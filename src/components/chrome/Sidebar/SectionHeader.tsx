import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/ui/TextField';
import { renameSection, isWorkshopSection } from '@/lib/sections';
import type { Section } from '@/db/schema';
import { cn } from '@/lib/utils';
import { useInlineRename } from './useInlineRename';
import { SectionRowMenu } from './SectionRowMenu';

interface SectionHeaderProps {
  section: Section;
  docCount: number;
  containsActiveDoc: boolean;
  /** Whether the space's template lets its sections be managed. */
  canManage: boolean;
  indented?: boolean;
  onAdd: () => void;
}

export const SectionHeader = ({
  section,
  docCount,
  containsActiveDoc,
  canManage,
  indented = false,
  onAdd,
}: SectionHeaderProps) => {
  const { t } = useTranslation('chrome');
  const { id: sectionId, label } = section;
  const rename = useInlineRename(label, (next) => renameSection(sectionId, next));
  const canModify = canManage && !isWorkshopSection(section);
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
          onDoubleClick={canModify ? rename.beginEdit : undefined}
          title={canModify ? t('sidebar.renameSection') : undefined}
          data-testid={`sidebar-section-${sectionId}-label`}
          className={cn(
            'flex-1 truncate text-left uppercase',
            canModify ? 'cursor-text' : 'cursor-default',
          )}
        >
          {label}
        </button>
      )}
      <SectionRowMenu
        section={section}
        docCount={docCount}
        containsActiveDoc={containsActiveDoc}
        canModify={canModify}
        onAddDoc={onAdd}
        onRename={rename.beginEdit}
      />
    </div>
  );
};
