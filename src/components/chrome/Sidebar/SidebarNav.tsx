import { useTranslation } from 'react-i18next';
import { useDocuments } from '@/hooks/useDocuments';
import { getTemplate } from '@/data/templates';
import { routes } from '@/lib/routes';
import type { Section, Space } from '@/db/schema';
import { SidebarSection } from './SidebarSection';
import { AddSectionRow } from './AddSectionRow';
import { WorkshopFallback } from './WorkshopFallback';
import { useAddDoc } from './useAddDoc';
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
  const { topSections, docsForSection } = useSidebarSections(sections, docs);
  const { add, startAdd } = useAddDoc(spaceId, space);
  const addSection = useAddSection(spaceId, sections);
  const templateDef = space ? getTemplate(space.template) : undefined;
  const allowExtraSections = templateDef?.allowExtraSections === true;

  const docHref = (docId: string): string =>
    `${routes.docWrite(spaceId, docId)}${modeSuffix}`;

  return (
    <nav
      aria-label={t('sidebar.navLabel')}
      className="flex-1 overflow-auto py-2"
      data-tour="tour-sidebar-sections"
    >
      {topSections.map((sec) => (
        <SidebarSection
          key={sec.id}
          sec={sec}
          docs={docsForSection.get(sec.id) ?? []}
          spaceId={spaceId}
          activeDocId={activeDocId}
          onBrainSpace={onBrainSpace}
          notesCount={notesCount}
          docHref={docHref}
          startAdd={startAdd}
          add={add}
        />
      ))}
      {allowExtraSections && <AddSectionRow add={addSection} />}
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
