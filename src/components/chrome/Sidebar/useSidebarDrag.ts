import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent } from '@/components/libs/dnd';
import { moveDoc } from '@/lib/docs';
import { reorderSection } from '@/lib/sections';
import type { Doc, Section } from '@/db/schema';
import { resolveSidebarDrop, type SidebarDrop } from './resolveSidebarDrop';
import {
  applyDrop,
  buildOrder,
  materialiseOrder,
  ordersEqual,
  type SidebarOrder,
} from './sidebarOrder';

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

interface SettlingDrop {
  /** The order the drop produced — what the live data should come to reflect. */
  expected: SidebarOrder;
  /** Set once the write has committed; later emissions are then authoritative. */
  persisted: boolean;
}

/**
 * Holds the sidebar's optimistic drag order. The order is synced from the live
 * query except while a drag is active or a drop is settling: a drop updates it
 * immediately (so the moved item stays put rather than snapping back) and
 * persists in the background; reconciliation resumes once the live data
 * matches the dropped order, or once the write has committed (whichever comes
 * first), and a failed persist rolls the order back immediately. A cancelled
 * drag resumes reconciliation straight away.
 */
export const useSidebarDrag = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
) => {
  const [order, setOrder] = useState(() => buildOrder(topSections, docsForSection));
  const [phase, setPhase] = useState<DragPhase>('idle');
  const settling = useRef<SettlingDrop | null>(null);

  useEffect(() => {
    if (phase === 'dragging') return;
    const incoming = buildOrder(topSections, docsForSection);
    if (phase === 'settling') {
      const drop = settling.current;
      // Hold the optimistic order until the live data actually reflects the
      // drop. A mere new emission is not enough — an unrelated update (a
      // rename in another tab, a word-count tick) can arrive while the write
      // is still in flight, and rebuilding from it would recreate the
      // snap-back. Once the write has committed, any later emission is
      // authoritative (it includes our write, or a genuinely newer state).
      const held =
        drop !== null && !drop.persisted && !ordersEqual(incoming, drop.expected);
      if (held) return;
      settling.current = null;
      setPhase('idle');
    }
    setOrder(incoming);
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
    const expected = applyDrop(order, drop);
    settling.current = { expected, persisted: false };
    setPhase('settling');
    setOrder(expected);
    void persistDrop(drop)
      .then(() => {
        // The commit's own live-query emission re-runs the effect and releases
        // the hold; this flag covers a concurrent writer whose emission never
        // matches `expected`.
        const active_ = settling.current;
        if (active_) active_.persisted = true;
      })
      .catch((err: unknown) => {
        console.error('Failed to persist sidebar drop', err);
        // Roll back: drop the settle hold so the live (unchanged) data rebuilds.
        settling.current = null;
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
