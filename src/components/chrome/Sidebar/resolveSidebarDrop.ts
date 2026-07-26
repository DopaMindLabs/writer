import type { Doc, Section } from '@/db/schema';

/**
 * The persistence a sidebar drag resolves to: reorder a top-level section, or
 * move a document within or across sections. `toIndex` follows the `arrayMove`
 * convention (the position of the item dropped onto).
 */
export type SidebarDrop =
  | { kind: 'section'; sectionId: string; toIndex: number }
  | { kind: 'doc'; docId: string; toSectionId: string; toIndex: number };

interface ResolveArgs {
  topSections: Section[];
  docsForSection: Map<string, Doc[]>;
  activeId: string;
  overId: string;
}

const locateDoc = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
  docId: string,
): { sectionId: string; index: number } | null => {
  for (const sec of topSections) {
    const index = (docsForSection.get(sec.id) ?? []).findIndex(
      (d) => d.id === docId,
    );
    if (index >= 0) return { sectionId: sec.id, index };
  }
  return null;
};

/**
 * Map a dnd `active`/`over` pair to what should be persisted. Section ids and
 * document ids share one drag space; they never collide, so the active id's
 * kind is inferred from the section set. Returns null for a no-op drop.
 */
export const resolveSidebarDrop = ({
  topSections,
  docsForSection,
  activeId,
  overId,
}: ResolveArgs): SidebarDrop | null => {
  if (activeId === overId) return null;
  const sectionIds = new Set(topSections.map((s) => s.id));

  if (sectionIds.has(activeId)) {
    const overSectionId = sectionIds.has(overId)
      ? overId
      : locateDoc(topSections, docsForSection, overId)?.sectionId;
    if (!overSectionId || overSectionId === activeId) return null;
    const toIndex = topSections.findIndex((s) => s.id === overSectionId);
    return { kind: 'section', sectionId: activeId, toIndex };
  }

  // Dropped onto a section (its container, e.g. an empty one): append to its end.
  if (sectionIds.has(overId)) {
    const toIndex = (docsForSection.get(overId) ?? []).length;
    return { kind: 'doc', docId: activeId, toSectionId: overId, toIndex };
  }

  // Dropped onto another document: take that document's slot (within or across).
  const target = locateDoc(topSections, docsForSection, overId);
  if (!target) return null;
  return {
    kind: 'doc',
    docId: activeId,
    toSectionId: target.sectionId,
    toIndex: target.index,
  };
};
