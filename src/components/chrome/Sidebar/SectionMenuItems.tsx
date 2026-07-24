import { useTranslation } from 'react-i18next';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface SectionMenuItemsProps {
  sectionId: string;
  canModify: boolean;
  onAddDoc: (e: Event) => void;
  onRename: (e: Event) => void;
  onDelete: (e: Event) => void;
}

/**
 * The item list for a section's kebab menu. Every section can add a document;
 * rename and delete appear only when the section is modifiable. Rendered inside
 * a {@link SectionRowMenu}'s DropdownMenuContent.
 */
export const SectionMenuItems = ({
  sectionId,
  canModify,
  onAddDoc,
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
        {t('sidebar.sectionAddDoc')}
      </DropdownMenuItem>
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
