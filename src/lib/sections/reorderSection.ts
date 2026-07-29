import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import {
  currentPrincipal,
  touchedMetadataFields,
} from '@/lib/writerSyncIntegration/writerEntityMetadata';

/**
 * Move a top-level section to a new position among its siblings and renumber the
 * whole top-level list densely (0..n-1). Subsections are untouched; an unknown
 * section id is a no-op. `toIndex` is clamped to the sibling count.
 *
 * Every renumbered row is a material change, so each takes its own operation id
 * and logical time — a reorder that reused them would be journalled as an
 * operation other devices have already accepted, and discarded as a replay. The
 * principal resolves before the transaction opens: awaiting anything but a
 * Dexie promise inside one leaves its zone.
 */
export const reorderSection = async (
  sectionId: string,
  toIndex: number,
): Promise<void> => {
  invariant(sectionId, 'reorderSection: sectionId is required');
  const principal = await currentPrincipal();
  await db.transaction('rw', db.sections, async () => {
    const section = await db.sections.get(sectionId);
    if (section?.parentSectionId !== null) return;
    const tops = (await db.sections.where('spaceId').equals(section.spaceId).toArray())
      .filter((s) => s.parentSectionId === null && s.id !== sectionId)
      .sort((a, b) => a.order - b.order);
    const index = Math.max(0, Math.min(toIndex, tops.length));
    tops.splice(index, 0, section);
    for (let i = 0; i < tops.length; i += 1) {
      await db.sections.update(tops[i].id, {
        order: i,
        ...touchedMetadataFields(principal),
      });
    }
  });
};
