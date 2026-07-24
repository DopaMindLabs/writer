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
import { DeleteSectionDialog } from './DeleteSectionDialog';
import { SectionMenuItems } from './SectionMenuItems';

interface SectionRowMenuProps {
  section: Section;
  docCount: number;
  containsActiveDoc: boolean;
  /** Whether rename/delete are offered (false for Workshop or locked templates). */
  canModify: boolean;
  onAddDoc: () => void;
  onRename: () => void;
}

/**
 * Kebab menu on a section header. Every section can add a document; renaming and
 * deleting are offered only when the section is modifiable. Composed from the
 * design-system IconButton + DropdownMenu, mirroring DocRowMenu.
 */
export const SectionRowMenu = (props: SectionRowMenuProps) => {
  const { section, docCount, containsActiveDoc, canModify, onAddDoc, onRename } =
    props;
  const { t } = useTranslation('chrome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingRename, setPendingRename] = useState(false);
  const id = section.id;

  const select = (run: () => void) => (e: Event) => {
    e.preventDefault();
    setMenuOpen(false);
    run();
  };
  // Begin the inline rename only once the menu has finished closing: doing it
  // earlier lets the menu's focus teardown blur and commit the rename field.
  const closeAutoFocus = (e: Event) => {
    e.preventDefault();
    if (pendingRename) {
      setPendingRename(false);
      onRename();
    }
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
        <DropdownMenuContent align="end" onCloseAutoFocus={closeAutoFocus}>
          <SectionMenuItems
            sectionId={id}
            canModify={canModify}
            onAddDoc={select(onAddDoc)}
            onRename={select(() => { setPendingRename(true); })}
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
