import { useTranslation } from 'react-i18next';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface SectionMenuItemsProps {
  sectionId: string;
  canModify: boolean;
  /** The Workshop holds workspaces, so its add action is labelled accordingly. */
  isWorkshop: boolean;
  onAddDoc: (e: Event) => void;
  onAddNotebook: (e: Event) => void;
  onRename: (e: Event) => void;
  onDelete: (e: Event) => void;
}

/**
 * The item list for a section's kebab menu. Every section can add a document
 * (a workspace, for the Workshop); rename and delete appear only when the
 * section is modifiable. Rendered inside a {@link SectionRowMenu}'s
 * DropdownMenuContent.
 */
export const SectionMenuItems = ({
  sectionId,
  canModify,
  isWorkshop,
  onAddDoc,
  onAddNotebook,
  onRename,
  onDelete,
}: SectionMenuItemsProps) => {
  const { t } = useTranslation('chrome');
  return (
    <>
      <DropdownMenuItem
        data-testid={`sidebar-section-${sectionId}-add-doc`}
        onSelect={onAddDoc}
      >
        {t(isWorkshop ? 'sidebar.sectionAddWorkspace' : 'sidebar.sectionAddDoc')}
      </DropdownMenuItem>
      {isWorkshop && (
        <DropdownMenuItem
          data-testid={`sidebar-section-${sectionId}-add-notebook`}
          onSelect={onAddNotebook}
        >
          {t('sidebar.sectionAddNotebook')}
        </DropdownMenuItem>
      )}
      {canModify && (
        <DropdownMenuItem
          data-testid={`sidebar-section-${sectionId}-rename`}
          onSelect={onRename}
        >
          {t('sidebar.sectionRename')}
        </DropdownMenuItem>
      )}
      {canModify && (
        <DropdownMenuItem
          data-testid={`sidebar-section-${sectionId}-delete`}
          onSelect={onDelete}
        >
          {t('sidebar.sectionDelete')}
        </DropdownMenuItem>
      )}
    </>
  );
};
