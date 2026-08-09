import { useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useDocuments } from '@/hooks/useDocuments';
import { useWriterNotebookSummaries } from '@/hooks/useWriterNotebooks';
import { getTemplate } from '@/data/templates';
import { ROUTE_PATHS, RouteName, routes } from '@/lib/routes';
import type { Section, Space } from '@/db/schema';
import { SortableSectionList } from './SortableSectionList';
import { AddSectionRow } from './AddSectionRow';
import { WorkshopFallback } from './WorkshopFallback';
import { useAddDoc } from './useAddDoc';
import { useAddNotebook } from './useAddNotebook';
import { useAddSection } from './useAddSection';
import { useSidebarSections } from './useSidebarSections';

interface SidebarNavProps {
  spaceId: string;
  activeDocId: string | null;
  sections: Section[];
  notesCount: number;
  onBrainSpace: boolean;
  modeSuffix: string;
  space: Space | undefined;
}

export const SidebarNav = ({
  spaceId,
  activeDocId,
  sections,
  notesCount,
  onBrainSpace,
  modeSuffix,
  space,
}: SidebarNavProps) => {
  const { t } = useTranslation('chrome');
  const docs = useDocuments(spaceId) ?? [];
  const notebooks = useWriterNotebookSummaries(spaceId) ?? [];
  const { topSections, docsForSection } = useSidebarSections(sections, docs);
  const { add, startAdd } = useAddDoc(spaceId, space);
  const { addNotebook, error: notebookError } = useAddNotebook(spaceId);
  const notebookMatch = useMatch(ROUTE_PATHS[RouteName.WriterNotebook]);
  const addSection = useAddSection(spaceId, sections);
  const templateDef = space ? getTemplate(space.template) : undefined;
  // An unresolved template (space not loaded, or an unknown id) stays
  // non-configurable so the management affordances hold until it resolves.
  const allowConfiguration = !!templateDef?.allowConfiguration;

  const docHref = (docId: string): string =>
    `${routes.docWrite(spaceId, docId)}${modeSuffix}`;

  return (
    <nav
      aria-label={t('sidebar.navLabel')}
      className="flex-1 overflow-auto py-2"
      data-tour="tour-sidebar-sections"
    >
      {notebookError && (
        <InlineBanner kind="error" title={t('sidebar.notebookCreateError')}>
          {notebookError}
        </InlineBanner>
      )}
      <SortableSectionList
        topSections={topSections}
        docsForSection={docsForSection}
        spaceId={spaceId}
        activeDocId={activeDocId}
        onBrainSpace={onBrainSpace}
        notesCount={notesCount}
        notebooks={notebooks}
        activeNotebookId={notebookMatch?.params.notebookId ?? null}
        canManage={allowConfiguration}
        docHref={docHref}
        startAdd={startAdd}
        onAddNotebook={addNotebook}
        add={add}
      />
      {allowConfiguration && <AddSectionRow add={addSection} />}
      {!topSections.some((s) => s.label === 'Workshop') && (
        <WorkshopFallback
          spaceId={spaceId}
          onBrainSpace={onBrainSpace}
          notesCount={notesCount}
        />
      )}
    </nav>
  );
};
