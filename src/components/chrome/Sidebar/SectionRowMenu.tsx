import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Section } from '@/db/schema';
import { useDeferredMenuAction } from '@/components/chrome/useDeferredMenuAction';
import { DeleteSectionDialog } from './DeleteSectionDialog';
import { SectionMenuItems } from './SectionMenuItems';

interface SectionRowMenuProps {
  section: Section;
  docCount: number;
  containsActiveDoc: boolean;
  /** Whether rename/delete are offered (false for Workshop or locked templates). */
  canModify: boolean;
  /** The Workshop labels its add action "Add workspace" rather than "Add document". */
  isWorkshop: boolean;
  onAddDoc: () => void;
  onAddNotebook: () => void;
  onRename: () => void;
}

/**
 * Kebab menu on a section header. Every section can add a document; renaming and
 * deleting are offered only when the section is modifiable. Composed from the
 * design-system IconButton + DropdownMenu, mirroring DocRowMenu.
 */
export const SectionRowMenu = ({
  section,
  docCount,
  containsActiveDoc,
  canModify,
  isWorkshop,
  onAddDoc,
  onAddNotebook,
  onRename,
}: SectionRowMenuProps) => {
  const { t } = useTranslation('chrome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deferred = useDeferredMenuAction();
  const id = section.id;

  const select = (run: () => void) => (e: Event) => {
    e.preventDefault();
    setMenuOpen(false);
    run();
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            data-testid={`sidebar-section-${id}-menu`}
            icon={MoreVertical}
            iconSize="xs"
            strokeWidth={1.25}
            label={t('sidebar.sectionMenuAria', { label: section.label })}
            className="text-ink-4 transition-opacity hover:bg-transparent data-[state=open]:bg-transparent md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={deferred.onCloseAutoFocus}>
          <SectionMenuItems
            sectionId={id}
            canModify={canModify}
            isWorkshop={isWorkshop}
            onAddDoc={select(onAddDoc)}
            onAddNotebook={select(onAddNotebook)}
            onRename={select(() => { deferred.defer(onRename); })}
            onDelete={select(() => { setDeleteOpen(true); })}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteSectionDialog
        section={section}
        docCount={docCount}
        containsActiveDoc={containsActiveDoc}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
};
