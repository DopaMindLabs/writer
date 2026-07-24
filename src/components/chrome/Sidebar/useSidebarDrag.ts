import { useEffect, useMemo, useState } from 'react';
import type { DragEndEvent } from '@/components/libs/dnd';
import { moveDoc } from '@/lib/docs';
import { reorderSection } from '@/lib/sections';
import type { Doc, Section } from '@/db/schema';
import { resolveSidebarDrop, type SidebarDrop } from './resolveSidebarDrop';
import { applyDrop, buildOrder } from './sidebarOrder';

const persistDrop = (drop: SidebarDrop): void => {
  if (drop.kind === 'section') {
    void reorderSection(drop.sectionId, drop.toIndex).catch((err: unknown) => {
      console.error('Failed to reorder section', err);
    });
    return;
  }
  void moveDoc({
    docId: drop.docId,
    toSectionId: drop.toSectionId,
    toIndex: drop.toIndex,
  }).catch((err: unknown) => {
    console.error('Failed to move document', err);
  });
};

/**
 * Holds the sidebar's optimistic drag order. The order is synced from the live
 * query except while a drag is settling: a drop updates it immediately (so the
 * moved item stays put rather than snapping back) and persists in the
 * background, and the live query then reconciles it.
 */
export const useSidebarDrag = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
) => {
  const [order, setOrder] = useState(() => buildOrder(topSections, docsForSection));
  const [dragging, setDragging] = useState(false);
  const sectionById = useMemo(
    () => new Map(topSections.map((s) => [s.id, s])),
    [topSections],
  );
  const docById = useMemo(() => {
    const map = new Map<string, Doc>();
    for (const docs of docsForSection.values()) {
      for (const doc of docs) map.set(doc.id, doc);
    }
    return map;
  }, [docsForSection]);

  useEffect(() => {
    if (!dragging) setOrder(buildOrder(topSections, docsForSection));
  }, [topSections, docsForSection, dragging]);

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    setDragging(false);
    if (!over) return;
    const drop = resolveSidebarDrop({
      topSections,
      docsForSection,
      activeId: String(active.id),
      overId: String(over.id),
    });
    if (!drop) return;
    setOrder((prev) => applyDrop(prev, drop));
    persistDrop(drop);
  };

  const orderedSections = order.sectionIds
    .map((id) => sectionById.get(id))
    .filter((s): s is Section => s !== undefined)
    .map((section) => ({
      section,
      docs: (order.docIds[section.id] ?? [])
        .map((id) => docById.get(id))
        .filter((d): d is Doc => d !== undefined),
    }));

  return {
    orderedSections,
    sectionIds: order.sectionIds,
    onDragStart: () => { setDragging(true); },
    onDragEnd,
  };
};
