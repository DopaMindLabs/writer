import { arrayMove } from '@/components/libs/dnd';
import type { Doc, Section } from '@/db/schema';
import type { SidebarDrop } from './resolveSidebarDrop';

/**
 * The sidebar's optimistic order: which sections are shown, in order, and the
 * ordered document ids within each. Held locally so a drop reflects instantly
 * (no snap-back flash) while the move persists; the live query then reconciles.
 */
export interface SidebarOrder {
  sectionIds: string[];
  docIds: Record<string, string[]>;
}

export const buildOrder = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
): SidebarOrder => ({
  sectionIds: topSections.map((s) => s.id),
  docIds: Object.fromEntries(
    topSections.map((s) => [
      s.id,
      (docsForSection.get(s.id) ?? []).map((d) => d.id),
    ]),
  ),
});

const findDocSection = (order: SidebarOrder, docId: string): string | null => {
  for (const sectionId of order.sectionIds) {
    if ((order.docIds[sectionId] ?? []).includes(docId)) return sectionId;
  }
  return null;
};

/** Apply a resolved drop to the local order, mirroring what will be persisted. */
export const applyDrop = (
  order: SidebarOrder,
  drop: SidebarDrop,
): SidebarOrder => {
  if (drop.kind === 'section') {
    const from = order.sectionIds.indexOf(drop.sectionId);
    if (from < 0) return order;
    return { ...order, sectionIds: arrayMove(order.sectionIds, from, drop.toIndex) };
  }
  const fromSection = findDocSection(order, drop.docId);
  if (!fromSection) return order;
  const docIds = { ...order.docIds };
  if (fromSection === drop.toSectionId) {
    const from = docIds[fromSection].indexOf(drop.docId);
    docIds[fromSection] = arrayMove(docIds[fromSection], from, drop.toIndex);
    return { ...order, docIds };
  }
  docIds[fromSection] = docIds[fromSection].filter((id) => id !== drop.docId);
  const target = [...(docIds[drop.toSectionId] ?? [])];
  target.splice(drop.toIndex, 0, drop.docId);
  docIds[drop.toSectionId] = target;
  return { ...order, docIds };
};
