import { useTranslation } from 'react-i18next';
import { renameSection, isWorkshopLabel, isWorkshopSection } from '@/lib/sections';
import type { Section } from '@/db/schema';
import { cn } from '@/lib/utils';
import type { DragActivator } from './Sidebar.types';
import { surfaceDragProps } from './dragListeners';
import { useInlineRename } from './useInlineRename';
import { SectionLabel } from './SectionLabel';
import { SectionRowMenu } from './SectionRowMenu';

interface SectionHeaderProps {
  section: Section;
  docCount: number;
  containsActiveDoc: boolean;
  /** Whether the space's template lets its sections be managed. */
  canManage: boolean;
  indented?: boolean;
  onAdd: () => void;
  onAddNotebook: () => void;
  dragActivator?: DragActivator;
}

export const SectionHeader = ({
  section,
  docCount,
  containsActiveDoc,
  canManage,
  indented = false,
  onAdd,
  onAddNotebook,
  dragActivator,
}: SectionHeaderProps) => {
  const { t } = useTranslation('chrome');
  const rename = useInlineRename(section.label, async (next) => {
    // Pre-validate the reserved label with user-facing copy; the service's
    // invariant remains the backstop.
    if (isWorkshopLabel(next)) {
      throw new Error(t('sidebar.renameSectionReserved'));
    }
    await renameSection(section.id, next);
  });
  const isWorkshop = isWorkshopSection(section);
  const canModify = canManage && !isWorkshop;
  const dragProps = dragActivator
    ? surfaceDragProps(dragActivator.attributes, dragActivator.listeners)
    : {};
  return (
    <div
      ref={dragActivator?.ref}
      data-testid={`sidebar-section-${section.id}-header`}
      className={cn(
        'group flex items-center gap-1 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4',
        indented ? 'pl-7' : 'pl-5',
        dragActivator &&
          'cursor-grab focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink active:cursor-grabbing',
      )}
      {...dragProps}
    >
      <SectionLabel
        sectionId={section.id}
        label={section.label}
        canModify={canModify}
        rename={rename}
      />
      <SectionRowMenu
        section={section}
        docCount={docCount}
        containsActiveDoc={containsActiveDoc}
        canModify={canModify}
        isWorkshop={isWorkshop}
        onAddDoc={onAdd}
        onAddNotebook={onAddNotebook}
        onRename={rename.beginEdit}
      />
    </div>
  );
};
