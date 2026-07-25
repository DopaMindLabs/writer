import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent } from '@/components/libs/dnd';
import { moveDoc } from '@/lib/docs';
import { reorderSection } from '@/lib/sections';
import type { Doc, Section } from '@/db/schema';
import { resolveSidebarDrop, type SidebarDrop } from './resolveSidebarDrop';
import { applyDrop, buildOrder, materialiseOrder } from './sidebarOrder';

const persistDrop = (drop: SidebarDrop): Promise<void> =>
  drop.kind === 'section'
    ? reorderSection(drop.sectionId, drop.toIndex)
    : moveDoc({
        docId: drop.docId,
        toSectionId: drop.toSectionId,
        toIndex: drop.toIndex,
      });

/**
 * The drag lifecycle the optimistic order follows. `dragging` and `settling`
 * both block reconciliation from the live query: `dragging` while the pointer
 * (or keyboard) still owns the order, `settling` after a drop until the live
 * data reflects the persisted move — releasing on the drop itself would let the
 * still-stale query overwrite the optimistic order for a frame (the exact
 * flash this hook exists to prevent).
 */
type DragPhase = 'idle' | 'dragging' | 'settling';

interface LiveInputs {
  topSections: Section[];
  docsForSection: Map<string, Doc[]>;
}

/**
 * Holds the sidebar's optimistic drag order. The order is synced from the live
 * query except while a drag is active or a drop is settling: a drop updates it
 * immediately (so the moved item stays put rather than snapping back) and
 * persists in the background; reconciliation resumes once the live query emits
 * fresh data (or immediately on a failed persist, rolling the order back). A
 * cancelled drag resumes reconciliation straight away.
 */
export const useSidebarDrag = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
) => {
  const [order, setOrder] = useState(() => buildOrder(topSections, docsForSection));
  const [phase, setPhase] = useState<DragPhase>('idle');
  // The live inputs as of the drop, to detect (by identity — the live query
  // emits fresh instances) when persisted data has come through.
  const settleBase = useRef<LiveInputs | null>(null);

  useEffect(() => {
    if (phase === 'dragging') return;
    if (phase === 'settling') {
      const base = settleBase.current;
      if (base !== null) {
        const settled =
          base.topSections !== topSections ||
          base.docsForSection !== docsForSection;
        if (!settled) return;
      }
      settleBase.current = null;
      setPhase('idle');
    }
    setOrder(buildOrder(topSections, docsForSection));
  }, [topSections, docsForSection, phase]);

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    const drop = over
      ? resolveSidebarDrop({
          topSections,
          docsForSection,
          activeId: String(active.id),
          overId: String(over.id),
        })
      : null;
    if (!drop) {
      setPhase('idle');
      return;
    }
    settleBase.current = { topSections, docsForSection };
    setPhase('settling');
    setOrder((prev) => applyDrop(prev, drop));
    persistDrop(drop).catch((err: unknown) => {
      console.error('Failed to persist sidebar drop', err);
      // Roll back: drop the settle hold so the live (unchanged) data rebuilds.
      settleBase.current = null;
      setPhase('idle');
    });
  };

  const orderedSections = useMemo(
    () => materialiseOrder(order, topSections, docsForSection),
    [order, topSections, docsForSection],
  );

  return {
    orderedSections,
    sectionIds: order.sectionIds,
    onDragStart: () => { setPhase('dragging'); },
    onDragEnd,
    onDragCancel: () => { setPhase('idle'); },
  };
};
