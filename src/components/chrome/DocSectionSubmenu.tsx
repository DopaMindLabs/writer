import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchableMenuList } from '@/components/ui/SearchableMenuList';
import { useSections } from '@/hooks/useDocuments';
import { moveDoc } from '@/lib/docs';
import type { Doc } from '@/db/schema';

interface DocSectionSubmenuProps {
  doc: Doc;
  /** Closes the parent row menu once a target is chosen. */
  onDone: () => void;
}

// Append to the end of the target section; moveDoc clamps this to its length.
const APPEND = Number.MAX_SAFE_INTEGER;

/**
 * The "Move to section" branch of a document's row menu: a searchable list of
 * the space's top-level sections, the current one ticked. Subsections are not
 * offered yet (they stay a move target the data path already supports, just not
 * surfaced here). Selecting the current section is a no-op.
 */
export const DocSectionSubmenu = ({ doc, onDone }: DocSectionSubmenuProps) => {
  const { t } = useTranslation('chrome');
  const sections = useSections(doc.spaceId);
  const items = useMemo(
    () =>
      (sections ?? [])
        .filter((section) => section.parentSectionId === null)
        .map((section) => ({ id: section.id, label: section.label })),
    [sections],
  );
  const onSelect = (toSectionId: string): void => {
    onDone();
    if (toSectionId === doc.sectionId) return;
    void moveDoc({ docId: doc.id, toSectionId, toIndex: APPEND });
  };
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-testid={`sidebar-doc-${doc.id}-move`}>
        {t('sidebar.moveDocToSection')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64">
        <SearchableMenuList
          items={items}
          selectedId={doc.sectionId}
          onSelect={onSelect}
          label={t('sidebar.moveDocSearchAria')}
          placeholder={t('sidebar.moveDocSearch')}
          emptyLabel={t('sidebar.moveDocNoSections')}
          data-testid={`sidebar-doc-${doc.id}-move-list`}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
