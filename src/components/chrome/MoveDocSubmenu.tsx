import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { moveDoc } from '@/lib/docs';
import { isWorkshopSection } from '@/lib/sections';
import { useSections } from '@/hooks/useDocuments';
import type { Doc, Section } from '@/db/schema';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

/** Append past the end; {@link moveDoc} clamps the index to the section's length. */
const APPEND = Number.MAX_SAFE_INTEGER;

/**
 * The row's "Move to" submenu: relocates a document to another top-level
 * section within the **same space**. Targets are the space's top-level
 * sections minus the doc's own section and the special Workshop, ordered as
 * the sidebar shows them; the trigger is disabled when there is nowhere to
 * move. Selecting a target appends the doc to that section — a pure
 * `sectionId`/`order` change, so `updatedAt` is untouched.
 */
export const MoveDocSubmenu = ({ doc }: { doc: Doc }) => {
  const { t } = useTranslation('chrome');
  const sections = useSections(doc.spaceId);

  const targets = useMemo<Section[]>(
    () =>
      (sections ?? []).filter(
        (s) =>
          s.parentSectionId === null &&
          s.id !== doc.sectionId &&
          !isWorkshopSection(s),
      ),
    [sections, doc.sectionId],
  );

  const move = (toSectionId: string) => (): void => {
    void moveDoc({ docId: doc.id, toSectionId, toIndex: APPEND }).catch(
      (err: unknown) => {
        console.error('Failed to move document', err);
      },
    );
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        data-testid={`sidebar-doc-${doc.id}-move`}
        disabled={targets.length === 0}
      >
        {t('sidebar.moveDoc')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {targets.map((section) => (
          <DropdownMenuItem
            key={section.id}
            data-testid={`sidebar-doc-${doc.id}-move-${section.id}`}
            onSelect={move(section.id)}
          >
            {section.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
